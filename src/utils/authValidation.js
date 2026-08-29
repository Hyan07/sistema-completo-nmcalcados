'use strict';

const USERNAME_PATTERN = /^[a-z0-9._-]{3,80}$/;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function validateUsername(username) {
  return USERNAME_PATTERN.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function validateName(name) {
  const value = String(name || '').trim();
  return value.length >= 2 && value.length <= 150;
}

function validateEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 190;
}

module.exports = {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validateName,
  validatePassword,
  validateUsername
};
