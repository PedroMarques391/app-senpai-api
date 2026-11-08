import sharp from "sharp";

export interface StickerConvertOptions {
  quality?: number;
  maxSeconds?: number;
  maxFrames?: number;
  isAnimated?: boolean;
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
  ): Promise<{ icon: Buffer; cover: Buffer }> {
    const isAnimated = options?.isAnimated ?? false;

    if (isAnimated) {
      const metadata = await sharp(buffer, { animated: true })
        .metadata()
        .catch(() => null);

      const avgDelay = metadata?.delay?.length
        ? metadata.delay.reduce((a, b) => a + b, 0) / metadata.delay.length
        : 100;

      const maxSeconds = options?.maxSeconds ?? 6;
      const framesInMaxSeconds = Math.round((maxSeconds * 1000) / avgDelay);
      const maxFramesCap = options?.maxFrames ?? 48;

      const pages = Math.max(
        1,
        Math.min(metadata?.pages || 1, framesInMaxSeconds, maxFramesCap),
      );

      const [cover, icon] = await Promise.all([
        sharp(buffer, { animated: true, pages })
          .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
            fit: "cover",
            position: "center",
          })
          .webp({
            quality: options?.quality ?? 75,
            loop: 0,
            effort: 4,
            minSize: true,
          })
          .toBuffer(),
        sharp(buffer, { animated: true, pages })
          .resize(this.TRAY_ICON_SIZE, this.TRAY_ICON_SIZE, {
            fit: "cover",
            position: "center",
          })
          .webp({
            quality: options?.quality ?? 75,
            loop: 0,
            effort: 4,
            minSize: true,
          })
          .toBuffer(),
      ]);

      return { cover, icon };
    }

    const metadata = await sharp(buffer, { animated: true })
      .metadata()
      .catch(() => null);
    const pages = metadata?.pages || 1;
    const targetPage =
      pages > 1 ? Math.min(Math.floor(pages * 0.25), pages - 1) : 0;

    const baseSharp = sharp(buffer, { page: targetPage });

    const [cover, icon] = await Promise.all([
      baseSharp
        .clone()
        .resize(this.STICKER_SIZE, this.STICKER_SIZE, {
          fit: "cover",
          position: "center",
        })
        .webp({
          quality: options?.quality ?? 85,
          effort: 6,
        })
        .toBuffer(),
      baseSharp
        .clone()
        .resize(this.TRAY_ICON_SIZE, this.TRAY_ICON_SIZE, {
          fit: "cover",
          position: "center",
        })
        .webp({
          quality: options?.quality ?? 80,
          effort: 6,
        })
        .toBuffer(),
    ]);

    return { cover, icon };
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
