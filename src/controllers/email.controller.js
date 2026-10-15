import { sendEmailSchema } from '../schemas/email.schema.js';
import * as emailService from '../services/email.service.js';

/**
 * Controller to handle POST /api/send-email
 */
export async function sendEmail(req, res, next) {
  try {
    const parseResult = sendEmailSchema.safeParse(req.body);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'payload',
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details,
      });
    }

    const { to, subject, text, template } = parseResult.data;

    // Dispatch email to service layer
    const result = await emailService.sendEmail({
      to,
      subject,
      text,
      template,
    });

    // HTTP 202 Accepted accurately communicates delivery handoff to SMTP provider
    return res.status(202).json({
      success: true,
      message: 'Email accepted for delivery',
      messageId: result.messageId,
    });
  } catch (error) {
    if (error.message === 'SMTP delivery failure' || error.message === 'Failed to render email template') {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email due to an upstream or internal delivery failure',
      });
    }

    return next(error);
  }
}

