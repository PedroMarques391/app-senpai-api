import { chatBodyDtoSchema } from "@/dtos";
import { SENPAI_SYSTEM_INSTRUCTIONS } from "@/knowledge";
import { createGoogle } from "@ai-sdk/google";
import { streamText, type ModelMessage } from "ai";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY?.trim(),
});

export const chatRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        body: chatBodyDtoSchema,
      },
    },
    async (request, reply) => {
      const { messages } = request.body;
      const { wa_id, userName } = request.user;

      const userIdentifier = userName || wa_id;

      const lastUserMessage =
        [...messages].reverse().find((m) => m.role === "user")?.content ||
        messages[messages.length - 1]?.content ||
        "";

      const result = streamText({
        model: google("gemini-2.5-flash"),
        system: SENPAI_SYSTEM_INSTRUCTIONS,
        messages: messages as ModelMessage[],
        onFinish: ({ text }) => {
          request.log.info(
            `\n[${userIdentifier}] - ${lastUserMessage}\n[Senpai] - ${text.trim()}`,
          );
        },
        onError: ({ error }) => {
          request.log.error(
            error,
            `[Chat Senpai] Erro ao responder [${userIdentifier}]`,
          );
        },
      });

      reply.header("Content-Type", "text/plain; charset=utf-8");
      return reply.send(result.textStream);
    },
  );
};
