import type { FastifyPluginAsync } from "fastify";
import { Webhook } from "svix";

export const resendWebhook: FastifyPluginAsync = async (app) => {
    app.post('/', async (request, reply) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;

        if (!secret) {
            throw new Error('Webhook secret not configured');
        }

        const svix_id = request.headers['svix-id'] as string;
        const svix_timestamp = request.headers['svix-timestamp'] as string;
        const svix_signature = request.headers['svix-signature'] as string;

        if (!svix_id || !svix_timestamp || !svix_signature) {
            return reply.status(400).send({
                success: false,
                message: 'Missing svix headers',
            });
        }

        const wh = new Webhook(secret);

        // If you don't have fastify-raw-body, JSON.stringify might invalidate the signature
        // Make sure to register fastify-raw-body and use request.rawBody here.
        const payloadString = (request as any).rawBody || JSON.stringify(request.body);

        const event = wh.verify(payloadString, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as any;

        console.log(`[Resend Webhook] Event received: ${event.type}`);
        console.log('[Resend Webhook] Event data:', JSON.stringify(event.data, null, 2));

        return reply.status(200).send({
            success: true,
            message: 'Webhook processed',
        });
    });
};