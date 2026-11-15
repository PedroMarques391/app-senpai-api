import { MasterOnlyFeatureError, VerifyOwnershipError } from "@/errors";
import type { ObjectId } from "mongodb";

export class PermissionHelper {
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
    if (subscriptionType !== "MESTRE") {
      throw new MasterOnlyFeatureError();
    }
  }
}
