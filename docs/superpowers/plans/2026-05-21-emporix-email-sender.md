# Emporix Email Sender Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js Emporix cloud function that accepts a POST request with `to`, `subject`, and `body` fields and sends an email via Gmail SMTP using Nodemailer.

**Architecture:** A single `index.js` exports an async HTTP handler `(req, res)`. Validation happens first, then a per-invocation Nodemailer Gmail transporter sends the email. Credentials are read from `SMTP_USER` and `SMTP_PASS` environment variables set in the Emporix hosting dashboard.

**Tech Stack:** Node.js 24, nodemailer 6.x, jest 29.x (tests only)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Create | Declares dependencies and test script |
| `index.js` | Create | HTTP handler — validation + email sending |
| `.env.example` | Create | Documents required env vars |
| `index.test.js` | Create | Jest tests with mocked nodemailer |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "emporix-email-sender",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "jest"
  },
  "dependencies": {
    "nodemailer": "^6.9.14"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: scaffold project with nodemailer and jest"
```

---

### Task 2: Validation (TDD)

**Files:**
- Create: `index.test.js`
- Create: `index.js`

- [ ] **Step 1: Create `index.test.js` with validation tests**

```js
const handler = require('./index');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validation', () => {
  test('returns 400 when "to" is missing', async () => {
    const req = { body: { subject: 'Hello', body: 'World' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: to, subject, body' });
  });

  test('returns 400 when "subject" is missing', async () => {
    const req = { body: { to: 'a@b.com', body: 'World' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: to, subject, body' });
  });

  test('returns 400 when "body" is missing', async () => {
    const req = { body: { to: 'a@b.com', subject: 'Hello' } };
    const res = makeRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: to, subject, body' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: 3 tests fail — "Cannot find module './index'"

- [ ] **Step 3: Create `index.js` with validation only**

```js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  const { to, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.js index.test.js
git commit -m "feat: add request validation with tests"
```

---

### Task 3: Email Sending (TDD)

**Files:**
- Modify: `index.test.js` — add happy path test
- Modify: `index.js` — add sendMail logic

- [ ] **Step 1: Add happy path test to `index.test.js`**

Add this block after the `describe('validation', ...)` block:

```js
jest.mock('nodemailer');

describe('email sending', () => {
  beforeEach(() => {
    process.env.SMTP_USER = 'sender@gmail.com';
    process.env.SMTP_PASS = 'secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  test('sends email and returns 200 with messageId', async () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: '<abc@gmail.com>' });
    nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

    const req = { body: { to: 'recv@b.com', subject: 'Hi', body: '<p>Hello</p>' } };
    const res = makeRes();

    await handler(req, res);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'sender@gmail.com', pass: 'secret' },
    });
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@gmail.com',
      to: 'recv@b.com',
      subject: 'Hi',
      html: '<p>Hello</p>',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'sent', messageId: '<abc@gmail.com>' });
  });
});
```

- [ ] **Step 2: Run tests to verify new test fails**

Run: `npm test`

Expected: 3 validation tests pass, 1 new test fails — "res.status not called with 200"

- [ ] **Step 3: Update `index.js` to add email sending**

Replace the entire file contents:

```js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  const { to, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html: body,
  });

  res.status(200).json({ status: 'sent', messageId: info.messageId });
};
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test`

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.js index.test.js
git commit -m "feat: implement email sending via Gmail SMTP"
```

---

### Task 4: SMTP Error Handling (TDD)

**Files:**
- Modify: `index.test.js` — add SMTP error test
- Modify: `index.js` — wrap sendMail in try/catch

- [ ] **Step 1: Add SMTP error test to the `email sending` describe block in `index.test.js`**

Add this test inside the existing `describe('email sending', ...)` block, after the happy path test:

```js
  test('returns 500 when SMTP throws', async () => {
    const mockSendMail = jest.fn().mockRejectedValue(new Error('Invalid login'));
    nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

    const req = { body: { to: 'recv@b.com', subject: 'Hi', body: '<p>Hello</p>' } };
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid login' });
  });
```

- [ ] **Step 2: Run tests to verify new test fails**

Run: `npm test`

Expected: 4 tests pass, 1 new test fails — unhandled promise rejection or wrong status code.

- [ ] **Step 3: Update `index.js` to wrap sendMail in try/catch**

Replace the entire file contents:

```js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  const { to, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: body,
    });
    res.status(200).json({ status: 'sent', messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test`

Expected: 5 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add index.js index.test.js
git commit -m "feat: handle SMTP errors with 500 response"
```

---

### Task 5: Deployment Prep

**Files:**
- No code changes — build the deploy artifact and verify it works.

- [ ] **Step 1: Build the deployment zip**

Run from the project root:

```bash
zip -r function.zip index.js package.json package-lock.json node_modules/
```

Expected: `function.zip` created. Verify size is reasonable (a few MB at most).

- [ ] **Step 2: Deploy to Emporix**

1. Open the Emporix management dashboard.
2. Navigate to **Hosting** → your hosting project.
3. Click **Deploy** and upload `function.zip`.
4. Wait for the build to complete — status changes to **Active**.
5. Note the `FUNCTION_ID` assigned to your function.

- [ ] **Step 3: Set environment variables in the dashboard**

In the function's **Settings / Environment Variables** section, add:

| Key | Value |
|-----|-------|
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | your Gmail App Password (generate at myaccount.google.com → Security → App Passwords) |

- [ ] **Step 4: Smoke test the deployed function**

Replace `{TENANT}` and `{FUNCTION_ID}` with your actual values:

```bash
curl -X POST \
  https://api.emporix.io/cloud-functions/{TENANT}/functions/{FUNCTION_ID} \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com","subject":"Test from Emporix","body":"<p>It works!</p>"}'
```

Expected response:
```json
{ "status": "sent", "messageId": "<...@gmail.com>" }
```

Check your inbox to confirm the email arrived.

- [ ] **Step 5: Commit the zip exclusion to .gitignore and final commit**

Add `function.zip` to `.gitignore` (open the file and append):

```
function.zip
```

```bash
git add .gitignore
git commit -m "chore: exclude deployment artifact from git"
```
