const router = require("express").Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { User } = require("../models/User");

// ── Email helper ───────────────────────────────────────────────────────────────
const sendResetEmail = async (toEmail, resetUrl, userName) => {
  const { SMTP_USER, SMTP_PASS } = process.env;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700">CodeCraft</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#111827;margin:0 0 8px">Reset Your Password</h2>
        <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Hi ${userName}, we received a request to reset your password. Click the button below — the link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600">Reset Password</a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:0">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
        <p style="color:#9ca3af;font-size:11px;margin:0">Or copy this link: <a href="${resetUrl}" style="color:#6366f1">${resetUrl}</a></p>
      </div>
    </div>
  `;

  if (SMTP_USER && SMTP_PASS && SMTP_USER !== "your_gmail@gmail.com") {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"CodeCraft" <${SMTP_USER}>`,
      to: toEmail,
      subject: "Reset your CodeCraft password",
      html,
    });
    console.log(`[PASSWORD] Reset email sent to ${toEmail}`);
    return { channel: "email" };
  }

  // Dev fallback — print reset URL to console
  console.log("\n" + "=".repeat(60));
  console.log(`[PASSWORD DEV] Reset URL for ${toEmail}:`);
  console.log(resetUrl);
  console.log("[PASSWORD DEV] Set SMTP_USER + SMTP_PASS in .env to send real emails");
  console.log("=".repeat(60) + "\n");
  return { channel: "console", resetUrl };
};

// ── POST /api/password/forgot ──────────────────────────────────────────────────
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to avoid account enumeration
    if (!user) {
      return res.status(200).send({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${token}`;

    const { channel, resetUrl: generatedUrl } = await sendResetEmail(user.email, resetUrl, user.firstName || "there");

    res.status(200).send({
      message: channel === "email"
        ? "Password reset link sent to your email."
        : "Reset link generated — check the backend console (add SMTP_USER/SMTP_PASS in .env).",
      devMode: channel === "console",
      resetUrl: channel === "console" ? generatedUrl : undefined
    });
  } catch (err) {
    console.error("[PASSWORD] /forgot error:", err);
    res.status(500).send({ message: "Something went wrong. Please try again." });
  }
});

// ── POST /api/password/reset/:token ───────────────────────────────────────────
router.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).send({ message: "Password must be at least 6 characters." });
    }

    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send({ message: "Reset link is invalid or has expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(parseInt(process.env.SALT) || 10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).send({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    console.error("[PASSWORD] /reset error:", err);
    res.status(500).send({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
