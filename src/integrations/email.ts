import nodemailer from 'nodemailer';
import { config } from '../config';

export interface SendMailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure, // true for 465, false for other ports
            auth: {
                user: config.email.user,
                pass: config.email.pass,
            },
        });
    }

    async sendMail(options: SendMailOptions) {
        const mailOptions = {
            from: config.email.from,
            ...options,
        };
        return this.transporter.sendMail(mailOptions);
    }
}

export const emailService = new EmailService();
