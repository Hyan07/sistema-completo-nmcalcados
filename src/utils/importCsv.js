'use strict';

const { HttpError } = require('./httpError');

const MAX_IMPORT_ROWS = 5000;
const MAX_FIELD_LENGTH = 10000;

function decodeUtf8(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'IMPORT_FILE_REQUIRED', 'Arquivo CSV vazio ou ausente.');
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  if (text.includes('\uFFFD')) throw new HttpError(400, 'IMPORT_ENCODING_INVALID', 'Use CSV codificado em UTF-8.');
  if (text.includes('\u0000')) throw new HttpError(400, 'IMPORT_BINARY_FILE', 'O arquivo enviado não parece ser CSV em texto.');
  return text;
}

function parseWithDelimiter(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field.length === 0) { quoted = true; continue; }
    if (ch === delimiter) {
      if (field.length > MAX_FIELD_LENGTH) throw new HttpError(400, 'IMPORT_FIELD_TOO_LONG', 'Uma célula excede o limite permitido.');
      row.push(field.trim()); field = ''; continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (field.length > MAX_FIELD_LENGTH) throw new HttpError(400, 'IMPORT_FIELD_TOO_LONG', 'Uma célula excede o limite permitido.');
      row.push(field.trim()); field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      if (rows.length > MAX_IMPORT_ROWS + 1) throw new HttpError(400, 'IMPORT_TOO_MANY_ROWS', `O CSV aceita no máximo ${MAX_IMPORT_ROWS} linhas de dados.`);
      continue;
    }
    field += ch;
  }
  if (quoted) throw new HttpError(400, 'IMPORT_CSV_UNCLOSED_QUOTE', 'O CSV possui aspas não fechadas.');
  if (field.length || row.length) {
    if (field.length > MAX_FIELD_LENGTH) throw new HttpError(400, 'IMPORT_FIELD_TOO_LONG', 'Uma célula excede o limite permitido.');
    row.push(field.trim());
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
}

function detectDelimiter(text) {
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestColumns = 0;
  for (const candidate of candidates) {
    try {
      const rows = parseWithDelimiter(text, candidate);
      const columns = rows[0]?.length || 0;
      if (columns > bestColumns) { bestColumns = columns; best = candidate; }
    } catch (_) {}
  }
  return best;
}

function canonicalHeader(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(buffer) {
  const text = decodeUtf8(buffer);
  const delimiter = detectDelimiter(text);
  const matrix = parseWithDelimiter(text, delimiter);
  if (matrix.length < 2) throw new HttpError(400, 'IMPORT_CSV_EMPTY', 'O CSV precisa possuir cabeçalho e ao menos uma linha de dados.');
  const headers = matrix[0].map(canonicalHeader);
  if (headers.some((h) => !h)) throw new HttpError(400, 'IMPORT_HEADER_INVALID', 'O CSV possui coluna sem nome.');
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length) throw new HttpError(400, 'IMPORT_HEADER_DUPLICATE', `Coluna repetida: ${duplicates[0]}.`);
  const rows = matrix.slice(1).map((values, index) => {
    const data = {};
    headers.forEach((header, position) => { data[header] = values[position] ?? ''; });
    return { rowNumber: index + 2, data };
  });
  return { delimiter, headers, rows };
}

module.exports = { MAX_IMPORT_ROWS, canonicalHeader, decodeUtf8, detectDelimiter, parseCsv, parseWithDelimiter };
