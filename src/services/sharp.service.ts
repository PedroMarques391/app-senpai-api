import sharp from "sharp";

export interface StickerConvertOptions {
  quality?: number;
  maxSeconds?: number;
  maxFrames?: number;
}

export class SharpService {
  private readonly STICKER_SIZE = 512;
  private readonly TRAY_ICON_SIZE = 96;
  private readonly WHATSAPP_STICKER_MAX_BYTES = 500 * 1024;

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
    const metadata = await sharp(buffer, { animated: true }).metadata();

    const avgDelay = metadata.delay?.length
      ? metadata.delay.reduce((a, b) => a + b, 0) / metadata.delay.length
      : 100;

    const maxSeconds = options?.maxSeconds ?? 6;
    const framesInMaxSeconds = Math.round((maxSeconds * 1000) / avgDelay);
    const maxFramesCap = options?.maxFrames ?? 60;

    const pages = Math.max(
      1,
      Math.min(metadata.pages || 1, framesInMaxSeconds, maxFramesCap),
    );

    let result = await sharp(buffer, { animated: true, pages })
      .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
        fit: "fill",
      })
      .webp({
        quality: options?.quality ?? 60,
        loop: 0,
        effort: 4,
        minSize: true,
      })
      .toBuffer();

    // Se ultrapassar os 500 KB do WhatsApp, tenta primeiro baixar a qualidade e ajustar para max 24 frames
    if (result.length > this.WHATSAPP_STICKER_MAX_BYTES) {
      result = await sharp(buffer, {
        animated: true,
        pages: Math.max(1, Math.min(pages, 24)),
      })
        .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
          fit: "fill",
        })
        .webp({
          quality: 50,
          loop: 0,
          effort: 4,
          minSize: true,
        })
        .toBuffer();
    }

    // Se ainda exceder 500 KB (caso extremo de ruído/cores), reduz para 16 frames em qualidade 40
    if (result.length > this.WHATSAPP_STICKER_MAX_BYTES) {
      result = await sharp(buffer, {
        animated: true,
        pages: Math.max(1, Math.min(pages, 16)),
      })
        .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
          fit: "fill",
        })
        .webp({
          quality: 40,
          loop: 0,
          effort: 4,
          minSize: true,
        })
        .toBuffer();
    }

    // Fallback garantido para casos com alto ruído: reduz para 12 frames em qualidade 35
    if (result.length > this.WHATSAPP_STICKER_MAX_BYTES) {
      result = await sharp(buffer, {
        animated: true,
        pages: Math.max(1, Math.min(pages, 12)),
      })
        .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
          fit: "fill",
        })
        .webp({
          quality: 35,
          loop: 0,
          effort: 4,
          minSize: true,
        })
        .toBuffer();
    }

    return result;
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

  async convertToAvatar(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(256, 256, {
        fit: "cover",
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();
  }

  async convertToBanner(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(1080, 360, {
        fit: "cover",
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();
  }
}
