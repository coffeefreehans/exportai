import nodemailer from 'nodemailer';
import { env } from '../config/env';

let etherealAccount: { user: string; pass: string } | null = null;

/**
 * Create a Nodemailer transporter based on the MAIL_PROVIDER env var.
 * - ethereal: Uses Ethereal Email for development (free, disposable)
 * - resend: Uses Resend API for production
 */
async function createTransporter() {
  if (env.MAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: env.RESEND_API_KEY,
      },
    });
  }

  // Default to Ethereal for development
  if (!etherealAccount) {
    const testAccount = await nodemailer.createTestAccount();
    etherealAccount = { user: testAccount.user, pass: testAccount.pass };
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  });
}

/**
 * Send a password reset email.
 * The resetToken is the plain token that the user will use in the URL.
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.WEB_URL}/reset-password?token=${resetToken}`;

  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: `"ExportAI" <${env.MAIL_FROM}>`,
    to: email,
    subject: 'ExportAI - 重置您的密码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">重置您的密码</h2>
        <p>您收到了这封邮件，是因为我们收到了您重置密码的请求。</p>
        <p>请点击下方按钮重置您的密码。此链接将在 30 分钟后过期。</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          重置密码
        </a>
        <p style="color: #888; font-size: 12px;">如果您没有请求重置密码，请忽略此邮件。</p>
      </div>
    `,
  });

  // Log Ethereal URL in development for testing
  if (env.MAIL_PROVIDER === 'ethereal') {
    console.log(`[ExportAI] Password reset email sent to ${email}`);
    console.log(`[ExportAI] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

/**
 * Send a welcome email to newly registered users.
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: `"ExportAI" <${env.MAIL_FROM}>`,
    to: email,
    subject: 'ExportAI - 欢迎加入！',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">欢迎加入 ExportAI！</h2>
        <p>感谢您注册 ExportAI，您的 AI 对话导出助手。</p>
        <p>现在您可以：</p>
        <ul>
          <li>一键导出 AI 对话为 9 种格式</li>
          <li>支持 ChatGPT、Claude、Gemini 等 9 大平台</li>
          <li>自动导出功能，对话变动自动保存</li>
        </ul>
        <a href="${env.WEB_URL}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          开始使用
        </a>
      </div>
    `,
  });

  if (env.MAIL_PROVIDER === 'ethereal') {
    console.log(`[ExportAI] Welcome email sent to ${email}`);
    console.log(`[ExportAI] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
