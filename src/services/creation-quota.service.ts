import { MongoUtils, QuotaUtils } from "@/utils";
import type { CreationQuotaRepository } from "@/models";

export interface QuotaSnapshotDto {
  cycleStart: string;
  packName: string | null;
  createdStickerCount: number;
  isUnlimited: boolean;
}

export class CreationQuotaService {
  constructor(
    private readonly creationQuotaRepository: CreationQuotaRepository,
  ) {}

  private buildSnapshot(
    cycleStart: Date,
    isVip: boolean,
    packName: string | null = null,
    createdStickerCount = 0,
  ): QuotaSnapshotDto {
    return {
      cycleStart: cycleStart.toISOString(),
      packName,
      createdStickerCount: isVip ? 0 : createdStickerCount,
      isUnlimited: isVip,
    };
  }

  private validatePackBinding(
    activePackName: string | null | undefined,
    requestedPackName: string,
  ): { allowed: boolean; reason?: string } {
    if (!activePackName) {
      return { allowed: true };
    }

    if (activePackName.toLowerCase() !== requestedPackName.toLowerCase()) {
      return {
        allowed: false,
        reason: `Sua criação grátis de hoje já está vinculada ao pack "${activePackName}". Você pode continuar nele até completar ${QuotaUtils.FREE_DAILY_STICKER_LIMIT} figurinhas.`,
      };
    }

    return { allowed: true };
  }

  async getQuota(userId: string, isVip: boolean): Promise<QuotaSnapshotDto> {
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    if (isVip) {
      return this.buildSnapshot(cycleStart, true);
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const record = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    return this.buildSnapshot(
      record?.cycle_start ?? cycleStart,
      false,
      record?.active_pack_name ?? null,
      record?.stickers_count ?? 0,
    );
  }

  async reservePack(
    userId: string,
    packName: string,
    isVip: boolean,
  ): Promise<QuotaSnapshotDto> {
    const cleanPackName = packName.trim();
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    if (isVip) {
      return this.buildSnapshot(cycleStart, true, cleanPackName);
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const existing = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    const packCheck = this.validatePackBinding(existing?.active_pack_name, cleanPackName);
    if (!packCheck.allowed) {
      throw new Error(packCheck.reason);
    }

    const updated = await this.creationQuotaRepository.reservePack(
      userObjectId,
      cycleDate,
      cycleStart,
      cleanPackName,
    );

    return this.buildSnapshot(
      updated.cycle_start,
      false,
      updated.active_pack_name,
      updated.stickers_count,
    );
  }

  async canCreate(
    userId: string,
    packName: string,
    stickerCount: number,
    isVip: boolean,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (isVip) {
      return { allowed: true };
    }

    const cleanPackName = packName.trim();
    const { cycleDate } = QuotaUtils.getCycleInfo();
    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");

    const record = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    const packCheck = this.validatePackBinding(record?.active_pack_name, cleanPackName);
    if (!packCheck.allowed) {
      return packCheck;
    }

    const currentCount = record?.stickers_count ?? 0;
    const count = stickerCount <= 0 ? 1 : stickerCount;
    if (currentCount + count > QuotaUtils.FREE_DAILY_STICKER_LIMIT) {
      const remaining = Math.max(
        0,
        QuotaUtils.FREE_DAILY_STICKER_LIMIT - currentCount,
      );
      return {
        allowed: false,
        reason:
          remaining === 0
            ? "Você já usou sua criação grátis de hoje. Volte amanhã ou assine o VIP para criar sem limites!"
            : `Você ainda pode criar ${remaining} figurinha(s) hoje neste pack no plano Free.`,
      };
    }

    return { allowed: true };
  }

  async commit(
    userId: string,
    packName: string,
    stickerCount: number,
    isVip: boolean,
  ): Promise<QuotaSnapshotDto> {
    const cleanPackName = packName.trim();
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    if (isVip) {
      return this.buildSnapshot(cycleStart, true, cleanPackName);
    }

    const check = await this.canCreate(userId, cleanPackName, stickerCount, false);
    if (!check.allowed) {
      throw new Error(check.reason || "Limite de cota excedido.");
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const updated = await this.creationQuotaRepository.incrementStickers(
      userObjectId,
      cycleDate,
      cycleStart,
      cleanPackName,
      stickerCount,
    );

    return this.buildSnapshot(
      updated.cycle_start,
      false,
      updated.active_pack_name,
      updated.stickers_count,
    );
  }

  async recordUsage(
    userId: string,
    packName: string,
    stickerCount: number,
    isVip: boolean,
  ): Promise<void> {
    if (isVip || stickerCount <= 0) {
      return;
    }

    const cleanPackName = packName.trim();
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();
    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");

    await this.creationQuotaRepository.incrementStickers(
      userObjectId,
      cycleDate,
      cycleStart,
      cleanPackName,
      stickerCount,
    );
  }
}

