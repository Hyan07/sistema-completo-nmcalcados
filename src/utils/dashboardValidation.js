'use strict';

const { HttpError } = require('./httpError');

const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

function formatDateInTimeZone(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function parseDate(value, label) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new HttpError(400, 'INVALID_DASHBOARD_DATE', `${label} inválida.`);
  }
  const date = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new HttpError(400, 'INVALID_DASHBOARD_DATE', `${label} inválida.`);
  }
  return normalized;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(dateFrom, dateTo) {
  const from = new Date(`${dateFrom}T12:00:00Z`);
  const to = new Date(`${dateTo}T12:00:00Z`);
  return Math.floor((to - from) / 86400000) + 1;
}

function normalizeDashboardPeriod(input = {}, { today = formatDateInTimeZone() } = {}) {
  const dateTo = input.dateTo ? parseDate(input.dateTo, 'Data final') : parseDate(today, 'Data final');
  const dateFrom = input.dateFrom ? parseDate(input.dateFrom, 'Data inicial') : addDays(dateTo, -29);
  if (dateFrom > dateTo) throw new HttpError(400, 'INVALID_DASHBOARD_RANGE', 'A data inicial não pode ser posterior à data final.');
  const days = inclusiveDays(dateFrom, dateTo);
  if (days > 366) throw new HttpError(400, 'DASHBOARD_RANGE_TOO_LARGE', 'O dashboard aceita no máximo 366 dias por consulta.');
  const previousDateTo = addDays(dateFrom, -1);
  const previousDateFrom = addDays(previousDateTo, -(days - 1));
  return { dateFrom, dateTo, days, previousDateFrom, previousDateTo };
}

function percentageChange(current, previous) {
  const currentNumber = Number(current || 0);
  const previousNumber = Number(previous || 0);
  if (!Number.isFinite(currentNumber) || !Number.isFinite(previousNumber)) return null;
  if (previousNumber === 0) return currentNumber === 0 ? 0 : null;
  return Math.round(((currentNumber - previousNumber) / Math.abs(previousNumber)) * 10000) / 100;
}

module.exports = {
  BUSINESS_TIME_ZONE,
  addDays,
  formatDateInTimeZone,
  inclusiveDays,
  normalizeDashboardPeriod,
  parseDate,
  percentageChange
};
