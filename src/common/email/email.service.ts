import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing');
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL;
    const fromEmail = process.env.EMAIL_FROM;

    if (!frontendUrl || !fromEmail) {
      throw new Error('FRONTEND_URL or EMAIL_FROM not configured');
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Reset your password',
        html: `
          <p>You requested a password reset.</p>
          <p>
            <a href="${resetUrl}">
              Click here to reset password
            </a>
          </p>
          <p>This link expires in 15 minutes.</p>
        `,
      });
    } catch (error) {
      console.error('Resend email failed:', error);
      throw new InternalServerErrorException('Failed to send reset email');
    }
  }
}
