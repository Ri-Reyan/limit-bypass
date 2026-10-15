import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { sendEmail } from '../controllers/email.controller.js';

const router = Router();

// Secure email dispatch endpoint
router.post('/send-email', authenticate, sendEmail);

export default router;

