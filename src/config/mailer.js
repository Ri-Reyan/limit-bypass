import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporterInstance = null;

/**
 * Creates a configured Nodemailer transporter using server environment settings.
 * Includes explicit timeouts to avoid hung connections in serverless environments.
 */
export function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for port 465, false for 587/25
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // Serverless-friendly timeout configurations (milliseconds)
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 15000,     // 15 seconds
  });
}

/**
 * Returns the singleton Nodemailer transporter.
 */
export function getTransporter() {
  if (!transporterInstance) {
    transporterInstance = createTransporter();
  }
  return transporterInstance;
}

/**
 * Allows overriding the transporter instance (useful for automated testing/mocking).
 */
export function setTransporter(mockTransporter) {
  transporterInstance = mockTransporter;
}

