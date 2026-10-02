import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Message } from './models/Message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Local JSON backup path
const localDataDir = path.join(__dirname, 'data');
const localDataFile = path.join(localDataDir, 'messages.json');

// Ensure local data directory exists
if (!fs.existsSync(localDataDir)) {
  fs.mkdirSync(localDataDir, { recursive: true });
}
if (!fs.existsSync(localDataFile)) {
  fs.writeFileSync(localDataFile, JSON.stringify([], null, 2), 'utf8');
}

// Helpers for local JSON database fallback
function getLocalMessages() {
  try {
    const raw = fs.readFileSync(localDataFile, 'utf8');
    return JSON.parse(raw) || [];
  } catch (err) {
    return [];
  }
}

function saveLocalMessage(msg) {
  const list = getLocalMessages();
  list.unshift(msg);
  fs.writeFileSync(localDataFile, JSON.stringify(list, null, 2), 'utf8');
  return msg;
}

// Helper: Send Instant Email Notification via Nodemailer
async function sendNotificationEmail({ name, email, subject, message }) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const notifyEmail = process.env.NOTIFY_EMAIL || emailUser || 'yadavmohit11835@gmail.com';

  if (!emailUser || !emailPass) {
    console.log('[EMAIL] Notice: EMAIL_USER or EMAIL_PASS not set in server/.env. Email alert skipped.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"Mohit Portfolio" <${emailUser}>`,
      to: notifyEmail,
      replyTo: email,
      subject: `📬 [Portfolio Inquiry] ${subject} - from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">New Message from Portfolio Website!</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 110px;"><strong>Sender Name:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Sender Email:</strong></td>
              <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none; font-weight: bold;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${subject}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-left: 4px solid #06b6d4; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #475569; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0; font-weight: bold;">Message Content:</p>
            <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
            <a href="mailto:${email}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 13px;">Click to Reply to ${name}</a>
            <p style="font-size: 11px; color: #94a3b8; margin: 12px 0 0 0;">Tip: You can also hit 'Reply' directly to this email in your inbox.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Notification sent to ${notifyEmail} (ID: ${info.messageId})`);
  } catch (err) {
    console.error('[EMAIL ERROR] Failed to send email alert:', err.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/', async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const count = isMongoConnected ? await Message.countDocuments() : getLocalMessages().length;

  res.json({
    status: 'online',
    service: 'Mohit Yadav Portfolio Backend API',
    database: isMongoConnected ? 'MongoDB Atlas (Connected)' : 'Local File Storage (MongoDB URI Pending)',
    emailNotifications: process.env.EMAIL_USER && process.env.EMAIL_PASS ? 'Active (Nodemailer)' : 'Disabled (Pending credentials)',
    totalMessages: count,
    timestamp: new Date().toISOString()
  });
});

// Disallowed fake, disposable, and test email domains
const BLOCKED_DOMAINS = [
  'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com',
  'throwawaymail.com', 'fake.com', 'dummy.com', 'example.com', 'test.com',
  'trashmail.com', 'yopmail.com', 'sharklasers.com', 'dispostable.com', 'asdf.com'
];

function isStrictlyValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!emailRegex.test(clean) || clean.includes('..')) return false;

  const domain = clean.split('@')[1];
  if (!domain || BLOCKED_DOMAINS.includes(domain)) return false;

  return true;
}

// In-memory rate limiting map: Max 5 messages per 10 minutes per IP
const rateLimitMap = new Map();

// POST /api/contact - Receive, save to MongoDB & trigger email alert
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    // Rate Limiting Check
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const ipData = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + windowMs };

    if (now > ipData.resetTime) {
      ipData.count = 0;
      ipData.resetTime = now + windowMs;
    }

    if (ipData.count >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many messages sent from this connection. Please wait 10 minutes before submitting again.'
      });
    }

    // Required Fields Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: name, email, subject, message'
      });
    }

    // Strict Email Validation
    if (!isStrictlyValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid, active email address so I can reply back to you.'
      });
    }

    // Name & Subject length validation
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters long'
      });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Subject must be at least 3 characters long'
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 10 characters long'
      });
    }

    // Increment rate limit count
    ipData.count += 1;
    rateLimitMap.set(clientIp, ipData);

    const isMongoConnected = mongoose.connection.readyState === 1;

    let savedData;
    if (isMongoConnected) {
      // Save directly to MongoDB
      savedData = await Message.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
      });
      console.log(`[MONGODB] Saved message from ${name} (${email}): "${subject}"`);
    } else {
      // Save to local database fallback
      savedData = saveLocalMessage({
        id: 'local_' + Date.now(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        createdAt: new Date().toISOString()
      });
      console.log(`[LOCAL DB] Saved message from ${name} (${email}): "${subject}"`);
    }

    // Trigger instant email notification asynchronously (non-blocking)
    sendNotificationEmail({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim()
    }).catch(err => console.error('[EMAIL TRIGGER ERROR]', err));

    return res.status(201).json({
      success: true,
      message: isMongoConnected
        ? 'Thank you! Your message has been saved in MongoDB Atlas.'
        : 'Thank you! Your message has been received and saved successfully.',
      storage: isMongoConnected ? 'mongodb' : 'local_storage',
      data: {
        id: savedData._id || savedData.id,
        createdAt: savedData.createdAt
      }
    });
  } catch (error) {
    console.error('Error saving message:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save message. Please try again or email directly.'
    });
  }
});

// GET /api/contact/messages - View all messages (Sorted by newest first)
app.get('/api/contact/messages', async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    let messages = [];

    if (isMongoConnected) {
      messages = await Message.find().sort({ createdAt: -1 });
    } else {
      messages = getLocalMessages();
    }

    return res.json({
      success: true,
      source: isMongoConnected ? 'MongoDB Atlas' : 'Local Storage',
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages'
    });
  }
});

// Connect to MongoDB & Start Server
async function startServer() {
  if (!MONGODB_URI) {
    console.log('\n======================================================');
    console.log('📌 NOTE: MONGODB_URI is not set in server/.env yet.');
    console.log('======================================================\n');
  } else {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Successfully connected to MongoDB Atlas!');
    } catch (err) {
      console.error('❌ MongoDB Connection Error:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Portfolio Backend running on http://localhost:${PORT}`);
    console.log(`📡 Contact API: http://localhost:${PORT}/api/contact`);
    console.log(`📬 View Messages: http://localhost:${PORT}/api/contact/messages\n`);
  });
}

startServer();
