# Mohit Portfolio - Node.js & MongoDB Backend API

Backend REST API for Mohit Yadav's Developer Portfolio.

## Features
- **Database**: MongoDB Atlas Cloud Integration (`portfolio` database)
- **Instant Email Alerts**: Gmail SMTP via Nodemailer
- **Strict Validation**: RFC 5322 regex + Disposable domain blocklist
- **Rate Limiting**: Anti-spam protection
- **CORS Enabled**: Accepts requests from GitHub Pages frontend

## Environment Variables
Set these on Render.com:
- `MONGODB_URI`
- `EMAIL_USER`
- `EMAIL_PASS`
- `NOTIFY_EMAIL`
