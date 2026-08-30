'use strict';

const path = require('path');
const express = require('express');
const { env } = require('./config/env');
const { createSessionMiddleware } = require('./config/session');
const { apiRateLimit } = require('./middlewares/apiRateLimit');
const { createAdminPageShellMiddleware } = require('./middlewares/adminPageShell');
const { apiContentTypeGuard } = require('./middlewares/contentTypeGuard');
const { requestContext } = require('./middlewares/requestContext');
const { requireTrustedOrigin } = require('./middlewares/requestOriginGuard');
const { apiCachePolicy, securityHeaders } = require('./middlewares/securityHeaders');
const routes = require('./routes');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

function createApp() {
  const app = express();
  const publicDir = path.resolve(__dirname, '..', 'public');
  const productMediaDir = path.resolve(__dirname, '..', 'uploads', 'products');

  app.disable('x-powered-by');
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(securityHeaders);
  app.use('/api', apiRateLimit, apiCachePolicy);
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));
  app.use(createSessionMiddleware());
  app.use('/api', requireTrustedOrigin, apiContentTypeGuard);

  app.use('/media/products', express.static(productMediaDir, { dotfiles: 'deny', index: false, maxAge: env.isProduction ? '7d' : 0 }));
  app.use('/pages', createAdminPageShellMiddleware(publicDir));

  // Experiência pública principal: o domínio abre diretamente no catálogo.
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'catalog', 'index.html'));
  });

  // Mantém links antigos funcionando, mas consolida a loja na URL principal.
  app.get('/catalog', (req, res) => {
    res.redirect(302, '/');
  });

  // Entrada administrativa explícita, separada da experiência de compra.
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(express.static(publicDir, { dotfiles: 'deny', index: 'index.html' }));
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
