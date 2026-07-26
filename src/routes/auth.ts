import { UserRepo as UserRepository } from "@/repositories/user.repository";
import { AuthService } from "@/services/auth.service";
import { JWT } from "@/utils/JWT";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const jwtUtils = new JWT(app.jwt);
  const authService = new AuthService(userRepository, jwtUtils);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authService.sendOTP("559185480955");
    return user;
  });
}
