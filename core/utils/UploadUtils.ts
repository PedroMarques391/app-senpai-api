export class UploadUtils {
  private static cleanUserName(userName: string): string {
    return userName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  }

  static generateMetadata(
    userName: string,
    baseFolder: string = "sticker",
  ): { folderPath: string; filename: string } {
    const username = this.cleanUserName(userName);
    const folderPath = `${baseFolder}/${username}`;

    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `${username}_${timestamp}_${uniqueId}`;

    return { folderPath, filename };
  }

  static verifyOwnership(publicId: string, userName: string): boolean {
    const username = this.cleanUserName(userName);
    return publicId.includes(`/${username}/`);
  }
}
