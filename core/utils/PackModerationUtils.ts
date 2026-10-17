import type { PackModerationAction, PackModerationStatus } from "@/schemas";

const TARGET_STATUS: Partial<
  Record<PackModerationAction, PackModerationStatus>
> = {
  APPROVE: "approved",
  RESTRICT: "restricted",
  BAN: "banned",
};

export class PackModerationUtils {
  static isLockedByModeration(status: PackModerationStatus): boolean {
    return status !== "approved";
  }

  static canBeMadePublic(status: PackModerationStatus): boolean {
    return status === "approved";
  }

  static isDeleteAction(action: PackModerationAction): boolean {
    return action === "DELETE_WITH_STRIKE" || action === "DELETE_NO_STRIKE";
  }

  static shouldApplyStrike(
    previousStatus: PackModerationStatus,
    action: PackModerationAction,
  ): boolean {
    const isStrikeAction = action === "BAN" || action === "DELETE_WITH_STRIKE";
    return isStrikeAction && previousStatus !== "banned";
  }

  static resolveTargetStatus(
    action: PackModerationAction,
  ): PackModerationStatus | null {
    return TARGET_STATUS[action] ?? null;
  }
}
