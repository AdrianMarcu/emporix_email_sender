const nodemailer = require('nodemailer');

const handler = async (req, res) => {
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
    console.error('SMTP error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

if (require.main === module) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.post('/', handler);
  const port = process.env.PORT || 8080;
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

module.exports = handler;
