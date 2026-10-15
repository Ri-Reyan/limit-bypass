# Lightweight Email Delivery Microservice

A secure, minimal, production-ready email delivery microservice built with **Express.js**, **Nodemailer**, **EJS**, and **Zod**, optimized for deployment on **Vercel** serverless functions or any Node.js container environment.

---

## Features

- **Authenticated Backend Integration**: Bearer token authentication with timing-safe comparison (`crypto.timingSafeEqual`).
- **Flexible Content Delivery**: Supports plain-text emails, dynamic HTML emails via pre-approved EJS templates, or dual-format (HTML + plain-text fallback).
- **Strict Input Validation**: End-to-end payload validation and sanitization using **Zod** (`.strict()` mode prevents unexpected or malicious fields).
- **Security-First Design**:
  - Request body size limits (`100kb`).
  - Configurable server-side CORS allowlist.
  - Rate limiting compatible with serverless instances.
  - Template injection protection with a rigid template allowlist and automatic HTML escaping (`<%= %>`).
  - Strict secret isolation: SMTP credentials and API keys are read exclusively from environment variables and never logged or reflected in responses.
- **Vercel Serverless Ready**:
  - Configured with `api/index.js` entry point.
  - Explicit SMTP connection timeouts to avoid hanging serverless functions.
  - `vercel.json` rewrites and template bundling rules (`includeFiles`).

---

## Project Structure

```text
email-service/
├── api/
│   └── index.js              # Vercel Serverless Function entry point
├── src/
│   ├── app.js                # Express application configuration & middleware
│   ├── server.js             # Local development server entry point
│   ├── routes/
│   │   └── email.routes.js   # Route definitions for /api/send-email
│   ├── controllers/
│   │   └── email.controller.js # Request handling, validation & responses
│   ├── services/
│   │   └── email.service.js  # EJS rendering & Nodemailer delivery logic
│   ├── config/
│   │   ├── env.js            # Zod-validated environment configuration
│   │   └── mailer.js         # Nodemailer transporter & timeout settings
│   ├── middleware/
│   │   ├── authenticate.js   # Constant-time Bearer token validator
│   │   └── error-handler.js  # Sanitized error response formatter
│   ├── schemas/
│   │   └── email.schema.js   # Zod validation schema & template allowlist
│   └── templates/
│       └── welcome.ejs       # Secure, responsive HTML email template
├── test/
│   ├── email.test.js         # Integration tests (node:test)
│   └── rate-limit.test.js    # Rate-limiting middleware tests
├── .env.example              # Environment variables template
├── .gitignore
├── package.json              # ES Modules configuration and dependencies
├── vercel.json               # Vercel routing & template inclusion config
└── README.md
```

---

## Environment Variables

All configuration is managed exclusively via server-side environment variables. Validate required values at startup:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `3000` | Port for local development server |
| `NODE_ENV` | No | `production` | Node environment (`development`, `production`, `test`) |
| `API_KEY` | **Yes** | — | Secret Bearer key required to authenticate caller backend requests |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated list of allowed CORS origins or `*` |
| `SMTP_HOST` | **Yes** | — | Hostname of SMTP provider (e.g., `smtp.mailgun.org`) |
| `SMTP_PORT` | No | `587` | SMTP port (`587` for STARTTLS, `465` for SSL/TLS) |
| `SMTP_SECURE` | No | `false` | Set `true` if connecting to port `465`, `false` for port `587`/`25` |
| `SMTP_USER` | **Yes** | — | SMTP username / access key |
| `SMTP_PASS` | **Yes** | — | SMTP password / secret key |
| `MAIL_FROM` | **Yes** | — | Sender header (e.g. `"Acme <no-reply@yourdomain.com>"`) |

---

## Local Development

### 1. Prerequisites
- Node.js `v18+` (Node `v20+` or `v24+` recommended)
- npm `v9+`

### 2. Setup
Clone or enter the project directory and configure the environment:

```bash
cp .env.example .env
npm install
```

