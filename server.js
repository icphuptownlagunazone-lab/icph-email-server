const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function normalizeText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const gmailUser = requireEnv("GMAIL_USER");
  const gmailAppPassword = requireEnv("GMAIL_APP_PASSWORD");

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  return transporter;
}

function getFromAddress() {
  const fromName = normalizeText(process.env.MAIL_FROM_NAME) || "ICPH Uptown Laguna";
  const fromEmail = requireEnv("GMAIL_USER");
  return `"${fromName}" <${fromEmail}>`;
}

function getLogoAttachment() {
  return [
    {
      filename: "icph_logo_converted.png",
      path: path.join(__dirname, "icph_logo_converted.png"),
      cid: "icphlogo"
    }
  ];
}

function buildEmailShell({
  subjectLabel,
  titleColor,
  titleText,
  introText,
  bodyHtml,
  footerText
}) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subjectLabel)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif; color:#1f2937;">
    <div style="width:100%; background:#f4f7fb; padding:24px 12px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08); border:1px solid #e5e7eb;">

        <div style="padding:28px 28px 10px; text-align:center; background:#ffffff;">
          <img
            src="cid:icphlogo"
            alt="ICPH Logo"
            style="width:110px; max-width:110px; height:auto; display:block; margin:0 auto 10px;"
          />
        </div>

        <div style="padding:0 28px 28px; text-align:center;">
          <div style="display:inline-block; padding:8px 18px; border-radius:999px; background:${titleColor}; color:#ffffff; font-size:13px; font-weight:700; margin-bottom:18px; text-align:center;">
            ${escapeHtml(titleText)}
          </div>

          <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151; text-align:left;">
            ${introText}
          </p>

          <div style="text-align:left;">
            ${bodyHtml}
          </div>

          <div style="margin-top:28px; padding-top:18px; border-top:1px solid #e5e7eb; font-size:13px; line-height:1.7; color:#6b7280; text-align:left;">
            ${footerText}
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

function buildApprovalEmail({ fullName, memberCategory, badgeNumber }) {
  const safeFullName = escapeHtml(fullName || "Member");
  const safeCategory = escapeHtml(memberCategory || "-");
  const safeBadge = escapeHtml(badgeNumber || "-");

  const subject = "ICPH Membership Approved";

  const html = buildEmailShell({
    subjectLabel: subject,
    titleColor: "#16a34a",
    titleText: "APPROVED",
    introText: `Hello <strong>${safeFullName}</strong>,<br><br>Your membership application has been approved.`,
    bodyHtml: `
      <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:14px; padding:18px; margin:18px 0;">
        <div style="margin-bottom:10px; font-size:14px; color:#6b7280;">Membership Details</div>
        <div style="font-size:15px; line-height:1.9; color:#111827;">
          <strong>Name:</strong> ${safeFullName}<br>
          <strong>Category:</strong> ${safeCategory}<br>
          <strong>Badge Number:</strong> ${safeBadge}
        </div>
      </div>

      <p style="margin:0; font-size:15px; line-height:1.7; color:#374151;">
        You may now log in to the member portal using your registered email address.
      </p>
    `,
    footerText: `
      This is an automated email from ICPH Uptown Laguna.<br>
      Please do not reply to this message.
    `
  });

  const text = [
    "ICPH Uptown Laguna",
    "",
    "APPROVED",
    "",
    `Hello ${fullName || "Member"},`,
    "",
    "Your membership application has been approved.",
    "",
    `Name: ${fullName || "Member"}`,
    `Category: ${memberCategory || "-"}`,
    `Badge Number: ${badgeNumber || "-"}`,
    "",
    "You may now log in to the member portal using your registered email address.",
    "",
    "This is an automated email from ICPH Uptown Laguna."
  ].join("\n");

  return { subject, html, text };
}

function buildRejectEmail({ fullName, memberCategory, badgeNumber }) {
  const safeFullName = escapeHtml(fullName || "Member");
  const safeCategory = escapeHtml(memberCategory || "-");
  const safeBadge = escapeHtml(badgeNumber || "-");

  const subject = "ICPH Membership Application Update";

  const html = buildEmailShell({
    subjectLabel: subject,
    titleColor: "#dc2626",
    titleText: "NOT APPROVED",
    introText: `Hello <strong>${safeFullName}</strong>,<br><br>We regret to inform you that your membership application was not approved at this time.`,
    bodyHtml: `
      <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:18px; margin:18px 0;">
        <div style="margin-bottom:10px; font-size:14px; color:#7f1d1d;">Application Details</div>
        <div style="font-size:15px; line-height:1.9; color:#111827;">
          <strong>Name:</strong> ${safeFullName}<br>
          <strong>Category:</strong> ${safeCategory}<br>
          <strong>Badge Number:</strong> ${safeBadge}
        </div>
      </div>

      <p style="margin:0; font-size:15px; line-height:1.7; color:#374151;">
        For questions or clarification, please reach out to an administrator.
      </p>
    `,
    footerText: `
      This is an automated email from ICPH Uptown Laguna.<br>
      Please do not reply to this message.
    `
  });

  const text = [
    "ICPH Uptown Laguna",
    "",
    "NOT APPROVED",
    "",
    `Hello ${fullName || "Member"},`,
    "",
    "We regret to inform you that your membership application was not approved at this time.",
    "",
    `Name: ${fullName || "Member"}`,
    `Category: ${memberCategory || "-"}`,
    `Badge Number: ${badgeNumber || "-"}`,
    "",
    "For questions or clarification, please reach out to an administrator.",
    "",
    "This is an automated email from ICPH Uptown Laguna."
  ].join("\n");

  return { subject, html, text };
}

function validatePayload(body) {
  const email = normalizeText(body?.email).toLowerCase();
  const fullName = normalizeText(body?.full_name);
  const memberCategory = normalizeText(body?.member_category);
  const badgeNumber = normalizeText(body?.badge_number);

  if (!email) {
    return { error: "Email is required." };
  }

  return {
    email,
    fullName: fullName || "Member",
    memberCategory: memberCategory || "-",
    badgeNumber: badgeNumber || "-"
  };
}

app.get("/", (req, res) => {
  res.status(200).send("ICPH email server is running.");
});

app.get("/health", (req, res) => {
  try {
    requireEnv("GMAIL_USER");
    requireEnv("GMAIL_APP_PASSWORD");

    res.status(200).json({
      ok: true,
      service: "icph-email-server",
      message: "Server is healthy."
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/send-approval-email", async (req, res) => {
  try {
    const parsed = validatePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }

    const { email, fullName, memberCategory, badgeNumber } = parsed;
    const { subject, html, text } = buildApprovalEmail({
      fullName,
      memberCategory,
      badgeNumber
    });

    const info = await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      text,
      html,
      attachments: getLogoAttachment()
    });

    return res.status(200).json({
      ok: true,
      message: "Approval email sent successfully.",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("send-approval-email error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to send approval email."
    });
  }
});

app.post("/api/send-reject-email", async (req, res) => {
  try {
    const parsed = validatePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }

    const { email, fullName, memberCategory, badgeNumber } = parsed;
    const { subject, html, text } = buildRejectEmail({
      fullName,
      memberCategory,
      badgeNumber
    });

    const info = await getTransporter().sendMail({
      from: getFromAddress(),
      to: email,
      subject,
      text,
      html,
      attachments: getLogoAttachment()
    });

    return res.status(200).json({
      ok: true,
      message: "Reject email sent successfully.",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("send-reject-email error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to send reject email."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found."
  });
});

app.listen(PORT, () => {
  console.log(`ICPH email server running on port ${PORT}`);
});