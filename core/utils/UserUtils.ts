import type { User } from "@/models/user.model";

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
}
