import type { CreatePackDto } from "@/dtos";
import type { FastifyInstance } from "fastify";
import { PackRepository } from "@/repositories";
import { PackService } from "@/services";

const packRepository = new PackRepository();
const packService = new PackService(packRepository);

export async function packRoutes(app: FastifyInstance) {
    app.get("/", async (request, reply) => {
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    })

    app.post<{ Body: CreatePackDto }>("/create", async (request, reply) => {
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    })


}