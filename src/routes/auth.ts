import { UserRepo as UserRepository } from "@/repositories/user.repository";
import { UserService } from "@/services/user.service";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await userService.findByWAId("559185480955");
    return user;
  });
}
