import nodemailer from 'nodemailer';
import env from '../config/env';
import logger from '../utils/logger';

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        this.initializeTransporter();
    }

    /**
     * Initialize nodemailer transporter with SMTP configuration
     * Falls back to logging emails if SMTP not configured
     * @private
     */
    private initializeTransporter() {
        // Check if email configuration exists
        if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
            logger.warn('Email configuration not found. Email notifications will be logged only.');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: env.SMTP_PORT === 465, // true for 465, false for other ports
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                },
            });

            logger.info('Email transporter initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
        }
    }

    /**
     * Send email via SMTP or log if transporter not configured
     * @param options - Email options (to, subject, text, html)
     * @throws Error if email sending fails
     */
    async sendEmail(options: EmailOptions): Promise<void> {
        if (!this.transporter) {
            // Fallback: Log email instead of sending
            logger.info('[EMAIL NOTIFICATION]', {
                to: options.to,
                subject: options.subject,
                text: options.text,
            });
            return;
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html || options.text,
            });

            logger.info('Email sent successfully', {
                to: options.to,
                subject: options.subject,
                messageId: info.messageId,
            });
        } catch (error) {
            logger.error('Failed to send email', {
                to: options.to,
                subject: options.subject,
                error,
            });
            throw error;
        }
    }

    /**
     * Send thank you notification email at donation milestones
     * Includes personalized message, emoji, and milestone celebration
     * @param email - Recipient email address
     * @param beneficiaryName - Name of the beneficiary receiving donations
     * @param firstName - First name of the donor
     * @param donationCount - Total donations from donor to this beneficiary
     */
    async sendThankYouEmail(email: string, beneficiatyName:string, firstName: string, donationCount: number): Promise<void> {
        const subject = `Thank You for Your ${this.getOrdinal(donationCount)} Donation! 🎉`;
        
        const message = this.getThankYouMessage(donationCount, firstName);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .emoji { font-size: 48px; margin-bottom: 20px; }
                    .milestone { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="emoji">${this.getEmojiForMilestone(donationCount)}</div>
                        <h1>Thank You, ${firstName}, from ${beneficiatyName}!</h1>
                    </div>
                    <div class="content">
                        <div class="milestone">
                            <h2>${this.getMilestoneTitle(donationCount)}</h2>
                            <p>${message}</p>
                        </div>
                        <p>Your generosity and kindness make a real difference in people's lives. Every donation you make helps someone in need and spreads joy in our community.</p>
                        <p>Keep up the amazing work! 💪</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from your Donation Platform.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject,
            text: message,
            html,
        });
    }

    /**
     * Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
     * @param n - Number to convert
     * @returns Number with ordinal suffix
     * @private
     */
    private getOrdinal(n: number): string {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    /**
     * Get emoji for milestone donation count
     * @param count - Donation count
     * @returns Emoji character for milestone
     * @private
     */
    private getEmojiForMilestone(count: number): string {
        const emojis: Record<number, string> = {
            2: '🎉',
            5: '🌟',
            10: '🏆',
            25: '💎',
            50: '🎊',
            100: '👑',
        };
        return emojis[count] || '🎉';
    }

    /**
     * Get milestone title based on donation count
     * @param count - Donation count
     * @returns Milestone title string
     * @private
     */
    private getMilestoneTitle(count: number): string {
        const titles: Record<number, string> = {
            2: 'Your 2nd Donation Milestone!',
            5: '5 Donations - You\'re a Star!',
            10: '10 Donations - Amazing Achievement!',
            25: '25 Donations - Incredible Milestone!',
            50: '50 Donations - You\'re a Champion!',
            100: '100 Donations - Legendary Status!',
        };
        return titles[count] || `${count} Donations Milestone!`;
    }

    /**
     * Get personalized thank you message based on donation count
     * @param donationCount - Total donations to this beneficiary
     * @param firstName - Donor's first name
     * @returns Personalized thank you message
     * @private
     */
    private getThankYouMessage(donationCount: number, firstName: string): string {
        const messages: Record<number, string> = {
            2: `${firstName}, thank you for your 2nd donation! Your generosity is truly appreciated.`,
            5: `Wow ${firstName}! 5 donations already! You're making a real difference in people's lives.`,
            10: `Amazing, ${firstName}! You've reached 10 donations. You're a star donor in our community!`,
            25: `Incredible, ${firstName}! 25 donations! Your kindness knows no bounds. Thank you for your continued support.`,
            50: `Phenomenal, ${firstName}! 50 donations! You're a champion of giving and an inspiration to others.`,
            100: `Legendary, ${firstName}! 100 donations! You're an inspiration to us all. Your impact is immeasurable.`,
        };

        return messages[donationCount] || `Thank you for your ${donationCount} donations, ${firstName}! You're amazing!`;
    }
}

// Export singleton instance
export const emailService = new EmailService();
