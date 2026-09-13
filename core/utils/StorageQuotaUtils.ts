export class StorageQuotaUtils {
  static readonly FREE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024;
  static readonly VIP_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

  static getLimitForUser(isVip: boolean): number {
    return isVip ? this.VIP_LIMIT_BYTES : this.FREE_LIMIT_BYTES;
  }

  static hasAvailableStorage(
    usedBytes: number,
    newBytes: number,
    isVip: boolean,
  ): boolean {
    const limit = this.getLimitForUser(isVip);
    return usedBytes + newBytes <= limit;
  }

  static formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }
}
