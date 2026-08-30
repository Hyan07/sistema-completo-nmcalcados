'use strict';

const multer = require('multer');
const { HttpError } = require('../utils/httpError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter(req, file, cb) {
    const name = String(file.originalname || '').toLowerCase();
    if (!name.endsWith('.csv')) return cb(new HttpError(400, 'IMPORT_FILE_EXTENSION', 'A importação aceita somente arquivos .csv.'));
    return cb(null, true);
  }
});

function importCsvUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'IMPORT_FILE_TOO_LARGE', 'O CSV pode possuir no máximo 5 MB.'));
      return next(new HttpError(400, 'IMPORT_UPLOAD_INVALID', 'Não foi possível receber o arquivo de importação.'));
    }
    return next(error);
  });
}

module.exports = { importCsvUpload };
