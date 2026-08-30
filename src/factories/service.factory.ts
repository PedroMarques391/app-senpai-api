import {
  InventoryRepository,
  PackRepository,
  StickerRepository,
  StoreRepository,
  UserRepository,
} from "@/repositories";
import {
  AuthService,
  InventoryService,
  PackService,
  ProfileService,
  PurchaseService,
  StickerService,
  StoreService,
  UploadService,
  UserService,
} from "@/services";

import type { JWT as FastifyJWT } from "@fastify/jwt";

export class ServiceFactory {
  private static inventoryService: InventoryService;
  private static packService: PackService;
  private static profileService: ProfileService;
  private static purchaseService: PurchaseService;
  private static stickerService: StickerService;
  private static storeService: StoreService;
  private static uploadService: UploadService;
  private static userService: UserService;

  static getInventoryService(): InventoryService {
    if (!this.inventoryService) {
      this.inventoryService = new InventoryService(new InventoryRepository());
    }
    return this.inventoryService;
  }

  static getPackService(): PackService {
    if (!this.packService) {
      this.packService = new PackService(new PackRepository());
    }
    return this.packService;
  }

  static getStickerService(): StickerService {
    if (!this.stickerService) {
      this.stickerService = new StickerService(
        new StickerRepository(),
        new PackRepository(),
        new UserRepository(),
      );
    }
    return this.stickerService;
  }

  static getUploadService(): UploadService {
    if (!this.uploadService) {
      this.uploadService = new UploadService();
    }
    return this.uploadService;
  }

  static getProfileService(): ProfileService {
    if (!this.profileService) {
      this.profileService = new ProfileService(new UserRepository());
    }
    return this.profileService;
  }

  static getUserService(): UserService {
    if (!this.userService) {
      this.userService = new UserService(new UserRepository());
    }
    return this.userService;
  }

  static getStoreService(): StoreService {
    if (!this.storeService) {
      this.storeService = new StoreService(new StoreRepository());
    }
    return this.storeService;
  }

  static getPurchaseService(): PurchaseService {
    if (!this.purchaseService) {
      this.purchaseService = new PurchaseService(
        new StoreRepository(),
        new UserRepository(),
        new InventoryRepository(),
      );
    }
    return this.purchaseService;
  }

  static getAuthService(jwtInstance: FastifyJWT): AuthService {
    return new AuthService(new UserRepository(), jwtInstance);
  }
}
