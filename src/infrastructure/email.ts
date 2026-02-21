import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private config: EmailConfig | null = null;
    private enabled: boolean = false;

    /**
     * Initialize email service with configuration
     */
    async initialize(): Promise<void> {
        try {
            const emailConfig = this.buildConfig();
            if (!emailConfig) {
                logger.warn('Email service disabled - missing configuration');
                this.enabled = false;
                return;
            }

            this.config = emailConfig;
            this.transporter = nodemailer.createTransport(emailConfig);

            // Verify connection
            await this.transporter.verify();
            this.enabled = true;
            logger.info(
                { emailFrom: emailConfig.from },
                '✉️ Email service initialized successfully'
            );
        } catch (error: any) {
            logger.error(
                { error: error.message },
                '❌ Failed to initialize email service'
            );
            this.enabled = false;
        }
    }

    /**
     * Build email configuration from environment variables
     */
    private buildConfig(): EmailConfig | null {
        const host = process.env.EMAIL_HOST;
        const port = parseInt(process.env.EMAIL_PORT || '587');
        const secure = process.env.EMAIL_SECURE === 'true';
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASSWORD;
        const from = process.env.EMAIL_FROM;

        if (!host || !user || !pass || !from) {
            return null;
        }

        return {
            host,
            port,
            secure,
            auth: { user, pass },
            from,
        };
    }

    /**
     * Send email
     */
    async sendEmail(options: SendEmailOptions): Promise<boolean> {
        if (!this.enabled || !this.transporter) {
            logger.warn(
                { to: options.to },
                'Email service not enabled, skipping send'
            );
            return false;
        }

        try {
            await this.transporter.sendMail({
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html,
            });

            logger.info(
                { to: options.to, subject: options.subject },
                '✉️ Email sent successfully'
            );
            return true;
        } catch (error: any) {
            logger.error(
                { to: options.to, error: error.message },
                '❌ Failed to send email'
            );
            return false;
        }
    }

    /**
     * Send OTP email for deletion confirmation
     */
    async sendDeletionOtpEmail(
        emailAddress: string,
        customerName: string,
        otp: string
    ): Promise<boolean> {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ Data Deletion Request</h2>
          <p style="margin: 0; color: #6c757d; font-size: 14px;">Time-sensitive verification required</p>
        </div>

        <p>Hello ${customerName},</p>

        <p>We received a request to permanently delete all your data from our system, including:</p>
        <ul style="color: #495057; line-height: 1.8;">
          <li>Invoices and billing information</li>
          <li>Ledger entries and financial records</li>
          <li>Reminders and schedules</li>
          <li>Messages and conversation history</li>
        </ul>

        <p><strong>This action is permanent and cannot be undone.</strong></p>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404;">
            <strong>Your deletion OTP:</strong><br>
            <span style="font-size: 32px; font-weight: bold; color: #dc3545; font-family: 'Courier New', monospace; letter-spacing: 2px;">
              ${otp}
            </span>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #856404;">
            This code expires in 15 minutes.
          </p>
        </div>

        <p style="background-color: #e7d4f5; border-left: 4px solid #6f42c1; padding: 15px; border-radius: 4px; color: #495057;">
          <strong>Next Step:</strong><br>
          To confirm deletion, say the 6-digit OTP code during your voice conversation with the system.
        </p>

        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
          If you did not request this deletion, you can safely ignore this email. Your data will remain unchanged.
        </p>

        <div style="border-top: 1px solid #dee2e6; margin-top: 30px; padding-top: 15px; color: #6c757d; font-size: 12px;">
          <p style="margin: 5px 0;">© 2026 Execora. All rights reserved.</p>
          <p style="margin: 5px 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

        return this.sendEmail({
            to: emailAddress,
            subject: `⚠️ Confirm Data Deletion - OTP: ${otp}`,
            html,
        });
    }

    /**
     * Send admin-only deletion OTP email
     */
    async sendAdminDeletionOtpEmail(
        adminEmail: string,
        customerName: string,
        otp: string
    ): Promise<boolean> {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #722c2c; padding: 20px; border-radius: 8px; margin-bottom: 20px; color: white;">
          <h2 style="color: #ffffff; margin: 0 0 10px 0;">🔐 ADMIN ONLY: Customer Data Deletion OTP</h2>
          <p style="margin: 0; font-size: 14px; color: #ffb3b3;">Restricted access - Admin verification required</p>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ff6b6b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #721c24; font-weight: bold;">⚠️ CRITICAL OPERATION</p>
          <p style="margin: 5px 0 0 0; color: #721c24; font-size: 13px;">
            This email is only for authorized administrators. Only admins can delete customer data.
          </p>
        </div>

        <p style="color: #333;">Hello Admin,</p>

        <p style="color: #333;">You are about to delete all data for customer: <strong>${customerName}</strong></p>

        <p style="color: #333;">Data to be permanently deleted:</p>
        <ul style="color: #495057; line-height: 1.8;">
          <li>All invoices and billing records</li>
          <li>All ledger entries and financial history</li>
          <li>All reminders and scheduled tasks</li>
          <li>All messages and communication logs</li>
          <li>All conversation records</li>
        </ul>

        <p style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px; color: #721c24;">
          <strong>⚠️ WARNING: This action is PERMANENT and CANNOT BE UNDONE!</strong>
        </p>

        <div style="background-color: #e7d4f5; border-left: 4px solid #6f42c1; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #5a32a3; font-weight: bold;">
            Your Admin Verification OTP:
          </p>
          <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #6f42c1; font-family: 'Courier New', monospace; letter-spacing: 3px; text-align: center;">
            ${otp}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #5a32a3;">
            This OTP expires in 15 minutes. If you did not initiate this action, please contact security immediately.
          </p>
        </div>

        <p style="color: #333; background-color: #e8f4f8; padding: 15px; border-radius: 4px;">
          <strong>Next Step:</strong><br>
          Use this OTP to complete the deletion verification in the admin system.
        </p>

        <div style="background-color: #f0f0f0; padding: 15px; margin-top: 20px; border-radius: 4px; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;"><strong>Security Notice:</strong> This is a restricted operation. Only users with admin credentials should have received this email.</p>
          <p style="margin: 5px 0;">Do not share this OTP with anyone.</p>
          <p style="margin: 5px 0;">© 2026 Execora. Admin Restricted. All rights reserved.</p>
        </div>
      </div>
    `;

        return this.sendEmail({
            to: adminEmail,
            subject: `🔐 [ADMIN] Customer Deletion OTP - ${customerName} - ${otp}`,
            html,
        });
    }

    /**
     * Send confirmation email after successful deletion
     */
    async sendDeletionConfirmationEmail(
        emailAddress: string,
        customerName: string,
        recordCount: number
    ): Promise<boolean> {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #155724; margin: 0 0 10px 0;">✅ Data Deletion Complete</h2>
          <p style="margin: 0; color: #155724; font-size: 14px;">Your request has been processed</p>
        </div>

        <p>Hello ${customerName},</p>

        <p>Your data deletion request has been successfully processed on <strong>${new Date().toLocaleString()}</strong>.</p>

        <p>The following records have been permanently deleted:</p>
        <ul style="color: #495057; line-height: 1.8;">
          <li>Invoices</li>
          <li>Ledger entries</li>
          <li>Reminders</li>
          <li>Messages</li>
          <li>Conversation records</li>
        </ul>

        <p style="background-color: #cce5ff; border-left: 4px solid #0d6efd; padding: 15px; border-radius: 4px; color: #0c5460;">
          <strong>Total records deleted: ${recordCount}</strong>
        </p>

        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
          If you have any questions or believe this was done in error, please contact our support team.
        </p>

        <div style="border-top: 1px solid #dee2e6; margin-top: 30px; padding-top: 15px; color: #6c757d; font-size: 12px;">
          <p style="margin: 5px 0;">© 2026 Execora. All rights reserved.</p>
        </div>
      </div>
    `;

        return this.sendEmail({
            to: emailAddress,
            subject: '✅ Your data has been successfully deleted',
            html,
        });
    }

    /**
     * Check if email service is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

export const emailService = new EmailService();
