'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { migrate } = require('./db/migrate');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

migrate();

app.use('/auth', require('./routes/auth'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/discord-sync', require('./routes/discordSync'));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
}

module.exports = app;
