const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Email service for sending emails
 */
class EmailService {
  constructor() {
    // Check if email sending is enabled
    this.enabled = config.email && config.email.enabled;
    
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });
      
      this.from = config.email.from || '"Simmer App" <noreply@simmer.app>';
      this.baseUrl = config.baseUrl || 'http://simmer.home';
      
      logger.info('Email service initialized');
    } else {
      logger.warn('Email service disabled. Check configuration.');
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<boolean>} Success
   */
  async sendEmail(options) {
    if (!this.enabled) {
      logger.warn(`Email sending disabled. Would have sent: ${JSON.stringify(options)}`);
      return false;
    }
    
    try {
      const { to, subject, text, html } = options;
      
      const mailOptions = {
        from: this.from,
        to,
        subject,
        text,
        html
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error sending email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send email verification
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {string} token - Verification token
   * @returns {Promise<boolean>} Success
   */
  async sendEmailVerification(to, name, token) {
    const verificationUrl = `${this.baseUrl}/verify-email/${token}`;
    
    const subject = 'Verify Your Email Address';
    
    const text = `
Hello ${name},

Thank you for registering with Simmer. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.

Best regards,
The Simmer Team
    `;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email Address</h2>
    <p>Hello ${name},</p>
    <p>Thank you for registering with Simmer. Please verify your email address by clicking the button below:</p>
    <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
    <p>Or copy and paste this link in your browser: <br>${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
    <p>If you did not create an account, you can safely ignore this email.</p>
    <div class="footer">
      <p>Best regards,<br>The Simmer Team</p>
    </div>
  </div>
</body>
</html>
    `;
    
    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {string} token - Reset token
   * @returns {Promise<boolean>} Success
   */
  async sendPasswordReset(to, name, token) {
    const resetUrl = `${this.baseUrl}/reset-password/${token}`;
    
    const subject = 'Reset Your Password';
    
    const text = `
Hello ${name},

You have requested to reset your password. Please click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email.

Best regards,
The Simmer Team
    `;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>Hello ${name},</p>
    <p>You have requested to reset your password. Please click the button below to create a new password:</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <p>Or copy and paste this link in your browser: <br>${resetUrl}</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
    <div class="footer">
      <p>Best regards,<br>The Simmer Team</p>
    </div>
  </div>
</body>
</html>
    `;
    
    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send login notification
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @param {Object} loginInfo - Login information
   * @returns {Promise<boolean>} Success
   */
  async sendLoginNotification(to, name, loginInfo) {
    const { time, ipAddress, deviceInfo, location } = loginInfo;
    
    const subject = 'New Login to Your Account';
    
    const text = `
Hello ${name},

We detected a new login to your Simmer account.

Time: ${time}
IP Address: ${ipAddress}
Device: ${deviceInfo}
${location ? `Location: ${location}` : ''}

If this was you, you can ignore this email.

If you didn't log in at this time, please reset your password immediately.

Best regards,
The Simmer Team
    `;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { padding: 15px; background-color: #f8d7da; color: #721c24; border-radius: 4px; margin-bottom: 20px; }
    .info { background-color: #f5f5f5; padding: 15px; border-radius: 4px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <h2>New Login to Your Account</h2>
    <p>Hello ${name},</p>
    <p>We detected a new login to your Simmer account.</p>
    
    <div class="info">
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>IP Address:</strong> ${ipAddress}</p>
      <p><strong>Device:</strong> ${deviceInfo}</p>
      ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
    </div>
    
    <p>If this was you, you can ignore this email.</p>
    
    <div class="alert">
      <p>If you didn't log in at this time, please reset your password immediately.</p>
      <p><a href="${this.baseUrl}/reset-password" class="button">Reset Password</a></p>
    </div>
    
    <div class="footer">
      <p>Best regards,<br>The Simmer Team</p>
    </div>
  </div>
</body>
</html>
    `;
    
    return this.sendEmail({ to, subject, text, html });
  }
}

module.exports = new EmailService(); 