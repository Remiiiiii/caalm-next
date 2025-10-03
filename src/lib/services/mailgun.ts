import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { Models } from 'appwrite';
import { capitalizeRole } from '@/lib/utils';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface MailgunServiceProps {
  user?:
    | (Models.User<Models.Preferences> & {
        accountId?: string;
        fullName?: string;
      })
    | null;
  fullName?: string;
}

class MailgunService {
  private mg: any = null;
  private domain: string;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize Mailgun client in constructor to avoid build-time errors
    this.domain = process.env.MAILGUN_DOMAIN || 'caalmsolutions.com';
  }

  private initializeMailgun() {
    if (!this.initialized) {
      const apiKey = process.env.MAILGUN_API_KEY;
      if (!apiKey) {
        console.error('MAILGUN_API_KEY environment variable is not set');
        throw new Error('MAILGUN_API_KEY environment variable is required');
      }
      
      const mailgun = new Mailgun(FormData);
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey,
        // For EU domains, uncomment and modify the URL:
        // url: 'https://api.eu.mailgun.net'
      });
      
      this.initialized = true;
    }
  }

  async sendEmail(options: EmailOptions) {
    try {
      this.initializeMailgun();
      const { to, subject, text, html, from } = options;

      const fromAddress = from || `Mailgun Sandbox <postmaster@${this.domain}>`;

      const data = await this.mg.messages.create(this.domain, {
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html,
      });

      console.log('Email sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Mailgun error:', error);
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async sendOTPEmail(email: string, otp: string, user: MailgunServiceProps) {
    const subject = 'Your CAALM Solutions Verification Code';
    const fullName = user?.fullName || 'User';
    const firstName = fullName.split(' ')[0];
    const text = `Hello ${firstName},\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nCAALM Solutions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">CAALM Solutions</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hello ${firstName},</h3>
          <p style="color: #666; font-size: 16px;">Your verification code is:</p>
          <div style="background-color: #078FAB; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 6px; letter-spacing: 3px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendWelcomeEmail(email: string, user: MailgunServiceProps) {
    const subject = 'Welcome to CAALM Solutions!';
    const fullName = user?.fullName || 'User';
    const firstName = fullName.split(' ')[0];
    const text = `Hello ${firstName},\n\nWelcome to CAALM Solutions! Your account has been successfully created.\n\nYou can now access all our features and start managing your contracts and documents.\n\nIf you have any questions, please don't hesitate to contact our support team.\n\nBest regards,\nCAALM Solutions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">Welcome to CAALM Solutions!</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hello ${firstName},</h3>
          <p style="color: #666; font-size: 16px;">Welcome to CAALM Solutions! Your account has been successfully created.</p>
          <p style="color: #666; font-size: 16px;">You can now access all our features and start managing your contracts and documents.</p>
          <p style="color: #666; font-size: 16px;">If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendAccountRequestConfirmation(email: string, fullName: string) {
    const subject = 'Account Request Received - CAALM Solutions';
    const text = `Hello ${fullName},\n\nThank you for signing up with CAALM Solutions! Your account request has been received and is currently under review.\n\nOur team will review your request and send you an invitation link to complete your account setup within 24-48 hours.\n\nYou will receive an email with your invitation link once your request has been approved.\n\nIf you have any questions, please don't hesitate to contact our support team.\n\nBest regards,\nCAALM Solutions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">Account Request Received</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hello ${fullName},</h3>
          <p style="color: #666; font-size: 16px;">Thank you for signing up with CAALM Solutions! Your account request has been received and is currently under review.</p>
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #078FAB;">
            <p style="color: #1976d2; font-size: 14px; margin: 0;"><strong>What happens next?</strong></p>
            <ul style="color: #666; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Our team will review your request</li>
              <li>You'll receive an invitation link within 24-48 hours</li>
              <li>Click the link to complete your account setup</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 16px;">If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendInvitationEmail(
    email: string,
    fullName: string,
    inviteLink: string,
    role: string,
    department: string
  ) {
    const capitalizedRole = capitalizeRole(role);
    const subject = "You're invited to join CAALM Solutions";
    const text = `Hello ${fullName},\n\nYou have been invited to join CAALM Solutions as a ${capitalizedRole} in the ${department} department.\n\nClick the link below to accept your invitation and complete your account setup:\n\n${inviteLink}\n\nThis invitation will expire in 7 days.\n\nIf you have any questions, please don't hesitate to contact our support team.\n\nBest regards,\nCAALM Solutions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">You're Invited to Join CAALM Solutions!</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Hello ${fullName},</h3>
          <p style="color: #666; font-size: 16px;">You have been invited to join CAALM Solutions as a <strong>${capitalizedRole}</strong> in the <strong>${department}</strong> department.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #078FAB; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 14px; margin: 0;"><strong>⏰ Important:</strong> This invitation will expire in 7 days.</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #078FAB; font-size: 12px; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${inviteLink}</p>
          
          <p style="color: #666; font-size: 16px;">If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendComingSoonConfirmation(email: string) {
    const subject = 'Welcome to CAALM Solutions - Early Access Confirmed';
    const text = `Thank you for your interest in CAALM Solutions!\n\nWe've added you to our early access list. You'll be among the first to know when we launch our AI-powered contract management platform.\n\nWhat to expect:\n- Early access to the platform\n- Exclusive launch updates\n- Priority support during beta\n\nWe're excited to have you on board!\n\nBest regards,\nCAALM Solutions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">Welcome to Early Access!</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Thank you for your interest!</h3>
          <p style="color: #666; font-size: 16px;">We've added you to our early access list. You'll be among the first to know when we launch our AI-powered contract management platform.</p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #078FAB;">
            <p style="color: #1976d2; font-size: 14px; margin: 0;"><strong>What to expect:</strong></p>
            <ul style="color: #666; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Early access to the platform</li>
              <li>Exclusive launch updates</li>
              <li>Priority support during beta</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 16px;">We're excited to have you on board!</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async notifyTeamOfNewSignup(email: string) {
    const subject = 'New Coming Soon Signup - CAALM Solutions';
    const text = `New early access signup received:\n\nEmail: ${email}\nTimestamp: ${new Date().toISOString()}\n\nThis person has expressed interest in our platform and should be added to the early access list.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #078FAB; text-align: center;">New Early Access Signup</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Signup Details</h3>
          <p style="color: #666; font-size: 16px;"><strong>Email:</strong> ${email}</p>
          <p style="color: #666; font-size: 16px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #666; font-size: 16px;">This person has expressed interest in our platform and should be added to the early access list.</p>
        </div>
      </div>
    `;

    // Send to support email
    return this.sendEmail({
      to: 'support@caalmsolutions.com',
      subject,
      text,
      html,
    });
  }
}

// Export a singleton instance
export const mailgunService = new MailgunService();
export default mailgunService;
