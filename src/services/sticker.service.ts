import { MAX_STICKERS_PER_PACK, MIN_STICKERS_PER_PACK } from "@/constants";
import type { CreateStickerDto, UpdateStickerDto } from "@/dtos";
import { PackRulesError } from "@/errors";
import type { Sticker } from "@/models";
import type {
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import {
  CloudinaryUtils,
  MongoUtils,
  PermissionUtils,
  UserUtils,
} from "@/utils";
import type { UploadService } from "./upload.service";

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

    const currentStickersCount =
      await this.stickerRepository.countByPackId(packObjectId);
    if (currentStickersCount >= MAX_STICKERS_PER_PACK) {
      throw new PackRulesError(
        "max",
        `O pacote já atingiu o limite máximo permitido de ${MAX_STICKERS_PER_PACK} figurinhas.`,
      );
    }

    const existingStickers =
      await this.stickerRepository.findByPackId(packObjectId);
    if (
      existingStickers.length > 0 &&
      existingStickers[0].type !== stickerData.type
    ) {
      throw new PackRulesError("type_mismatch");
    }

    const user = await this.userRepository.find({ _id: userObjectId });
    const sanitizedUser = UserUtils.applyDefaults(user);
    const isMaster = sanitizedUser?.subscription?.type === "MESTRE";
    const defaultAuthor = sanitizedUser?.userName || "Desconhecido";

    const resolvedAuthor = isMaster
      ? stickerData.author || defaultAuthor
      : defaultAuthor;

    const sticker = await this.stickerRepository.create({
      ...stickerData,
      author: resolvedAuthor,
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

    await this.packRepository.incrementStickersCount(packObjectId, 1);

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

    const user = await this.userRepository.find({ _id: userObjectId });
    const sanitizedUser = user ? UserUtils.applyDefaults(user) : null;
    const isMaster = sanitizedUser?.subscription?.type === "MESTRE";
    const defaultAuthor = sanitizedUser?.userName || existingSticker.author;

    const resolvedAuthor = isMaster
      ? updateData.author || defaultAuthor
      : defaultAuthor;

    const sticker = await this.stickerRepository.update(
      stickerObjectId,
      userObjectId,
      {
        ...updateData,
        author: resolvedAuthor,
      },
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

    const currentPackCount = await this.stickerRepository.countByPackId(
      existingSticker.pack_id,
    );
    if (currentPackCount <= MIN_STICKERS_PER_PACK) {
      throw new PackRulesError("min");
    }

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

    await this.packRepository.incrementStickersCount(
      existingSticker.pack_id,
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
