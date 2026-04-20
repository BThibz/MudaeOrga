require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const { getDb } = require('./db/database');
const { migrate } = require('./db/migrate');
const requireAuth = require('./middleware/requireAuth');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes publiques
app.use('/auth', authRouter);

// Routes protégées (à brancher dans les autres branches)
app.use('/api', requireAuth, (req, res, next) => next());

// Route de santé
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Démarrage
if (require.main === module) {
  const db = getDb();
  migrate(db);
  app.listen(PORT, () => {
    console.log(`Backend démarré sur le port ${PORT}`);
  });
}

module.exports = app;
