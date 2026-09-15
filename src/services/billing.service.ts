import type { UserRepository } from "@/models";

export interface IBillingService {
  handleRevenueCatWebhook(payload: any): Promise<void>;
}

export class BillingService implements IBillingService {
  constructor(private readonly userRepository: UserRepository) {}

  async handleRevenueCatWebhook(payload: any): Promise<void> {
    const event = payload.event;
    if (!event) {
      console.warn("[Billing] Webhook received without 'event' payload");
      return;
    }

    const userId = event.app_user_id;
    const eventType = event.type;

    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    console.log(
      `[Billing] Processing RevenueCat event: ${eventType} for user ${userId}`,
    );

    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
        if (expirationDate) {
          await this.userRepository.update(userId, {
            premium: true,
            subscriptions: {
              start: new Date(),
              end: expirationDate,
              plan:
                event.product_id === "vip_mestre" ? "VIP_MESTRE" : "VIP_PRO",
              type: event.product_id === "vip_mestre" ? "MESTRE" : "PRO",
            },
          });
        }
        break;

      case "CANCELLATION":
      case "EXPIRATION":
        await this.userRepository.update(userId, {
          premium: false,
        });
        break;

      default:
        console.log(`[Billing] Unhandled RevenueCat event: ${eventType}`);
    }
  }
}
