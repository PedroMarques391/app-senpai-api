import {
  MAX_REGISTRATIONS_PER_IP_24H,
  REGISTRATION_IP_WINDOW_SECONDS,
} from "@/constants";
import { createUserDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import { NetworkUtils } from "@/utils";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const authService = ServiceFactory.getAuthService(app.jwt, app.redis);
  const recoveryService = ServiceFactory.getRecoveryService(app.redis);

  app.post(
    "/login/otp",
    {
      schema: {
        body: z.object({
          wa_id: z.string().trim().min(8, "Número de WhatsApp inválido."),
        }),
      },
    },
    async (request, reply) => {
      const { wa_id } = request.body;

      const result = await authService.sendOTP(wa_id);

      if (!result.success) return reply.status(403).send(result);

      return reply.status(200).send({
        message: "Código de verificação enviado com sucesso.",
        expiresIn: 300,
        retryAfter: 60,
      });
    },
  );

  app.post(
    "/login/verify",
    {
      schema: {
        body: z.object({
          wa_id: z.string().trim().min(8, "Número de WhatsApp inválido."),
          otp: z
            .string()
            .trim()
            .length(6, "Código de verificação deve ter 6 dígitos."),
        }),
      },
    },
    async (request, reply) => {
      const { wa_id, otp } = request.body;
      const user = await authService.verifyOtpAndLogin(wa_id, otp);

      reply.header("Authorization", `Bearer ${user.token}`);
      return reply.status(200).send({
        success: true,
        message: "Código validado com sucesso.",
        user: user.user,
      });
    },
  );

  app.post(
    "/register",
    { schema: { body: createUserDtoSchema } },
    async (request, reply) => {
      const clientIp = NetworkUtils.getClientIp(
        request.headers,
        request.socket.remoteAddress,
      );

      const isRateLimitedIp =
        clientIp !== "127.0.0.1" &&
        clientIp !== "::1" &&
        clientIp !== "Desconhecido";

      if (isRateLimitedIp) {
        const ipKey = `ratelimit:register:ip:${clientIp}`;
        const count = await app.redis.get(ipKey);
        if (count && Number(count) >= MAX_REGISTRATIONS_PER_IP_24H) {
          return reply.status(429).send({
            success: false,
            code: "REGISTRATION_IP_LIMIT_EXCEEDED",
            message:
              "Limite de cadastros diários atingido para esta rede. Tente novamente em 24 horas.",
          });
        }
      }

      const userData = request.body;
      const user = await authService.register(userData.wa_id, userData);

      if (isRateLimitedIp) {
        const ipKey = `ratelimit:register:ip:${clientIp}`;
        const newCount = await app.redis.incr(ipKey);
        if (newCount === 1) {
          await app.redis.expire(ipKey, REGISTRATION_IP_WINDOW_SECONDS);
        }
      }

      return reply.status(201).send({
        success: true,
        message: "Usuário cadastrado com sucesso.",
        user,
      });
    },
  );

  app.post(
    "/login/loginWithIdentifier",
    {
      schema: {
        body: z.object({
          identifier: z.string().trim().toLowerCase(),
          password: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { identifier, password } = request.body;
      const user = await authService.loginWithCredentials(identifier, password);

      reply.header("Authorization", `Bearer ${user.token}`);

      return reply.status(200).send({
        success: true,
        message: "Login realizado com sucesso.",
        user: user.user,
      });
    },
  );

  app.post(
    "/password/recovery",
    {
      schema: {
        body: z.object({
          email: z.string().trim().toLowerCase().email(),
        }),
      },
    },
    async (request, reply) => {
      const { email } = request.body;
      await recoveryService.forgotPassword(email);

      return reply.status(200).send({
        success: true,
        message: "E-mail de recuperação enviado com sucesso.",
      });
    },
  );

  app.post(
    "/reset-password",
    {
      schema: {
        body: z.object({
          token: z.string(),
          password: z
            .string()
            .min(8, "A senha deve ter no mínimo 8 caracteres."),
        }),
      },
    },
    async (request, reply) => {
      const { token, password } = request.body;
      const clientIp = NetworkUtils.getClientIp(request.headers, request.ip);
      const userAgent = request.headers["user-agent"];

      await recoveryService.resetPassword(token, password, {
        ip: clientIp,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
        headers: request.headers,
      });

      return reply.status(200).send({
        success: true,
        message: "Senha redefinida com sucesso.",
      });
    },
  );
};
