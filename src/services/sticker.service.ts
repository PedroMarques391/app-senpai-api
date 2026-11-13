import { MAX_STICKERS_PER_PACK, MIN_STICKERS_PER_PACK } from "@/constants";
import type { CreateStickerDto, StickerFit, UpdateStickerDto } from "@/dtos";
import {
  AppError,
  PackNotFoundError,
  PackRulesError,
  UserNotFoundError,
} from "@/errors";
import type { Sticker } from "@/models";
import type { MediaQueue } from "@/queues";
import type {
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import { MongoUtils, PermissionUtils, UserUtils } from "@/utils";
import type { ObjectId } from "mongodb";
import type { UploadService } from "./upload.service";

export class StickerService {
  constructor(
    private readonly stickerRepository: StickerRepository,
    private readonly packRepository: PackRepository,
    private readonly userRepository: UserRepository,
    private readonly uploadService: UploadService,
    private readonly mediaQueue: MediaQueue,
  ) {}

  async createSticker(
    packId: string,
    userId: string,
    stickerData: CreateStickerDto,
    fit: StickerFit = "fill",
  ): Promise<Sticker> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const pack = await this.packRepository.findById(packObjectId);
    if (!pack) {
      throw new PackNotFoundError();
    }

    PermissionUtils.verifyOwnership(pack.user_id, userObjectId, "pacote");

    const existingStickers =
      await this.stickerRepository.findByPackId(packObjectId);
    if (existingStickers.length >= MAX_STICKERS_PER_PACK) {
      throw PackRulesError.max(
        `O pacote já atingiu o limite máximo permitido de ${MAX_STICKERS_PER_PACK} figurinhas.`,
      );
    }

    if (
      existingStickers.length > 0 &&
      existingStickers[0].type !== stickerData.type
    ) {
      throw PackRulesError.typeMismatch();
    }

    const author = await this.resolveAuthor(userObjectId, stickerData.author);

    const sticker = await this.stickerRepository.create({
      ...stickerData,
      author,
      pack_id: packObjectId,
      user_id: userObjectId,
    });
    if (!sticker) {
      throw AppError.internal(
        "Não foi possível criar a figurinha agora. Tente novamente em instantes.",
        "STICKER_CREATION_FAILED",
      );
    }

    await this.userRepository.incrementStickersCount(
      userObjectId,
      sticker.type,
      1,
    );

    await this.packRepository.incrementStickersCount(packObjectId, 1);

    if (stickerData.size_bytes > 0) {
      await this.userRepository.incrementStorageUsedBytes(
        userObjectId,
        stickerData.size_bytes,
      );
    }

    if (sticker.file_key) {
      await this.mediaQueue.addJob("process-media", {
        type: sticker.type === "dynamic" ? "animated" : "static",
        tempKey: sticker.file_key,
        packId: packObjectId.toString(),
        stickerId: sticker._id.toString(),
        userId: userObjectId.toString(),
        isPackCover: !pack.icon_url,
        fit,
      });
    }

    return sticker;
  }

  async findManyStickers(): Promise<Sticker[]> {
    return this.stickerRepository.findAll();
  }

  async findStickerById(id: string): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    return this.stickerRepository.findById(stickerObjectId);
  }

  async listStickersByUserId(
    userId: string,
    currentUserId: string,
  ): Promise<Sticker[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const currentUserObjectId = MongoUtils.toObjectId(
      currentUserId,
      "ID de usuário inválido",
    );

    PermissionUtils.verifyOwnership(
      currentUserObjectId,
      userObjectId,
      "figurinhas do usuário",
    );

    return this.stickerRepository.findByUserId(userObjectId);
  }

  async listStickersByPackId(packId: string): Promise<Sticker[]> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    return this.stickerRepository.findByPackId(packObjectId);
  }

  async updateSticker(
    id: string,
    userId: string,
    updateData: UpdateStickerDto,
  ): Promise<Sticker> {
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
      throw AppError.notFound("Figurinha não encontrada", "STICKER_NOT_FOUND");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const author = await this.resolveAuthor(userObjectId, updateData.author);

    const updatedSticker = await this.stickerRepository.update(
      stickerObjectId,
      userObjectId,
      {
        ...updateData,
        author,
      },
    );
    if (!updatedSticker) {
      throw AppError.internal(
        "Não foi possível atualizar a figurinha. Tente novamente em instantes.",
        "STICKER_UPDATE_FAILED",
      );
    }

    return updatedSticker;
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
      throw AppError.notFound("Figurinha não encontrada", "STICKER_NOT_FOUND");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const packStickersCount = await this.stickerRepository.countByPackId(
      existingSticker.pack_id,
    );
    if (packStickersCount <= MIN_STICKERS_PER_PACK) {
      throw PackRulesError.min();
    }

    const deleted = await this.stickerRepository.delete(
      stickerObjectId,
      userObjectId,
    );
    if (!deleted) {
      throw AppError.internal(
        "Não foi possível excluir a figurinha. Tente novamente em instantes.",
        "STICKER_DELETE_FAILED",
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

    if (existingSticker.size_bytes > 0) {
      await this.userRepository.incrementStorageUsedBytes(
        userObjectId,
        -existingSticker.size_bytes,
      );
    }

    const fileIdentifier =
      existingSticker.file_key || existingSticker.cloudinary_id;
    if (fileIdentifier) {
      await this.uploadService.deleteQuietly(fileIdentifier);
    }

    return existingSticker;
  }

  private async resolveAuthor(
    userObjectId: ObjectId,
    requestedAuthor: string,
  ): Promise<string> {
    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user) {
      throw new UserNotFoundError();
    }

    const sanitizedUser = UserUtils.applyDefaults(user);
    const isMaster = sanitizedUser.subscription.type === "MESTRE";
    const customAuthor = requestedAuthor.trim();

    return isMaster && customAuthor ? customAuthor : sanitizedUser.userName;
  }
}
