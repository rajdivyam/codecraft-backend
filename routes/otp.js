const router = require("express").Router();
const nodemailer = require("nodemailer");
const Otp = require("../models/Otp");
const { User } = require("../models/User");

// ── Helper ─────────────────────────────────────────────────────────────────────
const generate6DigitOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── 1. Twilio — Real SMS (primary) ─────────────────────────────────────────────
const sendSmsViaTwilio = async (phone, otp) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE } = process.env;

  const isConfigured =
    TWILIO_ACCOUNT_SID &&
    TWILIO_ACCOUNT_SID !== "your_sid" &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_AUTH_TOKEN !== "your_token" &&
    TWILIO_PHONE;

  if (!isConfigured) return null;

  try {
    const twilio = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `Your 10xCoders OTP is: ${otp}. Valid for 5 minutes. Do not share it.`,
      from: TWILIO_PHONE,
      to: "+91" + phone,
    });
    console.log(`[OTP] ✅ SMS sent via Twilio to +91${phone}`);
    return { sent: true, channel: "sms" };
  } catch (err) {
    console.error("[OTP] Twilio error:", err.message);
    return null;
  }
};

// ── 2. Nodemailer — Email fallback ─────────────────────────────────────────────
const sendOtpEmail = async (toEmail, otp) => {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS || SMTP_USER === "your_gmail@gmail.com") return null;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700">CodeCraft</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#111827;margin:0 0 8px">Your Sign-In OTP</h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Use this code to sign in. It expires in <strong>5 minutes</strong>.</p>
          <div style="background:#fff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:40px;font-weight:700;letter-spacing:8px;color:#6366f1">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin:0">If you didn't request this, you can safely ignore it.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"10xCoders" <${SMTP_USER}>`,
      to: toEmail,
      subject: `${otp} — Your 10xCoders OTP`,
      html,
    });
    console.log(`[OTP] ✅ Email sent to ${toEmail}`);
    return { sent: true, channel: "email" };
  } catch (err) {
    console.error("[OTP] Email error:", err.message);
    return null;
  }
};

// ── POST /api/otp/send ─────────────────────────────────────────────────────────
router.post("/send", async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);

    if (cleanPhone.length < 10) {
      return res.status(400).send({ message: "Please provide a valid 10-digit phone number." });
    }

    // Find user by mobile number
    const user = await User.findOne({ mobileNumber: cleanPhone });
    if (!user) {
      return res.status(404).send({
        message: "No account linked to this mobile number. Please sign up first or add your mobile number from your Profile page.",
      });
    }

    // Delete old OTP, create new one
    await Otp.deleteMany({ phone: cleanPhone });
    const otp = generate6DigitOtp();
    await Otp.create({ phone: cleanPhone, otp });

    // Try: Twilio (SMS) → Email → Console fallback
    let result = await sendSmsViaTwilio(cleanPhone, otp);

    if (!result) result = await sendOtpEmail(user.email, otp);

    if (!result) {
      console.log("\n" + "=".repeat(50));
      console.log(`[OTP DEV] Phone : +91${cleanPhone}`);
      console.log(`[OTP DEV] Email : ${user.email}`);
      console.log(`[OTP DEV] Code  : ${otp}`);
      console.log("[OTP DEV] Add Twilio credentials in .env for real SMS");
      console.log("=".repeat(50) + "\n");
      result = { sent: true, channel: "console" };
    }

    const maskedPhone = "+91" + cleanPhone.slice(0, 3) + "*****" + cleanPhone.slice(-2);
    const messages = {
      sms:     `OTP sent via SMS to ${maskedPhone}.`,
      email:   `OTP sent to your registered email ${maskEmail(user.email)}.`,
      console: "OTP generated — check the backend console (add Twilio credentials in .env for SMS).",
    };

    res.status(200).send({
      message: messages[result.channel],
      channel: result.channel,
      maskedPhone,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err) {
    console.error("[OTP] /send error:", err);
    res.status(500).send({ message: "Failed to send OTP. Please try again." });
  }
});

// ── POST /api/otp/verify ───────────────────────────────────────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).send({ message: "Phone and OTP are required." });
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const record = await Otp.findOne({ phone: cleanPhone });

    if (!record) {
      return res.status(400).send({ message: "OTP expired or not found. Please request a new one." });
    }
    if (record.otp !== otp.trim()) {
      return res.status(400).send({ message: "Incorrect OTP. Please try again." });
    }

    await Otp.deleteMany({ phone: cleanPhone });

    const user = await User.findOne({ mobileNumber: cleanPhone });
    if (!user) return res.status(404).send({ message: "Account not found." });

    const token = user.generateAuthToken();
    res.status(200).send({ data: token, message: "Signed in successfully." });
  } catch (err) {
    console.error("[OTP] /verify error:", err);
    res.status(500).send({ message: "Verification failed. Please try again." });
  }
});

// Helper
const maskEmail = (email = "") => {
  const [u, domain] = email.split("@");
  if (!u || !domain) return email;
  return u[0] + "*".repeat(Math.max(u.length - 2, 1)) + u.slice(-1) + "@" + domain;
};

module.exports = router;
