require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const info = await transporter.sendMail({
    from: `"ICPH Admin" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments
  });

  return info;
}

module.exports = { sendEmail };