import type { FastifyPluginAsync } from "fastify";

export const resendWebhook: FastifyPluginAsync = async (app) => {
    app.post('/', async (request, reply) => {
        console.log(request.body);
        return reply.status(200).send({
            success: true,
            message: 'Resend webhook received',
        });
    })
}