import sharp from "sharp";

export interface StickerConvertOptions {
  quality?: number;
}

export class SharpService {
  private readonly STICKER_SIZE = 512;
  private readonly TRAY_ICON_SIZE = 96;

  async convertToStatic(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
        fit: "fill",
      })
      .webp({
        quality: options?.quality ?? 80,
        effort: 6,
      })
      .toBuffer();
  }

  async convertToAnimated(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<Buffer> {
    return sharp(buffer, { animated: true })
      .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
        fit: "fill",
      })
      .webp({
        quality: options?.quality ?? 70,
        loop: 0,
        effort: 6,
      })
      .toBuffer();
  }

  async convertToStickerPackIcon(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(this.TRAY_ICON_SIZE, this.TRAY_ICON_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({
        quality: options?.quality ?? 80,
        effort: 6,
      })
      .toBuffer();
  }
}
