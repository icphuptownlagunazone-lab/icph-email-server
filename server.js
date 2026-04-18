require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sendEmail } = require("./mailer");

const app = express();

app.use(cors());
app.use(express.json());

const LOGO_PATH = path.join(__dirname, "icph_logo_converted.png");

function safe(value) {
  return String(value || "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isPendingBadgeNumber(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "-" ||
    normalized === "pending" ||
    normalized === "to follow" ||
    normalized === "tba" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none"
  );
}

function getApprovalExtraMessage(memberCategory, badgeNumber) {
  const category = String(memberCategory || "").trim().toLowerCase();
  const pendingBadge = isPendingBadgeNumber(badgeNumber);

  if (category === "official member" && pendingBadge) {
    return `
      <p style="margin:0 0 14px 0;">
        Kindly coordinate with an admin to inquire about the process for securing your badge number.
      </p>
    `;
  }

  if (category === "aspirant") {
    return `
      <p style="margin:0 0 14px 0;">
        Kindly coordinate with an admin to inquire about the process of becoming an official member and securing your badge number.
      </p>
    `;
  }

  return "";
}

function buildSimpleEmail({
  title,
  titleBackground,
  intro,
  fullName,
  memberCategory,
  badgeNumber,
  outro
}) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safe(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              
              <tr>
                <td align="center" style="padding:24px 20px 10px 20px;">
                  <img
                    src="cid:icphlogo"
                    alt="ICPH Logo"
                    style="display:block;width:140px;max-width:140px;height:auto;margin:0 auto 14px auto;border:0;outline:none;text-decoration:none;"
                  />
                </td>
              </tr>

              <tr>
                <td style="padding:0 20px 12px 20px;">
                  <div style="background:${titleBackground};color:#ffffff;padding:12px 14px;border-radius:10px;text-align:center;font-size:15px;font-weight:700;letter-spacing:0.4px;">
                    ${safe(title)}
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:10px 20px 8px 20px;font-size:15px;line-height:1.8;color:#111827;">
                  ${intro}
                </td>
              </tr>

              <tr>
                <td style="padding:12px 20px 10px 20px;">
                  <div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid #e5e7eb;font-size:14px;line-height:1.8;color:#111827;">
                    <div><strong>Name:</strong> ${safe(fullName)}</div>
                    <div><strong>Category:</strong> ${safe(memberCategory)}</div>
                    <div><strong>Badge Number:</strong> ${safe(badgeNumber)}</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:10px 20px 24px 20px;font-size:15px;line-height:1.8;color:#111827;">
                  ${outro}
                </td>
              </tr>

              <tr>
                <td style="padding:14px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
                  This is an automated email from ICPH Admin.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

app.post("/api/send-approval-email", async (req, res) => {
  try {
    const { email, full_name, member_category, badge_number } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const extraMessage = getApprovalExtraMessage(member_category, badge_number);

    const html = buildSimpleEmail({
      title: "APPROVED",
      titleBackground: "#15803d",
      intro: `
        <p style="margin:0 0 14px 0;">Hi <strong>${safe(full_name || "Member")}</strong>,</p>
        <p style="margin:0 0 14px 0;">
          Good news — your membership application has been approved.
        </p>
      `,
      fullName: full_name,
      memberCategory: member_category,
      badgeNumber: badge_number,
      outro: `
        ${extraMessage}
        <p style="margin:0 0 14px 0;">
          We’re glad to have you with us.
        </p>
        <p style="margin:0;">
          Thank you and ride safe,<br><strong>ICPH Utpown Laguna Zone Admin</strong>
        </p>
      `
    });

    let textExtra = "";
    const categoryLower = String(member_category || "").trim().toLowerCase();

    if (categoryLower === "official member" && isPendingBadgeNumber(badge_number)) {
      textExtra =
        "\nKindly coordinate with an admin to inquire about the process for securing your badge number.\n";
    } else if (categoryLower === "aspirant") {
      textExtra =
        "\nKindly coordinate with an admin to inquire about the process of becoming an official member and securing your badge number.\n";
    }

    await sendEmail({
      to: email,
      subject: "Membership Approved",
      text:
        `Hi ${full_name || "Member"},\n\n` +
        `Good news — your membership application has been approved.\n\n` +
        `Name: ${full_name || "-"}\n` +
        `Category: ${member_category || "-"}\n` +
        `Badge Number: ${badge_number || "-"}\n` +
        `${textExtra}\n` +
        `We’re glad to have you with us.\n\n` +
        `Thank you and ride safe,\nICPH Utpown Laguna Zone Admin`,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: LOGO_PATH,
          cid: "icphlogo"
        }
      ]
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("send-approval-email error:", err);
    return res.status(500).json({ error: err.message || "Failed to send approval email." });
  }
});

app.post("/api/send-reject-email", async (req, res) => {
  try {
    const { email, full_name, member_category, badge_number } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const html = buildSimpleEmail({
      title: "APPLICATION UPDATE",
      titleBackground: "#b91c1c",
      intro: `
        <p style="margin:0 0 14px 0;">Hi <strong>${safe(full_name || "Member")}</strong>,</p>
        <p style="margin:0 0 14px 0;">
          Thank you for your interest in joining ICPH Uptown Laguna Zone.
        </p>
        <p style="margin:0 0 14px 0;">
          After review, your application was not approved at this time.
        </p>
      `,
      fullName: full_name,
      memberCategory: member_category,
      badgeNumber: badge_number,
      outro: `
        <p style="margin:0 0 14px 0;">
          You may coordinate with an admin if you would like clarification or if you plan to re-apply in the future.
        </p>
        <p style="margin:0;">
          Thank you and ride safe,<br><strong>ICPH Utpown Laguna Zone Admin</strong>
        </p>
      `
    });

    await sendEmail({
      to: email,
      subject: "Membership Update",
      text:
        `Hi ${full_name || "Member"},\n\n` +
        `Thank you for your interest in joining ICPH.\n` +
        `After review, your application was not approved at this time.\n\n` +
        `Name: ${full_name || "-"}\n` +
        `Category: ${member_category || "-"}\n` +
        `Badge Number: ${badge_number || "-"}\n\n` +
        `You may coordinate with an admin if you would like clarification or if you plan to re-apply in the future.\n\n` +
        `Thank you and ride safe,\nICPH Utpown Laguna Zone Admin`,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: LOGO_PATH,
          cid: "icphlogo"
        }
      ]
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("send-reject-email error:", err);
    return res.status(500).json({ error: err.message || "Failed to send rejection email." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Email server running on http://localhost:${PORT}`);
});