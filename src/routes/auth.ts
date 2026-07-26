import { UserRepo as UserRepository } from "@/repositories/user.repository";
import { AuthService } from "@/services/auth.service";
import { JWT } from "@/utils/JWT";
import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const jwtUtils = new JWT(app.jwt);
  const authService = new AuthService(userRepository, jwtUtils);

  app.post<{ Body: { wa_id: string } }>(
    "/login/otp",
    async (request, reply) => {
      try {
        const { wa_id } = request.body;
        console.log(wa_id);
        const user = await authService.sendOTP(wa_id);

        if (!user) {
          throw new Error("Operation not permitted");
        }

        reply.send({
          message: "OTP sent successfully",
          user: user.user,
        });
      } catch (err) {
        reply.status(400).send({
          message: "Operation not permitted",
        });
      }
    },
  );
  app.post<{ Body: { wa_id: string; otp: string } }>(
    "/login/verify",
    async (request, reply) => {
      try {
        const { wa_id, otp } = request.body;
        if (!otp) {
          throw new Error("Invalid or expired OTP");
        }
        const user = await authService.verifyOtpAndLogin(wa_id, otp);

        reply.send({
          message: "OTP verified successfully",
          user: user.user,
          token: user.token,
        });
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(400).send({
            message: err.message,
          });
        }
        reply.status(400).send({
          message: "Operation not permitted",
        });
      }
    },
  );
}
