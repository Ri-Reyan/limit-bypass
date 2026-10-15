import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`[Email Service] Running locally on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[Email Service] Health check: http://localhost:${env.PORT}/api/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Email Service] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Email Service] HTTP server closed');
  });
});