Edit `.env` with your development values:
```env
PORT=3000
NODE_ENV=development
API_KEY=local_development_secret_key_12345
ALLOWED_ORIGINS=*
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAIL_FROM="Acme Dev <no-reply@yourdomain.com>"
```

### 3. Run Locally
```bash
# Start server with watch mode
npm run dev

# Or standard start
npm start
```
The server will start at `http://localhost:3000`.

### 4. Run Automated Tests
The project uses Node's native test runner (`node:test`):

```bash
npm test
```

---

## API Specification

### Endpoint: `POST /api/send-email`

#### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <API_KEY>`

#### Request Body Structure
```json
{
  "to": "recipient@example.com",
  "subject": "Welcome to our platform",
  "text": "Your account has been created successfully.",
  "template": {
    "name": "welcome",
    "data": {
      "name": "Rifat",
      "appName": "My Application"
    }
  }
}
```

- `to` *(string, required)*: Valid email address.
- `subject` *(string, required)*: Non-empty subject line.
- `text` *(string, optional)*: Plain-text email body.
- `template` *(object, optional)*:
  - `name` *(string, required)*: Name of an approved template in `ALLOWED_TEMPLATES` (`"welcome"`).
  - `data` *(object, optional)*: Key-value pairs supplied to the template.
- *Requirement*: At least one of `text` or `template` must be provided.
- *Strictness*: Top-level and template-level unknown fields are rejected with HTTP 400.

---

## Testing & Example cURL Requests

### 1. Send Plain-Text Email
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Authorization: Bearer local_development_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Account Alert",
    "text": "Your monthly statement is ready for download."
  }'
```
**Expected Status:** `202 Accepted`  
**Example Response:**
```json
{
  "success": true,
  "message": "Email accepted for delivery",
  "messageId": "<7b29d4d8-c119-2ea1-399b-d72b22f7a9be@example.com>"
}
```

---

### 2. Send EJS-Template Email
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Authorization: Bearer local_development_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "rifat@example.com",
    "subject": "Welcome to Acme",
    "template": {
      "name": "welcome",
      "data": {
        "name": "Rifat",
        "appName": "Acme Cloud"
      }
    }
  }'
```
**Expected Status:** `202 Accepted`  
**Example Response:**
```json
{
  "success": true,
  "message": "Email accepted for delivery",
  "messageId": "<8e92f1a2-3b10-4f51-b847-9201f8d42c31@example.com>"
}
```

---

### 3. Send HTML Email with Plain-Text Alternative
When both `template` and `text` are provided, the template is rendered as the rich HTML body, and `text` is transmitted as the multipart plain-text fallback:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Authorization: Bearer local_development_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "rifat@example.com",
    "subject": "Welcome to Acme",
    "text": "Hello Rifat, welcome to Acme Cloud! Your account is active.",
    "template": {
      "name": "welcome",
      "data": {
        "name": "Rifat",
        "appName": "Acme Cloud"
      }
    }
  }'
