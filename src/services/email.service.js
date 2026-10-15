import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import { env } from '../config/env.js';
import { getTransporter } from '../config/mailer.js';
import { ALLOWED_TEMPLATES } from '../schemas/email.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');

/**
 * Safely renders an approved EJS template with provided data.
 * Protects against path traversal and template injection.
 */
export async function renderTemplate(templateName, templateData) {
  if (!ALLOWED_TEMPLATES.includes(templateName)) {
    throw new Error(`Unauthorized template name: ${templateName}`);
  }

  // Resolve template file path and prevent directory traversal
  const templatePath = path.resolve(TEMPLATES_DIR, `${templateName}.ejs`);
  if (!templatePath.startsWith(TEMPLATES_DIR)) {
    throw new Error('Directory traversal attempt detected');
  }

  try {
    const html = await ejs.renderFile(templatePath, templateData, {
      async: true,
      cache: env.NODE_ENV === 'production',
    });
    return html;
  } catch (err) {
    console.error(`[Template Render Error] Failed rendering template '${templateName}':`, err.message);
    throw new Error('Failed to render email template');
  }
}

/**
 * Sends an email using Nodemailer and the configured SMTP transport.
 * Supports plain-text, template-based HTML, or dual HTML with plain-text alternative.
 */
export async function sendEmail({ to, subject, text, template }) {
  let html = null;

  if (template) {
    html = await renderTemplate(template.name, template.data || {});
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: env.MAIL_FROM,
    to,
    subject,
  };

  if (html) {
    mailOptions.html = html;
  }

  if (text) {
    mailOptions.text = text;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      messageId: info.messageId,
    };
  } catch (error) {
    // Log sanitized error details server-side without leaking passwords or sensitive info
    console.error('[SMTP Send Error]', {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message,
    });

    throw new Error('SMTP delivery failure');
  }
}

