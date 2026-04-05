import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { migrateDb, closeDb } from './db/database.js';
import { startGameLoop, stopGameLoop } from './engine/gameLoop.js';
import authRoutes from './routes/auth.js';
import planetRoutes from './routes/planets.js';
import gameRoutes from './routes/game.js';
import allianceRoutes from './routes/alliance.js';
import socialRoutes from './routes/social.js';
import rankingRoutes from './routes/rankings.js';

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
app.use('/api/alliance', allianceRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/rankings', rankingRoutes);

// Start game loop
startGameLoop();

// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`OGame2D API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  stopGameLoop();
  server.close();
  closeDb();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  stopGameLoop();
  server.close();
  closeDb();
  process.exit(0);
});
