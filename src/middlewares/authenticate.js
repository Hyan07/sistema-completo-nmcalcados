'use strict';

const { loadAuthenticatedUser } = require('../services/authService');
const { getPermissionsByUserId } = require('../repositories/authRepository');
const { HttpError } = require('../utils/httpError');

async function authenticate(req, res, next) {
  try {
    const auth = req.session?.auth;
    if (!auth?.userId || !auth?.authVersion) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Autenticação necessária.');
    const user = await loadAuthenticatedUser(auth.userId, auth.authVersion);
    if (!user) {
      if (req.session) req.session.destroy(() => {});
      throw new HttpError(401, 'SESSION_INVALID', 'Sessão expirada ou inválida.');
    }
    req.user = user;
    req.authPermissions = await getPermissionsByUserId(user.id);
    next();
  } catch (error) { next(error); }
}

module.exports = { authenticate };
