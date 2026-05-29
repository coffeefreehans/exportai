import dotenv from 'dotenv';
dotenv.config();

// Patch Express to automatically catch async route errors and forward to errorHandler
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { corsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './utils/errors';
import authRoutes from './routes/auth';
import membershipRouter from './routes/membership';
import stripeRouter from './routes/stripe';
import settingsRouter from './routes/settings';

const app = express();

// ── Security Middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ── Stripe Webhook: raw body before express.json() ─────────────
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));

// ── Rate Limiting ────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    data: null,
    message: '请求过于频繁',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    data: null,
    message: '请求过于频繁',
  },
});

app.use(globalLimiter);

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, data: { status: 'ok', timestamp: new Date().toISOString() }, message: 'ok' });
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/membership', membershipRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/settings', settingsRouter);

// ── Error Handlers ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`[ExportAI] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

export default app;
