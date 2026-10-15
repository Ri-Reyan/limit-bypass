import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import emailRoutes from './routes/email.routes.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

// Parse allowed origins from configuration
const allowedOrigins =
  env.ALLOWED_ORIGINS === '*'
    ? '*'
    : env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

// CORS configuration (defends browser-based callers; server-to-server calls omit Origin)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Enforce request body size limit to prevent memory exhaustion / DoS
app.use(express.json({ limit: '100kb' }));

// Rate limiter compatible with serverless instances
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Max 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

app.use(limiter);

// Liveness / health probe
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Email delivery routes
app.use('/api', emailRoutes);

// Catch-all route for unknown resources
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;

