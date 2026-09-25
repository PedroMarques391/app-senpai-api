import type { UserRepository } from "@/models";
import type { IBillingService } from "@/types";
import { MongoUtils } from "@/utils";

export class BillingService implements IBillingService {
  constructor(private readonly userRepository: UserRepository) { }

  async handleRevenueCatWebhook(payload: any): Promise<void> {
    const event = payload?.event;
    if (!event) {
      console.warn("[Billing] Webhook received without 'event' payload");
      return;
    }

    const rawUserId = event.app_user_id;
    const eventType = event.type;

    if (!rawUserId) {
      console.warn("[Billing] Webhook received without 'app_user_id'");
      return;
    }

    let userObjectId;
    try {
      userObjectId = MongoUtils.toObjectId(rawUserId, "ID de usuário inválido");
    } catch (e) {
      console.error(`[Billing] Invalid user ID received in webhook: ${rawUserId}`, e);
      return;
    }

    // Identifica data de expiração (ms ou ISO), com fallback de 30 dias caso não venha no evento
    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : event.expires_date_ms
      ? new Date(event.expires_date_ms)
      : event.expiration_at
      ? new Date(event.expiration_at)
      : event.expires_date
      ? new Date(event.expires_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const productId = (event.product_id || "").toLowerCase();
    const isMestre = productId.includes("mestre");
    const plan = isMestre ? "VIP_MESTRE" : "VIP_PRO";
    const type = isMestre ? "MESTRE" : "PRO";

    console.log(
      `[Billing] Processing RevenueCat event: ${eventType} for user ${rawUserId} (plan=${plan}, type=${type}, expires=${expirationDate.toISOString()})`,
    );

    switch (eventType) {
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
              type: "FREE",
            },
          },
        );
        break;

      default:
        console.log(`[Billing] Unhandled RevenueCat event: ${eventType}`);
    }
  }
}
