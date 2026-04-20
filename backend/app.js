const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const charactersRouter = require('./routes/characters');
const groupsRouter = require('./routes/groups');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/characters', charactersRouter);
  app.use('/api/groups', groupsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
