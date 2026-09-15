import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const billingRoutes: FastifyPluginAsyncZod = async (app) => {
  const billingService = ServiceFactory.getBillingService();

  app.get("/", {}, async (request, reply) => {
    return reply
      .status(200)
      .send({ success: true, message: "Billing route is up" });
  });

  app.post(
    "/revenuecat-webhook",
    {
      schema: {
        body: z
          .object({
            event: z
              .object({
                type: z.string(),
                app_user_id: z.string(),
                expiration_at_ms: z.number().optional(),
                product_id: z.string().optional(),
              })
              .loose(),
          })
          .loose(),
      },
    },
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      const revenueCatSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

      if (authHeader !== `Bearer ${revenueCatSecret}`) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const result = await billingService.handleRevenueCatWebhook(request.body);

      return reply.status(200).send({ success: true });
    },
  );
};
