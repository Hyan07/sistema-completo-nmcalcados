'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { HttpError } = require('../utils/httpError');

const uploadDir = path.resolve(process.cwd(), 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDir),
  filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensionByMime.get(file.mimetype) || ''}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6, fields: 10, parts: 16 },
  fileFilter: (req, file, callback) => {
    if (!extensionByMime.has(file.mimetype)) return callback(new HttpError(400, 'INVALID_IMAGE_TYPE', 'Somente imagens JPEG, PNG ou WebP são permitidas.'));
    return callback(null, true);
  }
}).array('images', 6);

function uploadProductImages(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    for (const file of req.files || []) fs.unlink(file.path, () => {});
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Cada imagem deve possuir no máximo 5 MB.' : 'Upload de imagens inválido.';
      return next(new HttpError(400, 'IMAGE_UPLOAD_ERROR', message));
    }
    return next(error);
  });
}

module.exports = { productImageUploadDir: uploadDir, uploadProductImages };
