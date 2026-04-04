import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { migrateDb, closeDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import planetRoutes from './routes/planets.js';
import gameRoutes from './routes/game.js';

const PORT = parseInt(process.env.PORT || '3001');
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Migrate DB on startup
migrateDb();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/planets', planetRoutes);
app.use('/api/game', gameRoutes);

// Start
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`OGame2D API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  closeDb();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close();
  closeDb();
  process.exit(0);
});
