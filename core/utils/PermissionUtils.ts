import type { ObjectId } from "mongodb";
import { MasterOnlyFeatureError, VerifyOwnershipError } from "@/errors";

export class PermissionUtils {
  static verifyOwnership(
    resourceUserId: ObjectId,
    currentUserId: ObjectId,
    resourceName: string,
  ): void {
    if (resourceUserId.toString() !== currentUserId.toString()) {
      throw new VerifyOwnershipError(
        `Operação não permitida: você não é o proprietário deste ${resourceName}`,
      );
    }
  }

  static verifyMasterSubscription(subscriptionType?: string): void {
    const normalized = subscriptionType?.trim().toUpperCase();
    if (normalized !== "MESTRE") {
      throw new MasterOnlyFeatureError();
    }
  }
}
