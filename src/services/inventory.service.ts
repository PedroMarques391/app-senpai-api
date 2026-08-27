import type { InventoryItem } from "@/models";
import type { InventoryRepository } from "@/repositories";
import { MongoUtils } from "@/utils";

export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async getUserInventory(userId: string): Promise<InventoryItem[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    return this.inventoryRepository.findByUserId(userObjectId);
  }
}
