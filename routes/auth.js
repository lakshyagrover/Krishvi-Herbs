const express = require('express');
const router = express.Router();
const User = require('../models/User');

const defaultAdminEmails = ['admin@krishviherbs.com', 'groverlakshya123@gmail.com'];
const configuredAdminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);
const adminEmails = new Set([...defaultAdminEmails, ...configuredAdminEmails]);

function isAdminEmail(email) {
  return adminEmails.has(String(email || '').trim().toLowerCase());
}

function applyRoleDefaults(user, email) {
  if (isAdminEmail(email)) {
    user.role = 'admin';
    if (!user.name || !user.name.trim()) {
      user.name = 'Admin';
    }
    return;
  }

  user.role = 'user';
}

function buildOtpEmail({ email, otp, userName }) {
  const greetingName = (userName && userName.trim()) || email.split('@')[0];

  return {
    subject: 'Your Krishvi Herbs Login Code',
    text: [
      `Hello ${greetingName},`,
      '',
      'Your Krishvi Herbs login code is:',
      otp,
      '',
      'This code will stay active for 5 minutes.',
      'If you did not request this login, you can safely ignore this email.',
      '',
      'With warmth,',
      'Krishvi Herbs'
    ].join('\n'),
    html: `
      <div style="margin:0;padding:32px 16px;background:#faf8f4;font-family:Inter,Arial,sans-serif;color:#2c2c2c;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(26,58,10,0.12);border:1px solid #ece3d0;">
          <div style="padding:32px 36px;background:linear-gradient(135deg,#1a3a0a 0%,#3a6b1e 55%,#5a9236 100%);color:#ffffff;">
            <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">
              Secure Sign In
            </div>
            <h1 style="margin:18px 0 8px;font-family:'Playfair Display',Georgia,serif;font-size:34px;line-height:1.15;font-weight:700;">
              Krishvi Herbs
            </h1>
            <p style="margin:0;font-size:16px;line-height:1.7;color:rgba(255,255,255,0.86);">
              Natural care, gentle rituals, and a quick secure login for your next visit.
            </p>
          </div>

          <div style="padding:36px;">
            <p style="margin:0 0 12px;font-size:17px;line-height:1.7;">
              Hello <strong>${greetingName}</strong>,
            </p>
            <p style="margin:0 0 22px;font-size:16px;line-height:1.8;color:#5c4a2a;">
              We are happy to welcome you back. Use the secure code below to continue your journey with Krishvi Herbs.
            </p>

            <div style="margin:28px 0;padding:24px;border-radius:20px;background:linear-gradient(135deg,#f0f9eb 0%,#f5f0e8 100%);border:1px solid #e0d2b8;text-align:center;">
              <div style="margin-bottom:10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">
                Your Login OTP
              </div>
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:42px;line-height:1;letter-spacing:10px;color:#1a3a0a;font-weight:700;">
                ${otp}
              </div>
            </div>

            <div style="padding:18px 20px;border-left:4px solid #c8a951;background:#faf8f4;border-radius:14px;margin-bottom:24px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#666;">
                This code is valid for <strong>5 minutes</strong>. If you did not request it, you can safely ignore this email.
              </p>
            </div>

            <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#666;">
              Thank you for choosing herbal care rooted in warmth, simplicity, and tradition.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#2d5016;">
              With warmth,<br>
              <strong>Team Krishvi Herbs</strong>
            </p>
          </div>

          <div style="padding:20px 36px;background:#f5f0e8;border-top:1px solid #ece3d0;color:#8b7355;font-size:13px;line-height:1.7;">
            This is an automated sign-in email from Krishvi Herbs. Please do not share your OTP with anyone.
          </div>
        </div>
      </div>
    `
  };
}

// ─── Setup Nodemailer (Mock or Real) ──────────────────────
const nodemailer = require('nodemailer');
const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@krishviherbs.com';
const senderName = process.env.SMTP_FROM_NAME || 'Krishvi Herbs';
// Configure your SMTP credentials here, or use ethereal for testing
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: smtpPort,
  secure: smtpPort === 465,   // true for port 465 (SSL), false for 587 (STARTTLS)
  family: 4,                  // force IPv4 — Render doesn't support outbound IPv6
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ─── Send OTP ────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email });
    }
    applyRoleDefaults(user, email);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Attempt to send email, but don't fail if SMTP is missing
    if (process.env.SMTP_USER) {
      const emailContent = buildOtpEmail({ email, otp, userName: user.name });
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    }

    res.json({ success: true, message: 'OTP sent successfully. Please check your email.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// ─── Verify OTP ──────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please send OTP first.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please resend.' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    applyRoleDefaults(user, email);
    await user.save();

    // Set session (include role for authorization)
    req.session.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
      mobile: user.mobile || '',
      role: user.role || 'user'
    };

    // Determine redirect based on role
    let redirectUrl = '/';
    if (user.role === 'admin') redirectUrl = '/admin';

    res.json({ success: true, message: 'Login successful!', user: req.session.user, redirectUrl });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// ─── Check Auth Status ──────────────────────────────────
router.get('/status', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
