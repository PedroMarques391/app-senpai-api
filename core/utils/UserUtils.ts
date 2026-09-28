import type { User } from "@/models";
import { userSchema } from "@/schemas";

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

    if (parsed.premium && parsed.subscription.type === "FREE") {
      parsed.subscription.type = "PRO";
    }

    return parsed;
  }

  static normalizeIdentifier(identifier: string): string {
    return identifier.trim().toLowerCase();
  }
}

