import type { CreatePackDto } from "@/dtos";
import type { FastifyInstance } from "fastify";
import { PackRepository } from "@/repositories";
import { PackService } from "@/services";
import { ObjectId } from "mongodb";

const packRepository = new PackRepository();
const packService = new PackService(packRepository);

export async function packRoutes(app: FastifyInstance) {
    app.get("/", async (request, reply) => {
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    })

    app.post<{ Body: CreatePackDto }>("/create", async (request, reply) => {
        const user = request.user
        const idToObjectId = new ObjectId(user._id)
        const pack = await packService.create(idToObjectId, user.userName, request.body)
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    })
    app.get("/public", async (request, reply) => {
        const packs = await packService.findAll()
        return reply.status(200).send({
            packs
        });
    })


}