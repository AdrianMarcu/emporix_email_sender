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
