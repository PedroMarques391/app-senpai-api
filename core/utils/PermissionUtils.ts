import type { ObjectId } from "mongodb";

export class PermissionUtils {
  static verifyOwnership(
    resourceUserId: ObjectId,
    currentUserId: ObjectId,
    resourceName: string,
  ): void {
    if (resourceUserId.toString() !== currentUserId.toString()) {
      throw new Error(
        `Operação não permitida: você não é o proprietário deste ${resourceName}`,
      );
    }
  }
}
