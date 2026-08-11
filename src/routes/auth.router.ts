import { createUserDtoSchema } from "@/dtos";
import { UserRepo as UserRepository } from "@/repositories";
import { AuthService } from "@/services";
import { JWT } from "@/utils";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const userRepository = new UserRepository();
  const jwtUtils = new JWT(app.jwt);
  const authService = new AuthService(userRepository, jwtUtils);

  app.post(
    "/login/otp",
    {
      schema: {
        body: z.object({
          wa_id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { wa_id } = request.body;
        const result = await authService.sendOTP(wa_id);

        if (!result.success) return reply.status(403).send(result);

        return reply.status(200).send({
          message: "OTP sent successfully",
          otp: result.data,
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

  app.post(
    "/login/verify",
    {
      schema: {
        body: z.object({
          wa_id: z.string(),
          otp: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
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

  app.post(
    "/register",
    {
      schema: {
        body: createUserDtoSchema,
      },
    },
    async (request, reply) => {
      try {
        const userData = request.body;
        const user = await authService.register(userData.wa_id, userData);

        reply.send({
          message: "User created successfully",
          user,
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

  app.post(
    "/login/loginWithIdentifier",
    {
      schema: {
        body: z.object({
          identifier: z.string(),
          password: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { identifier, password } = request.body;
        const user = await authService.loginWithCredentials(
          identifier,
          password,
        );

        reply.header("Authorization", `Bearer ${user.token}`);
        return reply.status(200).send({
          success: true,
          message: "Password verified successfully",
          user: user.user,
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
};
