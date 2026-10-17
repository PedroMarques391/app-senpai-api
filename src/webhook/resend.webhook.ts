import type { FastifyPluginAsync } from "fastify";



export const resendWebhook: FastifyPluginAsync = async (app) => {
    app.post('', { config: { rawBody: true } }, async (request, reply) => {
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

        await app.mailer.verifyWebhook(
            payloadString,
            {
                id: svix_id,
                timestamp: svix_timestamp,
                signature: svix_signature,
            }
        );

        return reply.status(200).send({
            success: true,
            message: 'Webhook processed',
        });
    });
};