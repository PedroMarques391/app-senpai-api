import { PackRepository, StickerRepository, UserRepository } from "@/repositories";
import {
  AuthService,
  PackService,
  StickerService,
  UploadService,
  UserService,
} from "@/services";
import { JWT } from "@/utils";
import type { JWT as FastifyJWT } from "@fastify/jwt";

export class ServiceFactory {
  private static packService: PackService;
  private static stickerService: StickerService;
  private static uploadService: UploadService;
  private static userService: UserService;

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

  static getUserService(): UserService {
    if (!this.userService) {
      this.userService = new UserService(new UserRepository());
    }
    return this.userService;
  }

  static getAuthService(jwtInstance: FastifyJWT): AuthService {
    return new AuthService(new UserRepository(), new JWT(jwtInstance));
  }
}
