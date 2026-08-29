'use strict';

const authService = require('../services/authService');

function requestMetadata(req) {
  return { ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 500) };
}
function regenerateSession(req) { return new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve())); }
function saveSession(req) { return new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve())); }

async function login(req, res, next) {
  try {
    const result = await authService.login({ username: req.body.username, password: req.body.password, metadata: requestMetadata(req) });
    await regenerateSession(req);
    req.session.auth = { userId: result.user.id, authVersion: result.authVersion };
    await saveSession(req);
    res.status(200).json({ user: result.user, permissions: result.permissions });
  } catch (error) { next(error); }
}

async function logout(req, res, next) {
  try {
    if (!req.session) return res.status(204).end();
    await authService.recordLogout({ userId: req.user.id, metadata: requestMetadata(req) });
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie('nm.sid');
    return res.status(204).end();
  } catch (error) { return next(error); }
}

function me(req, res) { res.status(200).json({ user: req.user, permissions: req.authPermissions }); }

async function changePassword(req, res, next) {
  try {
    await authService.changeOwnPassword({ userId: req.user.id, currentPassword: req.body.currentPassword, newPassword: req.body.newPassword, metadata: requestMetadata(req) });
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie('nm.sid');
    return res.status(204).end();
  } catch (error) { return next(error); }
}

module.exports = { changePassword, login, logout, me };
