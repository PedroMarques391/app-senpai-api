import type { CreateStoreItemDto, UpdateStoreItemDto } from "@/dtos";
import type { InventoryItem, StoreItem, StoreItemStatus } from "@/models";
import type {
  InventoryRepository,
  StoreRepository,
  UserRepository,
} from "@/repositories";
import { MongoUtils } from "@/utils";

export class StoreService {
  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly userRepository?: UserRepository,
    private readonly inventoryRepository?: InventoryRepository,
  ) {}

  async listItems(status?: StoreItemStatus): Promise<StoreItem[]> {
    return this.storeRepository.findAll(status);
  }

  async getItem(id: string): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const item = await this.storeRepository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");
    return item;
  }

  async createItem(dto: CreateStoreItemDto): Promise<StoreItem> {
    return this.storeRepository.create(dto);
  }

  async updateItem(id: string, dto: UpdateStoreItemDto): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const existing = await this.storeRepository.findById(storeObjectId);
    if (!existing) throw new Error("Item da loja não encontrado");

    const updated = await this.storeRepository.update(storeObjectId, dto);
    if (!updated) throw new Error("Falha ao atualizar item da loja");
    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const existing = await this.storeRepository.findById(storeObjectId);
    if (!existing) throw new Error("Item da loja não encontrado");

    return this.storeRepository.delete(storeObjectId);
  }

  async purchaseItem(userId: string, itemId: string): Promise<InventoryItem> {
    if (!this.userRepository || !this.inventoryRepository) {
      throw new Error(
        "Dependências do serviço de compra não configuradas no construtor",
      );
    }

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

    const [user, alreadyOwned, deducted] = await Promise.all([
      this.userRepository.find({ _id: userObjectId }),
      this.inventoryRepository.findByUserAndItem(userObjectId, itemObjectId),
      this.userRepository.deductPetals(userObjectId, storeItem.price_in_petals),
    ]);

    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    if (alreadyOwned) {
      throw new Error("Você já possui este item em seu inventário");
    }

    if (user.petals_balance < storeItem.price_in_petals || !deducted) {
      throw new Error("Pétalas insuficientes para adquirir este item");
    }

    const inventoryItem = await this.inventoryRepository.create(
      userObjectId,
      itemObjectId,
      storeItem.type,
    );

    await this.storeRepository.incrementPurchasesCount(itemObjectId);

    return inventoryItem;
  }
}
