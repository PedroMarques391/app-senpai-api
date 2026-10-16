import type {
  InventoryRepository,
  PurchaseResult,
  StoreItem,
  StoreRepository,
  UserRepository,
} from "@/models";
import { MongoUtils } from "@/utils";
import { ObjectId } from "mongodb";

export class PurchaseService {
  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly userRepository: UserRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(userId: string, itemIdOrCode: string): Promise<PurchaseResult> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    let storeItem: StoreItem | null = null;

    if (ObjectId.isValid(itemIdOrCode)) {
      storeItem = await this.storeRepository.find({
        _id: new ObjectId(itemIdOrCode),
      });
    }

    if (!storeItem) {
      storeItem = await this.storeRepository.find({
        code: itemIdOrCode.trim().toLowerCase(),
      });
    }

    if (!storeItem || storeItem.status !== "active") {
      throw new Error("Item da loja não encontrado ou inativo");
    }

    const [user, alreadyOwned] = await Promise.all([
      this.userRepository.find({ _id: userObjectId }),
      this.inventoryRepository.findByUserAndItem(userObjectId, storeItem._id),
    ]);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    if (alreadyOwned) {
      throw new Error("Você já comprou este item anteriormente.");
    }
    if (user.petals_balance < storeItem.price_in_petals) {
      throw new Error(
        "Você não tem pétalas suficientes para comprar este item.",
      );
    }

    const newBalance = await this.userRepository.deductPetals(
      userObjectId,
      storeItem.price_in_petals,
    );
    if (newBalance === null) {
      throw new Error(
        "Você não tem pétalas suficientes para comprar este item.",
      );
    }

    await this.inventoryRepository.create(
      userObjectId,
      storeItem._id,
      storeItem.type,
      storeItem.code,
    );

    await this.storeRepository.incrementPurchasesCount(storeItem._id);

    return {
      code: storeItem.code,
      name: storeItem.name,
      price_in_petals: storeItem.price_in_petals,
      newBalance,
    };
  }
}
