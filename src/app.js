'use strict';

const path = require('path');
const express = require('express');
const { env } = require('./config/env');
const { createSessionMiddleware } = require('./config/session');
const routes = require('./routes');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

function createApp() {
  const app = express();
  const publicDir = path.resolve(__dirname, '..', 'public');
  const productMediaDir = path.resolve(__dirname, '..', 'uploads', 'products');

  app.disable('x-powered-by');
  if (env.isProduction) app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(createSessionMiddleware());
  app.use('/media/products', express.static(productMediaDir, { dotfiles: 'deny', index: false, maxAge: env.isProduction ? '7d' : 0 }));
  app.use(express.static(publicDir));

  app.use('/api', routes);

  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
