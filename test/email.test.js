import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { setTransporter } from '../src/config/mailer.js';

describe('Email Microservice API Tests', () => {
  let server;
  let baseUrl;
  let sentMails = [];
  let shouldFailSmtp = false;

  const validApiKey = 'test_secret_api_key_12345';

  const mockTransporter = {
    sendMail: async (mailOptions) => {
      if (shouldFailSmtp) {
        const error = new Error('SMTP connection timed out');
        error.code = 'ETIMEDOUT';
        error.command = 'CONN';
        throw error;
      }
      const messageId = `<mock-${Date.now()}@test.mail>`;
      sentMails.push({ ...mailOptions, messageId });
      return { messageId };
    },
  };

  before(async () => {
    setTransporter(mockTransporter);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    sentMails = [];
    shouldFailSmtp = false;
  });

  test('GET /api/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'healthy');
  });

  describe('Authentication Safeguards', () => {
    test('Rejects request without Authorization header with 401', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'Test',
          text: 'Hello',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Authorization header/i);
    });

    test('Rejects request with invalid Bearer API key with 401', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong_key_here',
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'Test',
          text: 'Hello',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Invalid API key/i);
    });
  });

  describe('Request Validation', () => {
    test('Rejects malformed JSON with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: '{ "to": "invalid-json',
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Malformed JSON/i);
    });

    test('Rejects payload missing recipient with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          subject: 'Missing to',
          text: 'Hello',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.details.some((d) => d.field === 'to'));
    });

    test('Rejects invalid email format with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'not-an-email',
          subject: 'Test',
          text: 'Hello',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.details.some((d) => d.field === 'to'));
    });

    test('Rejects empty subject with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: '   ',
          text: 'Hello',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.details.some((d) => d.field === 'subject'));
    });

    test('Rejects payload with neither text nor template with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'No Body',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.details.some((d) => d.message.includes('At least one of')));
    });

    test('Rejects unauthorized/unregistered template with 400', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'Template Test',
          template: {
            name: 'unapproved_template_path',
            data: {},
          },
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.details.some((d) => d.field === 'template.name'));
    });

    test('Rejects unrecognized top-level fields with 400 (strict validation)', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'Strict Mode',
          text: 'Valid text',
          unwanted_field: 'malicious_input',
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error, 'Validation error');
    });
  });

  describe('Email Delivery Scenarios', () => {
    test('1. Sends plain-text email successfully (202 Accepted)', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'recipient@example.com',
          subject: 'Plain Text Notification',
          text: 'Your account balance is updated.',
        }),
      });

      assert.equal(res.status, 202);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.message, 'Email accepted for delivery');
      assert.ok(data.messageId);

      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, 'recipient@example.com');
      assert.equal(sentMails[0].subject, 'Plain Text Notification');
      assert.equal(sentMails[0].text, 'Your account balance is updated.');
      assert.equal(sentMails[0].html, undefined);
    });

    test('2. Sends EJS template email and automatically escapes user input', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'rifat@example.com',
          subject: 'Welcome to our platform',
          template: {
            name: 'welcome',
            data: {
              name: '<script>alert("xss")</script>Rifat',
              appName: 'My Application',
            },
          },
        }),
      });

      assert.equal(res.status, 202);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.messageId);

      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, 'rifat@example.com');
      // Assert HTML rendered correctly and XSS was escaped
      assert.ok(sentMails[0].html.includes('&lt;script&gt;alert(&#34;xss&#34;)&lt;/script&gt;Rifat'));
      assert.ok(!sentMails[0].html.includes('<script>alert("xss")</script>'));
      assert.ok(sentMails[0].html.includes('My Application'));
    });

    test('3. Sends HTML email with plain-text alternative', async () => {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'dual@example.com',
          subject: 'Dual Format Welcome',
          text: 'Welcome Rifat! Your account is active.',
          template: {
            name: 'welcome',
            data: {
              name: 'Rifat',
              appName: 'SuperApp',
            },
          },
        }),
      });

      assert.equal(res.status, 202);
      const data = await res.json();
      assert.equal(data.success, true);

      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, 'dual@example.com');
      assert.equal(sentMails[0].text, 'Welcome Rifat! Your account is active.');
      assert.ok(sentMails[0].html.includes('SuperApp'));
    });

    test('4. Handles upstream SMTP failure securely with generic 500', async () => {
      shouldFailSmtp = true;

      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validApiKey}`,
        },
        body: JSON.stringify({
          to: 'recipient@example.com',
          subject: 'Will Fail Upstream',
          text: 'Testing failure handling',
        }),
      });

      assert.equal(res.status, 500);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(
        data.error,
        'Failed to send email due to an upstream or internal delivery failure'
      );
      // Ensure no raw stack traces or internal socket credentials leaked
      assert.equal(data.stack, undefined);
      assert.equal(data.code, undefined);
    });
  });
});

