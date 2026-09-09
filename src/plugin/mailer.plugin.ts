// plugins/mailer.ts
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

async function mailerPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log("✅ Server is ready to take our messages");
    } catch (err) {
        console.error("❌ Server is not ready to take our messages", err);
        process.exit(1);
    }

    fastify.decorate('mailer', transporter);
}

export default fp(mailerPlugin);