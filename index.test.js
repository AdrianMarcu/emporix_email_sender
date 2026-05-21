const handler = require('./index');
const nodemailer = require('nodemailer');

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

  test('returns 500 when SMTP throws', async () => {
    const mockSendMail = jest.fn().mockRejectedValue(new Error('Invalid login'));
    nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

    const req = { body: { to: 'recv@b.com', subject: 'Hi', body: '<p>Hello</p>' } };
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid login' });
  });
});
