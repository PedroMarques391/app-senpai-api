import type { CreatePackDto } from "@/dtos";
import { PackRepository } from "@/repositories";
import { PackService } from "@/services";
import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";

const packRepository = new PackRepository();
const packService = new PackService(packRepository);

export async function packRoutes(app: FastifyInstance) {
    app.get("/", async (request, reply) => {
        return reply.status(200).send({
            message: "Hello World from packs",
        });
    });

    app.post<{ Body: CreatePackDto }>("/create", async (request, reply) => {
        try {
            const user = request.user;

            const idToObjectId = new ObjectId(user._id);
            const pack = await packService.create(
                idToObjectId,
                user.userName,
                request.body,
            );

            if (!pack) {
                return reply.status(400).send({
                    success: false,
                    message: "Falha ao criar o pacote de figurinhas",
                });
            }

            return reply.status(201).send({
                success: true,
                message: "Pacote criado com sucesso",
                pack,
            });
        } catch (err) {
            if (err instanceof ZodError) {
                return reply.status(400).send({
                    success: false,
                    message: "Dados de criação de pacote inválidos",
                    errors: err.flatten().fieldErrors,
                });
            }

            if (err instanceof Error) {
                return reply.status(400).send({
                    success: false,
                    message: err.message,
                });
            }

            return reply.status(500).send({
                success: false,
                message: "Erro interno do servidor",
            });
        }
    });

    app.get("/public", async (request, reply) => {
        try {
            const packs = await packService.findAll();
            return reply.status(200).send({
                success: true,
                packs,
            });
        } catch (err) {
            if (err instanceof Error) {
                return reply.status(400).send({
                    success: false,
                    message: err.message,
                });
            }
            return reply.status(500).send({
                success: false,
                message: "Erro ao buscar pacotes públicos",
            });
        }
    });
}