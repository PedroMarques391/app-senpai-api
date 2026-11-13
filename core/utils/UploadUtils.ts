import crypto from "node:crypto";

export type StandardUploadFolder = "avatars" | "banners" | "stickers";

export class UploadUtils {
  private static readonly TEMP_PREFIX = "temp";

  private static cleanIdentifier(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  }

  static normalizeFolder(folder: string = "stickers"): StandardUploadFolder {
    const clean = folder.toLowerCase().trim();
    if (clean === "avatar" || clean === "avatars") {
      return "avatars";
    }
    if (clean === "banner" || clean === "banners") {
      return "banners";
    }
    return "stickers";
  }

  static generateMetadata(
    userId: string,
    folder: string = "stickers",
  ): { folderPath: string; filename: string } {
    const normalizedFolder = this.normalizeFolder(folder);

    if (normalizedFolder === "avatars") {
      return { folderPath: `avatars/${userId}`, filename: "avatar.webp" };
    }

    if (normalizedFolder === "banners") {
      return { folderPath: `banners/${userId}`, filename: "banner.webp" };
    }

    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `${userId}_${timestamp}_${uniqueId}`;

    return {
      folderPath: `${this.TEMP_PREFIX}/${normalizedFolder}/${userId}`,
      filename,
    };
  }

  static verifyOwnership(
    publicId: string,
    userId: string,
    userName?: string,
  ): boolean {
    if (publicId.includes(`/${userId}/`) || publicId.includes(`/${userId}`)) {
      return true;
    }
    if (userName) {
      const username = this.cleanIdentifier(userName);
      if (
        publicId.includes(`/${username}/`) ||
        publicId.includes(`/${username}`)
      ) {
        return true;
      }
    }
    return false;
  }
}
