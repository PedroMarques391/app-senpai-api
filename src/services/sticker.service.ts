import type { CreateStickerDto, UpdateStickerDto } from "@/dtos";
import type { Sticker } from "@/models";
import type {
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import type { UploadService } from "./upload.service";
import { CloudinaryUtils, MongoUtils, PermissionUtils } from "@/utils";

export class StickerService {
  constructor(
    private readonly stickerRepository: StickerRepository,
    private readonly packRepository: PackRepository,
    private readonly userRepository: UserRepository,
    private readonly uploadService: UploadService,
  ) {}

  async createSticker(
    packId: string,
    userId: string,
    stickerData: CreateStickerDto,
  ): Promise<Sticker | null> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const pack = await this.packRepository.findById(packObjectId);
    if (!pack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(pack.user_id, userObjectId, "pacote");

    const sticker = await this.stickerRepository.create({
      ...stickerData,
      pack_id: packObjectId,
      user_id: userObjectId,
    });
    if (!sticker) {
      throw new Error(
        "Não foi possível criar a figurinha agora. Tente novamente em instantes.",
      );
    }

    await this.userRepository.incrementStickersCount(
      userObjectId,
      sticker.type,
      1,
    );

    const sizeBytes = stickerData.size_bytes ?? 0;
    if (sizeBytes > 0) {
      await this.userRepository.incrementStorageUsedBytes(
        userObjectId,
        sizeBytes,
      );
    }

    if (!pack.icon_url && sticker.sticker_url) {
      const transformedUrl = CloudinaryUtils.transformUrlForPackIcon(
        sticker.sticker_url,
      );
      await this.packRepository.update(packObjectId, userObjectId, {
        icon_url: transformedUrl,
      });
    }

    return sticker;
  }

  async findManyStickers(): Promise<Sticker[]> {
    const stickers = await this.stickerRepository.findAll();
    return stickers;
  }

  async findStickerById(id: string): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const sticker = await this.stickerRepository.findById(stickerObjectId);
    return sticker;
  }

  async listStickersByUserId(
    userId: string,
    currentUserId: string,
  ): Promise<Sticker[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const currentUserIdObject = MongoUtils.toObjectId(
      currentUserId,
      "ID de usuário inválido",
    );

    const stickers = await this.stickerRepository.findByUserId(userObjectId);
    if (!stickers || stickers.length === 0) {
      return [];
    }

    PermissionUtils.verifyOwnership(
      currentUserIdObject,
      userObjectId,
      "figurinhas do usuário",
    );

    return stickers;
  }

  async listStickersByPackId(packId: string): Promise<Sticker[]> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const stickers = await this.stickerRepository.findByPackId(packObjectId);
    if (!stickers) {
      return [];
    }
    return stickers;
  }

  async updateSticker(
    id: string,
    userId: string,
    updateData: UpdateStickerDto,
  ): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingSticker =
      await this.stickerRepository.findById(stickerObjectId);
    if (!existingSticker) {
      throw new Error("Figurinha não encontrada");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const sticker = await this.stickerRepository.update(
      stickerObjectId,
      userObjectId,
      updateData,
    );
    if (!sticker) {
      throw new Error(
        "Não foi possível atualizar a figurinha. Tente novamente em instantes.",
      );
    }

    return sticker;
  }

  async deleteSticker(id: string, userId: string): Promise<Sticker> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingSticker =
      await this.stickerRepository.findById(stickerObjectId);
    if (!existingSticker) {
      throw new Error("Figurinha não encontrada");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const result = await this.stickerRepository.delete(
      stickerObjectId,
      userObjectId,
    );
    if (!result) {
      throw new Error(
        "Não foi possível excluir a figurinha. Tente novamente em instantes.",
      );
    }

    await this.userRepository.incrementStickersCount(
      userObjectId,
      existingSticker.type,
      -1,
    );

    const sizeBytes = existingSticker.size_bytes ?? 0;
    if (sizeBytes > 0) {
      await this.userRepository.incrementStorageUsedBytes(
        userObjectId,
        -sizeBytes,
      );
    }

    if (existingSticker.cloudinary_id) {
      await this.uploadService.deleteQuietly(existingSticker.cloudinary_id);
    }

    return existingSticker;
  }
}
