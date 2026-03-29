import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.pass',
    },
});

export async function sendActivationEmail(to: string, token: string, baseUrl: string) {
    const activationLink = `${baseUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@nats.com',
        to,
        subject: 'Activate Your NATS Account',
        html: `
            <h1>Welcome to NATS!</h1>
            <p>Please activate your account by clicking the link below:</p>
            <a href="${activationLink}">Activate my account</a>
            <p>Or copy and paste this link in your browser: <br> ${activationLink}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Activation email sent: %s', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
export async function sendResetPasswordEmail(to: string, token: string, baseUrl: string) {
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@nats.com',
        to,
        subject: 'Reset Your NATS Password',
        html: `
            <h1>Reset Your Password</h1>
            <p>You requested a password reset for your NATS account. Click the link below to set a new password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>Or copy and paste this link in your browser: <br> ${resetLink}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent: %s', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error };
    }
}
