import type { User } from "@/models";
import { userSchema } from "@/schemas";

import { SubscriptionUtils } from "./SubscriptionUtils";

export class UserUtils {
  static isDifferentUser(
    existing: User | null | undefined,
    current: User | null | undefined,
  ): boolean {
    if (!existing) return false;
    if (!current) return true;
    return existing._id.toString() !== current._id.toString();
  }

  static isFullyRegistered(user: User | null | undefined): boolean {
    return Boolean(user?.email && user?.password);
  }

  static applyDefaults(user: Partial<User>): User {
    const partialSchema = userSchema.partial();
    const parsed = partialSchema.parse(user) as User;

    const sanitized = SubscriptionUtils.sanitizeSubscription(
      parsed.subscription,
      parsed.premium,
    );

    parsed.premium = sanitized.premium;
    parsed.subscription = sanitized.subscription;

    return parsed;
  }

  static normalizeIdentifier(identifier: string): string {
    return identifier.trim().toLowerCase();
  }
}

