'use strict';

const { HttpError } = require('../utils/httpError');

function authorize(permission) {
  return function authorizationMiddleware(req, res, next) {
    if (!req.user) return next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Autenticação necessária.'));
    if (!req.authPermissions.includes(permission)) return next(new HttpError(403, 'PERMISSION_DENIED', 'Você não possui permissão para esta operação.'));
    return next();
  };
}

module.exports = { authorize };
