import type {
  InventoryItem,
  InventoryRepository,
  StoreRepository,
  UserRepository,
} from "@/models";
import { MongoUtils } from "@/utils";
export interface PurchaseResult {
  item: InventoryItem;
  newBalance: number;
}

export class PurchaseService {
  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly userRepository: UserRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(userId: string, itemId: string): Promise<PurchaseResult> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const itemObjectId = MongoUtils.toObjectId(
      itemId,
      "ID do item da loja inválido",
    );

    const storeItem = await this.storeRepository.findById(itemObjectId);
    if (!storeItem || storeItem.status !== "active") {
      throw new Error("Item da loja não encontrado ou inativo");
    }

    const [user, alreadyOwned] = await Promise.all([
      this.userRepository.find({ _id: userObjectId }),
      this.inventoryRepository.findByUserAndItem(userObjectId, itemObjectId),
    ]);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    if (alreadyOwned) {
      throw new Error("Você já possui este item em seu inventário");
    }
    if (user.petals_balance < storeItem.price_in_petals) {
      throw new Error("Pétalas insuficientes para adquirir este item");
    }

    // deductPetals agora retorna o saldo atualizado (ou null se falhar,
    // ex.: condição de saldo insuficiente verificada no próprio update atômico)
    const newBalance = await this.userRepository.deductPetals(
      userObjectId,
      storeItem.price_in_petals,
    );
    if (newBalance === null) {
      throw new Error("Pétalas insuficientes para adquirir este item");
    }

    const inventoryItem = await this.inventoryRepository.create(
      userObjectId,
      itemObjectId,
      storeItem.type,
    );

    await this.storeRepository.incrementPurchasesCount(itemObjectId);

    return {
      item: inventoryItem,
      newBalance,
    };
  }
}
