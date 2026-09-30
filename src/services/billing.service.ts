import type { UserRepository } from "@/models";
import type { IBillingService, IRevenuePayload } from "@/types";
import { MongoUtils } from "@/utils";

export class BillingService implements IBillingService {
  constructor(private readonly userRepository: UserRepository) {}

  async handleRevenueCatWebhook(payload: IRevenuePayload): Promise<void> {
    const event = payload.event;
    const userId = event.app_user_id;

    if (!userId) {
      console.warn("[Billing] Webhook received without 'app_user_id'");
      return;
    }

    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    if (!userObjectId) {
      console.error(`[Billing] Invalid user ID received in webhook: ${userId}`);
      return;
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const expirationDate = new Date(
      event.expiration_at_ms ?? Date.now() + THIRTY_DAYS_MS,
    );

    const isMasterPlan = event.product_id === "vip_mestre:basic-vip-mestre";
    const plan = isMasterPlan ? "VIP_MESTRE" : "VIP_PRO";
    const type = isMasterPlan ? "MESTRE" : "PRO";

    console.log(
      `[Billing] Processing RevenueCat event: ${event.type} for user ${userId} (plan=${plan}, type=${type}, expires=${expirationDate.toISOString()})`,
    );

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
      case "SUBSCRIPTION_EXTENDED":
        await this.userRepository.update(
          { _id: userObjectId },
          {
            premium: true,
            subscription: {
              start: new Date(),
              end: expirationDate,
              plan,
              type,
            },
          },
        );
        break;

      case "CANCELLATION":
      case "EXPIRATION":
        await this.userRepository.update(
          { _id: userObjectId },
          {
            premium: false,
            subscription: {
              start: null,
              end: null,
              plan: null,
              type: "FREE",
            },
          },
        );
        break;

      default:
        console.log(`[Billing] Unhandled RevenueCat event: ${event.type}`);
    }
  }
}