```
**Expected Status:** `202 Accepted`  
**Example Response:**
```json
{
  "success": true,
  "message": "Email accepted for delivery",
  "messageId": "<ca84112e-60f1-4db8-963a-bbce501258d9@example.com>"
}
```

---

### 4. Invalid or Missing API Key
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Authorization: Bearer unauthorized_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "text": "Test"
  }'
```
**Expected Status:** `401 Unauthorized`  
**Example Response:**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid API key."
}
```

---

### 5. Invalid Payload (Validation Failure)
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Authorization: Bearer local_development_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "invalid-email-address",
    "subject": "",
    "unexpected_field": 123
  }'
```
**Expected Status:** `400 Bad Request`  
**Example Response:**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "field": "to",
      "message": "Invalid email address format"
    },
    {
      "field": "subject",
      "message": "Subject cannot be empty"
    },
    {
      "field": "text",
      "message": "At least one of 'text' or 'template' must be provided"
    },
    {
      "field": "unexpected_field",
      "message": "Unrecognized fields in request payload"
    }
  ]
}
```

---

### 6. Upstream SMTP Delivery Failure
When the upstream SMTP provider rejects the connection, authentication, or recipient:

**Expected Status:** `500 Internal Server Error`  
**Example Response:**
```json
{
  "success": false,
  "error": "Failed to send email due to an upstream or internal delivery failure"
}
```
*Note: Credentials, internal network addresses, and raw stack traces are stripped before sending the response to the client.*

---

## Vercel Deployment Guide

### Deployment Architecture
- Vercel automatically treats files in `api/` as Serverless Functions.
- `api/index.js` exports the configured Express application.
- `vercel.json` rewrites all incoming traffic to `api/index.js` and instructs `@vercel/nft` to bundle EJS templates located in `src/templates/**`:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.js"
    }
  ],
  "functions": {
    "api/index.js": {
      "includeFiles": "src/templates/**"
    }
  }
}
```

### Serverless Execution Constraints & SMTP Provider Compatibility
1. **Stateless Functions**: Serverless instances spin down after execution. Connections are not persistent.
2. **Execution Timeouts**: Vercel functions have maximum execution limits (typically 10–15s on Hobby, 60s+ on Pro). To avoid hung requests, Nodemailer is configured with:
   - `connectionTimeout: 10000` (10s)
   - `greetingTimeout: 10000` (10s)
   - `socketTimeout: 15000` (15s)
3. **Outbound Port Filtering**: Cloud hosting providers (including AWS Lambda / Vercel) block outbound traffic on standard SMTP port `25` to prevent spam abuse. Always use:
   - **Port `587`** (STARTTLS with `SMTP_SECURE=false`), or
   - **Port `465`** (SSL/TLS with `SMTP_SECURE=true`).
4. **Legitimate SMTP Services**: Use legitimate, verified transactional email providers (e.g., Mailgun, SendGrid, Amazon SES, Postmark, Resend SMTP). Do not attempt to run a self-hosted persistent SMTP mail transfer agent (MTA) inside Vercel.
5. **Rate Limiting in Serverless**: In-memory rate limiting operates per serverless container. For distributed multi-instance rate limiting across high-volume production deployments, use edge middleware (e.g., Vercel Edge Middleware with Upstash Redis / Vercel KV).

### Deployment Checklist

1. [ ] Install the Vercel CLI or link your repository to GitHub / GitLab / Bitbucket.
2. [ ] In the Vercel Project Settings, navigate to **Settings > Environment Variables**.
3. [ ] Add all required variables:
   - `API_KEY`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `MAIL_FROM`
   - `ALLOWED_ORIGINS`
   - `NODE_ENV` (`production`)
4. [ ] Deploy via Vercel CLI:
   ```bash
   vercel --prod
   ```
   Or push to your connected Git branch (`main`).
5. [ ] Verify deployment health:
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
6. [ ] Execute a test email dispatch using the production URL and `API_KEY`.

---

## Security Checklist

- [x] **Timing-Safe Authentication**: API key verified using `crypto.timingSafeEqual` over fixed-length buffers.
- [x] **Zero Credential Exposure**: SMTP user/pass exist strictly in server-side memory; no payloads or logs ever mirror credentials.
- [x] **Strict Payload Sanitization**: Zod `.strict()` blocks arbitrary payload injection.
- [x] **Template Injection Shield**: Template names strictly constrained to `ALLOWED_TEMPLATES` allowlist; template source cannot be submitted via API.
- [x] **Automatic XSS Escaping**: EJS templates use `<%= %>` for safe entity encoding; untrusted inputs cannot execute script tags.
- [x] **Path Traversal Prevention**: Safe path resolution ensures template files remain strictly inside `src/templates/`.
- [x] **Denial of Service (DoS) Protection**: Request bodies capped at `100kb`; rate limiting prevents runaway loops.
- [x] **Safe Error Logging**: Server logs sanitized diagnostics (e.g., SMTP error code) while returning opaque 500 error messages to callers.
- [x] **CORS Guardrails**: Browser access restricted to trusted origins, while permitting legitimate server-to-server HTTP calls.

# limit-bypass
