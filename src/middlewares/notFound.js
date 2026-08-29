'use strict';

function notFound(req, res) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Recurso não encontrado.'
    });
  }

  return res.status(404).send('Página não encontrada.');
}

module.exports = { notFound };
