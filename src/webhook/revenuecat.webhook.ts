import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsync } from "fastify";

export const revenuecatWebhook: FastifyPluginAsync = async (app) => {
  const billingService = ServiceFactory.getBillingService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.post("", async (request, reply) => {
    console.log(
      "[RevenueCat Webhook] Body recebido:",
      JSON.stringify(request.body, null, 2),
    );

    const authHeader = request.headers.authorization;
    const revenueCatSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (authHeader !== `Bearer ${revenueCatSecret}`) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const payload = request.body as any;
    await billingService.handleRevenueCatWebhook(payload);

    const userId = payload?.event?.app_user_id;
    if (userId) {
      await cacheService.del(`profile:${userId}`);
    }

    return reply.status(200).send({ success: true });
  });
};
