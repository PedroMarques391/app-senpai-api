import { createUserDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const authService = ServiceFactory.getAuthService(app.jwt);

  app.post(
    "/login/otp",
    { schema: { body: z.object({ wa_id: z.string() }) } },
    async (request, reply) => {
      const { wa_id } = request.body;
      const result = await authService.sendOTP(wa_id);

      if (!result.success) return reply.status(403).send(result);

      return reply.status(200).send({
        message: "OTP sent successfully",
        otp: result.data,
      });
    },
  );

  app.post(
    "/login/verify",
    {
      schema: {
        body: z.object({ wa_id: z.string(), otp: z.string() }),
      },
    },
    async (request, reply) => {
      const { wa_id, otp } = request.body;
      if (!otp) {
        throw new Error("Invalid or expired OTP");
      }
      const user = await authService.verifyOtpAndLogin(wa_id, otp);

      reply.header("Authorization", `Bearer ${user.token}`);
      return reply.status(200).send({
        success: true,
        message: "OTP verified successfully",
        user: user.user,
      });
    },
  );

  app.post(
    "/register",
    { schema: { body: createUserDtoSchema } },
    async (request, reply) => {
      const userData = request.body;
      const user = await authService.register(userData.wa_id, userData);

      return reply.send({
        message: "User created successfully",
        user,
      });
    },
  );

  app.post(
    "/login/loginWithIdentifier",
    {
      schema: {
        body: z.object({ identifier: z.string(), password: z.string() }),
      },
    },
    async (request, reply) => {
      const { identifier, password } = request.body;
      const user = await authService.loginWithCredentials(identifier, password);

      reply.header("Authorization", `Bearer ${user.token}`);
      return reply.status(200).send({
        success: true,
        message: "Password verified successfully",
        user: user.user,
      });
    },
  );
};
