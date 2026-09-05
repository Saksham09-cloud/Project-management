import "dotenv/config";
import nodemailer from "nodemailer";

const createTransporter = () => {
    return nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendEmail = async ({ to, subject, body }) => {
    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to,
            subject,
            html: body,
        });
        console.log(`Email sent successfully to ${to}, messageId: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error?.message || error);
        throw error;
    }
};

export default sendEmail;