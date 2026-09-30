import type { UserSubscription } from "@/schemas";

export class SubscriptionUtils {
  static isSubscriptionActive(
    subscription?: UserSubscription | null,
  ): boolean {
    if (!subscription || subscription.type === "FREE") {
      return false;
    }

    if (!subscription.end) {
      return true;
    }

    return new Date(subscription.end).getTime() > Date.now();
  }

  static hasSubscriptionExpired(
    subscription?: UserSubscription | null,
  ): boolean {
    if (!subscription || !subscription.end || subscription.type === "FREE") {
      return false;
    }

    return new Date(subscription.end).getTime() <= Date.now();
  }

  static sanitizeSubscription(
    subscription?: UserSubscription | null,
    isPremium?: boolean,
  ): { premium: boolean; subscription: UserSubscription } {
    if (this.hasSubscriptionExpired(subscription)) {
      return {
        premium: false,
        subscription: {
          start: null,
          end: null,
          plan: null,
          type: "FREE",
        },
      };
    }

    const currentSubscription: UserSubscription = subscription ?? {
      type: "FREE",
    };

    if (isPremium && currentSubscription.type === "FREE") {
      return {
        premium: true,
        subscription: {
          ...currentSubscription,
          type: "PRO",
        },
      };
    }

    const active = this.isSubscriptionActive(currentSubscription);

    return {
      premium: active && Boolean(isPremium),
      subscription: active
        ? currentSubscription
        : {
            start: null,
            end: null,
            plan: null,
            type: "FREE",
          },
    };
  }
}
