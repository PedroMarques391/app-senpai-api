import type { VipType } from "@/models";
import type { PlanTier } from "@/types";

export class StorageQuotaUtils {
  static readonly FREE_LIMIT_BYTES = 536_870_912;
  static readonly VIP_PRO_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
  static readonly VIP_MASTER_LIMIT_BYTES = 20 * 1024 * 1024 * 1024;

  private static readonly LIMITS: Record<VipType, number> = {
    FREE: StorageQuotaUtils.FREE_LIMIT_BYTES,
    PRO: StorageQuotaUtils.VIP_PRO_LIMIT_BYTES,
    MESTRE: StorageQuotaUtils.VIP_MASTER_LIMIT_BYTES,
  };

  private static readonly PLAN_TIERS: Record<VipType, PlanTier> = {
    FREE: "free",
    PRO: "vip_pro",
    MESTRE: "vip_master",
  };

  static getLimit(type: VipType = "FREE"): number {
    return this.LIMITS[type] ?? this.FREE_LIMIT_BYTES;
  }

  static toPlanTier(type: VipType = "FREE"): PlanTier {
    return this.PLAN_TIERS[type] ?? "free";
  }

  static hasAvailableStorage(
    usedBytes: number,
    newBytes: number,
    type: VipType = "FREE",
  ): boolean {
    return usedBytes + newBytes <= this.getLimit(type);
  }

  static formatBytes(bytes: number): string {
    if (bytes === this.FREE_LIMIT_BYTES) {
      return "500 MB";
    }
    if (bytes >= 1024 * 1024 * 1024) {
      const gb = bytes / (1024 * 1024 * 1024);
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      const mb = bytes / (1024 * 1024);
      return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }
}
