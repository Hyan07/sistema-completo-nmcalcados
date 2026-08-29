'use strict';

const userService = require('../services/userService');

async function list(req, res, next) { try { res.json({ data: await userService.listUsers() }); } catch (error) { next(error); } }
async function create(req, res, next) { try { const id = await userService.createUser(req.body, req.user); res.status(201).json({ id: String(id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { await userService.updateUser(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function resetPassword(req, res, next) { try { await userService.resetPassword(req.params.id, req.body, req.user); res.status(204).end(); } catch (error) { next(error); } }
async function roles(req, res, next) { try { res.json({ data: await userService.listRoles() }); } catch (error) { next(error); } }
async function permissions(req, res, next) { try { res.json({ data: await userService.listPermissions() }); } catch (error) { next(error); } }

module.exports = { create, list, permissions, resetPassword, roles, update };
