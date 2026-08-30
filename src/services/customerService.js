'use strict';

const { getPool } = require('../config/database');
const customerRepository = require('../repositories/customerRepository');
const { createAuditLog } = require('../repositories/auditRepository');
const { HttpError } = require('../utils/httpError');
const { maskDocument, normalizeCustomerInput, parseBoolean, parsePagination } = require('../utils/customerValidation');

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_CUSTOMER_ID', 'Cliente inválido.');
  return id;
}
function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  return parseBoolean(value, 'Status');
}
function sanitizeSearch(value) { return String(value ?? '').trim().slice(0, 190); }
function digits(value) { return String(value ?? '').replace(/\D/g, ''); }
function listView(row) { return { ...row, document_masked: maskDocument(row.document), document: undefined }; }
function auditFields(data) {
  return {
    fields: Object.keys(data).sort(),
    ...(Object.prototype.hasOwnProperty.call(data, 'isActive') ? { isActive: data.isActive } : {})
  };
}

async function listCustomers(query = {}) {
  const pagination = parsePagination(query);
  const q = sanitizeSearch(query.q);
  const result = await customerRepository.listCustomers({ q, numericQ: digits(q), isActive: parseOptionalBoolean(query.isActive) }, pagination);
  return {
    data: result.rows.map(listView),
    pagination: { page: pagination.page, pageSize: pagination.pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pagination.pageSize)) }
  };
}

async function lookupCustomers(query = {}) {
  const q = sanitizeSearch(query.q);
  if (q.length < 2) throw new HttpError(400, 'SEARCH_TOO_SHORT', 'Informe pelo menos 2 caracteres para buscar cliente.');
  const rows = await customerRepository.lookupCustomers(q, digits(q));
  return rows.map(listView);
}

async function getCustomer(customerId) {
  const id = parseId(customerId);
  const customer = await customerRepository.findCustomerById(id);
  if (!customer) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
  const [recentSales, openReceivables] = await Promise.all([
    customerRepository.listRecentSales(id),
    customerRepository.listOpenReceivables(id)
  ]);
  return { customer, recentSales, openReceivables };
}

async function createCustomer(input, actor) {
  const data = normalizeCustomerInput(input);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const id = await customerRepository.createCustomer(data, actor.id, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'CUSTOMER_CREATED', entityType: 'CUSTOMER', entityId: id,
      newData: auditFields(data)
    }, connection);
    await connection.commit();
    return id;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'CUSTOMER_DOCUMENT_EXISTS', 'Já existe cliente com este CPF/CNPJ.');
    throw error;
  } finally { connection.release(); }
}

async function updateCustomer(customerId, input, actor) {
  const id = parseId(customerId);
  const changes = normalizeCustomerInput(input, { partial: true });
  if (!Object.keys(changes).length) throw new HttpError(400, 'NO_CHANGES', 'Nenhuma alteração válida foi informada.');
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await customerRepository.findCustomerForUpdate(id, connection);
    if (!current) throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Cliente não encontrado.');
    await customerRepository.updateCustomer(id, changes, actor.id, connection);
    await createAuditLog({
      userId: actor.id, actionCode: 'CUSTOMER_UPDATED', entityType: 'CUSTOMER', entityId: id,
      previousData: { isActive: Boolean(current.is_active) }, newData: auditFields(changes)
    }, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'CUSTOMER_DOCUMENT_EXISTS', 'Já existe cliente com este CPF/CNPJ.');
    throw error;
  } finally { connection.release(); }
}

module.exports = { createCustomer, getCustomer, listCustomers, lookupCustomers, updateCustomer };
