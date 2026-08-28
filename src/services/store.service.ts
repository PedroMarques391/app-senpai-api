import type { CreateStoreItemDto, UpdateStoreItemDto } from "@/dtos";
import type { InventoryItem, StoreItem } from "@/models";
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

  async listItems(): Promise<StoreItem[]> {
    return this.storeRepository.findAll();
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

  async createItem(data: CreateStoreItemDto): Promise<StoreItem> {
    if (!data) throw new Error("Dados inválidos");
    const item = await this.storeRepository.create(data);
    if (!item) throw new Error("Falha ao criar item da loja");
    return item;
  }

  async updateItem(id: string, data: UpdateStoreItemDto): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const updated = await this.storeRepository.update(storeObjectId, data);
    if (!updated) throw new Error("Item da loja não encontrado");
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const item = await this.storeRepository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");

    const result = await this.storeRepository.delete(storeObjectId);
    if (!result) throw new Error("Falha ao deletar item da loja");
  }

  async purchaseItem(userId: string, itemId: string): Promise<InventoryItem> {
    if (!this.userRepository || !this.inventoryRepository) {
      throw new Error(
        "Dependências de compra não configuradas no StoreService",
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
    if (!storeItem || !storeItem.is_active) {
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
