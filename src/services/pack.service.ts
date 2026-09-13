import type {
  CreatePackDto,
  CreateStickerDto,
  PackRepositoryOptions,
  UpdatePackDto,
} from "@/dtos";
import type { StickerPack } from "@/models";
import type {
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import type { PaginatedResult, PaginationOptions } from "@/types";
import { CloudinaryUtils, MongoUtils, PermissionUtils } from "@/utils";
import type { UploadService } from "./upload.service";

export class PackService {
  constructor(
    private readonly packRepository: PackRepository,
    private readonly stickerRepository: StickerRepository,
    private readonly userRepository: UserRepository,
    private readonly uploadService: UploadService,
  ) {}

  async createPack(
    userId: string,
    publisher: string,
    packData: CreatePackDto,
  ): Promise<StickerPack | null> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    if (!publisher) {
      throw new Error("O nome do criador do pacote é obrigatório.");
    }

    const sanitizedTags = packData.tags?.map((tag) => tag.toLowerCase().trim());
    const { stickers, ...packFields } = packData;

    let iconUrlToSave = packFields.icon_url;
    if (
      !iconUrlToSave &&
      stickers &&
      stickers.length > 0 &&
      stickers[0]?.sticker_url
    ) {
      iconUrlToSave = CloudinaryUtils.transformUrlForPackIcon(
        stickers[0].sticker_url,
      );
    }

    const pack = await this.packRepository.create({
      ...packFields,
      icon_url: iconUrlToSave,
      tags: sanitizedTags,
      user_id: userObjectId,
      publisher,
    });
    if (!pack) {
      throw new Error(
        "Não foi possível criar o pacote de figurinhas agora. Tente novamente em instantes.",
      );
    }

    if (
      stickers &&
      stickers.length > 0 &&
      this.stickerRepository &&
      this.userRepository
    ) {
      const staticCount = stickers.filter(
        (s: CreateStickerDto) => s.type === "static",
      ).length;
      const animatedCount = stickers.filter(
        (s: CreateStickerDto) => s.type === "dynamic",
      ).length;

      await Promise.all(
        stickers.map((stickerData: CreateStickerDto) =>
          this.stickerRepository!.create({
            ...stickerData,
            pack_id: pack._id,
            user_id: userObjectId,
          }),
        ),
      );

      if (staticCount > 0) {
        await this.userRepository.incrementStickersCount(
          userObjectId,
          "static",
          staticCount,
        );
      }
      if (animatedCount > 0) {
        await this.userRepository.incrementStickersCount(
          userObjectId,
          "dynamic",
          animatedCount,
        );
      }

      const totalBytes = stickers.reduce(
        (sum: number, s: CreateStickerDto) => sum + (s.size_bytes ?? 0),
        0,
      );
      if (totalBytes > 0) {
        await this.userRepository.incrementStorageUsedBytes(
          userObjectId,
          totalBytes,
        );
      }
    }

    return pack;
  }

  async findManyPacks(
    options: PackRepositoryOptions,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<StickerPack>> {
    const page = pagination.page > 0 ? pagination.page : 1;
    const limit = pagination.limit > 0 ? Math.min(pagination.limit, 50) : 20;

    const paginationOptions: PaginationOptions = { page, limit };

    const repositoryOptions: PackRepositoryOptions = {
      category: options.category,
      search: options.search,
      tags: options.tags?.map((tag) => tag.toLowerCase().trim()),
      sort: options.sort ?? "recent",
      order: options.order ?? "desc",
    };

    const { data, total } = await this.packRepository.findAll(
      repositoryOptions,
      paginationOptions,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findPackById(id: string): Promise<StickerPack | null> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const pack = await this.packRepository.findById(packObjectId);
    return pack;
  }

  async findByUserId(
    userId: string,
    currentUserId: string,
  ): Promise<StickerPack[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const currentUserIdObject = MongoUtils.toObjectId(
      currentUserId,
      "ID de usuário inválido",
    );

    const packs = await this.packRepository.findByUserId(userObjectId);
    if (packs.length === 0) {
      return [];
    }

    PermissionUtils.verifyOwnership(
      currentUserIdObject,
      userObjectId,
      "pacotes do usuário",
    );

    return packs;
  }

  async updatePack(
    id: string,
    userId: string,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingPack = await this.packRepository.findById(packObjectId);
    if (!existingPack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(
      existingPack.user_id,
      userObjectId,
      "pacote",
    );

    const pack = await this.packRepository.update(
      packObjectId,
      userObjectId,
      updateData,
    );
    if (!pack) {
      throw new Error(
        "Não foi possível atualizar o pacote de figurinhas. Tente novamente em instantes.",
      );
    }

    return pack;
  }

  async deletePack(id: string, userId: string): Promise<boolean> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingPack = await this.packRepository.findById(packObjectId);
    if (!existingPack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(
      existingPack.user_id,
      userObjectId,
      "pacote",
    );

    const packStickers = this.stickerRepository
      ? await this.stickerRepository.findByPackId(packObjectId)
      : [];

    const result = await this.packRepository.delete(packObjectId, userObjectId);
    if (!result) {
      throw new Error(
        "Não foi possível excluir o pacote de figurinhas. Tente novamente em instantes.",
      );
    }

    if (packStickers.length > 0) {
      const staticCount = packStickers.filter(
        (sticker) => sticker.type === "static",
      ).length;
      const animatedCount = packStickers.filter(
        (sticker) => sticker.type === "dynamic",
      ).length;
      const totalBytesFreed = packStickers.reduce(
        (sum, sticker) => sum + (sticker.size_bytes ?? 0),
        0,
      );

      if (staticCount > 0) {
        await this.userRepository.incrementStickersCount(
          userObjectId,
          "static",
          -staticCount,
        );
      }
      if (animatedCount > 0) {
        await this.userRepository.incrementStickersCount(
          userObjectId,
          "dynamic",
          -animatedCount,
        );
      }
      if (totalBytesFreed > 0) {
        await this.userRepository.incrementStorageUsedBytes(
          userObjectId,
          -totalBytesFreed,
        );
      }

      const cloudinaryIds = packStickers
        .map((sticker) => sticker.cloudinary_id)
        .filter(Boolean);

      if (cloudinaryIds.length > 0) {
        await this.uploadService.deleteManyQuietly(cloudinaryIds);
      }
    }

    return result;
  }
}
