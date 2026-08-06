import type { FastifyInstance } from "fastify";

export async function packRoutes(app: FastifyInstance) {
    app.get("/", async (request, reply) => {
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    })
}