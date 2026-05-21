# Emporix Email Sender — Design Spec

**Date:** 2026-05-21
**Status:** Approved

---

## Overview

A single Emporix cloud function that listens on an HTTP endpoint and sends an email via Gmail SMTP using Nodemailer. The caller provides the recipient, subject, and body in the POST request body.

---

## Architecture

The function is a single-file Node.js 24 cloud function deployed as a zip archive to Emporix hosting. Emporix exposes it at:

```
POST https://api.emporix.io/cloud-functions/{TENANT}/functions/{FUNCTION_ID}
```

Authentication at the HTTP layer is handled by the Emporix platform, which injects headers (`emporix-token`, `emporix-user-id`, etc.) on every inbound request.

### File Structure

```
emporix_email_sender/
├── index.js          # HTTP handler entry point
├── package.json      # declares nodemailer dependency, "main": "index.js"
└── .env.example      # documents required env vars (not committed)
```

---

## Components

### `index.js`

Exports a single async HTTP handler function. Responsibilities:

1. Parse the JSON request body.
2. Validate that `to`, `subject`, and `body` fields are present.
3. Create a Nodemailer transporter using Gmail SMTP credentials from environment variables.
4. Call `transporter.sendMail()` with the provided fields.
5. Return a JSON response.

The transporter is created per-invocation (stateless — correct for serverless).

### `package.json`

- `"main": "index.js"`
- Dependencies: `nodemailer`
- No build step required.

### Environment Variables (set in Emporix hosting dashboard)

| Variable    | Description                                      |
|-------------|--------------------------------------------------|
| `SMTP_USER` | Gmail address used as sender (e.g. `you@gmail.com`) |
| `SMTP_PASS` | Gmail App Password (not the account password)    |

---

## Request & Response Contract

### Request

`POST /` — `Content-Type: application/json`

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Plain text or HTML content"
}
```

All three fields are required.

### Success Response — `200 OK`

```json
{ "status": "sent", "messageId": "<unique-id@gmail.com>" }
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400`  | One or more of `to`, `subject`, `body` is missing |
| `500`  | SMTP failure or transporter error |

Error body:
```json
{ "error": "human-readable message" }
```

---

## Data Flow

```
Caller
  └─ POST / { to, subject, body }
       └─ validate fields → 400 if missing
       └─ create Nodemailer Gmail transporter (SMTP_USER, SMTP_PASS from env)
       └─ sendMail({ from: SMTP_USER, to, subject, html: body })
            └─ success → 200 { status: "sent", messageId }
            └─ failure → 500 { error: "..." }
```

---

## Error Handling & Security

- Field validation happens before any SMTP call, keeping error responses fast and cheap.
- SMTP errors are caught and surfaced as `500` with the error message — never swallowed silently.
- Gmail credentials are stored exclusively in Emporix environment variables, never in code or version control.
- `.env.example` documents required variables without values, and `.gitignore` excludes any `.env` files.
- The Emporix platform handles HTTP-level authentication; no additional auth logic is needed in the function.

---

## Testing

Manual testing via `curl` or Postman against the deployed endpoint:

- Happy path: valid `to`, `subject`, `body` → email arrives, `200` returned.
- Missing field: omit `to` → `400` with error message.
- Bad credentials: wrong `SMTP_PASS` → `500` with SMTP error.

Local smoke test (pre-deploy): run `node index.js` is not directly applicable since the function is invoked by the Emporix runtime — use a local wrapper or test by deploying to a staging tenant.

---

## Deployment

1. Run `npm install` locally to generate `node_modules`.
2. Zip the directory: `zip -r function.zip index.js package.json node_modules/`.
3. Upload `function.zip` to Emporix hosting dashboard.
4. Set `SMTP_USER` and `SMTP_PASS` as environment variables in the dashboard.
5. Note the assigned `FUNCTION_ID` and test the endpoint.
