import { MongoUtils, QuotaUtils } from "@/utils";
import type { CreationQuotaRepository, PackRepository } from "@/models";

export interface QuotaSnapshotDto {
  cycleStart: string;
  packName: string | null;
  createdStickerCount: number;
  isUnlimited: boolean;
}

export class CreationQuotaService {
  constructor(
    private readonly creationQuotaRepository: CreationQuotaRepository,
    private readonly packRepository?: PackRepository,
  ) {}

  async getQuota(userId: string, isVip: boolean): Promise<QuotaSnapshotDto> {
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    if (isVip) {
      return {
        cycleStart: cycleStart.toISOString(),
        packName: null,
        createdStickerCount: 0,
        isUnlimited: true,
      };
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const record = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    return {
      cycleStart: (record?.cycle_start ?? cycleStart).toISOString(),
      packName: record?.active_pack_name ?? null,
      createdStickerCount: record?.stickers_count ?? 0,
      isUnlimited: false,
    };
  }

  async reservePack(
    userId: string,
    packName: string,
    isVip: boolean,
  ): Promise<QuotaSnapshotDto> {
    const cleanPackName = packName.trim();
    const { cycleDate, cycleStart } = QuotaUtils.getCycleInfo();

    if (isVip) {
      return {
        cycleStart: cycleStart.toISOString(),
        packName: cleanPackName,
        createdStickerCount: 0,
        isUnlimited: true,
      };
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const existing = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    if (
      existing?.active_pack_name &&
      existing.active_pack_name.toLowerCase() !== cleanPackName.toLowerCase()
    ) {
      throw new Error(
        `Sua criação grátis de hoje já está vinculada ao pack "${existing.active_pack_name}". Você pode continuar nele até completar 3 figurinhas.`,
      );
    }

    const updated = await this.creationQuotaRepository.reservePack(
      userObjectId,
      cycleDate,
      cycleStart,
      cleanPackName,
    );

    return {
      cycleStart: updated.cycle_start.toISOString(),
      packName: updated.active_pack_name,
      createdStickerCount: updated.stickers_count,
      isUnlimited: false,
    };
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
      return {
        cycleStart: cycleStart.toISOString(),
        packName: cleanPackName,
        createdStickerCount: 0,
        isUnlimited: true,
      };
    }

    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const existing = await this.creationQuotaRepository.findByUserAndDate(
      userObjectId,
      cycleDate,
    );

    if (
      existing?.active_pack_name &&
      existing.active_pack_name.toLowerCase() !== cleanPackName.toLowerCase()
    ) {
      throw new Error(
        `Sua criação grátis de hoje já está vinculada ao pack "${existing.active_pack_name}".`,
      );
    }

    const updated = await this.creationQuotaRepository.incrementStickers(
      userObjectId,
      cycleDate,
      cycleStart,
      cleanPackName,
      stickerCount,
    );

    return {
      cycleStart: updated.cycle_start.toISOString(),
      packName: updated.active_pack_name,
      createdStickerCount: updated.stickers_count,
      isUnlimited: false,
    };
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

    const activePack = record?.active_pack_name;
    if (
      activePack &&
      activePack.toLowerCase() !== cleanPackName.toLowerCase()
    ) {
      return {
        allowed: false,
        reason: `Sua criação grátis de hoje já está vinculada ao pack "${activePack}". Você pode continuar nele até completar 3 figurinhas.`,
      };
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
