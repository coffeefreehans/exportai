import { CorsOptions } from 'cors';
import { env } from './env';

/**
 * CORS configuration allowing both web frontend and Chrome extension origins.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Always allow Chrome extension origins (any extension ID)
    if (origin.startsWith('chrome-extension://')) {
      callback(null, true);
      return;
    }

    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // Log but don't block in development for easier debugging
      if (env.NODE_ENV === 'development') {
        console.warn(`[CORS] Origin not in allowlist: ${origin}`);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
