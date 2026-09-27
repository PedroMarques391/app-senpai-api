import type { FastifyPluginAsync } from "fastify";



export const resendWebhook: FastifyPluginAsync = async (app) => {
    app.post('', { config: { rawBody: true } }, async (request, reply) => {
        console.log('[Resend Webhook] Request received');
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

        const payloadString = request.rawBody as string;

        const event = await app.mailer.verifyWebhook(
            payloadString,
            {
                id: svix_id,
                timestamp: svix_timestamp,
                signature: svix_signature,
            }
        )

        console.log(event)

        if (event.type === 'email.clicked' || event.type === 'email.complained') {
            console.log(`[Resend Webhook] Event matches target: ${event.type}`);
            console.log('[Resend Webhook] Event data:', JSON.stringify(event.data, null, 2));
            // Add custom logic here for handling clicked or complained events
        } else {
            console.log(`[Resend Webhook] Ignored event type: ${event.type}`);
        }

        return reply.status(200).send({
            success: true,
            message: 'Webhook processed',
        });
    });
};