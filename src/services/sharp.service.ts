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

  private async encodeAnimatedWebp(
    buffer: Buffer,
    params: {
      size: number;
      fit: "fill" | "cover";
      position?: "center";
      initialPages: number;
      initialQuality: number;
      maxBytes: number;
    },
  ): Promise<Buffer> {
    const tiers: Array<[number, number]> = [
      [params.initialPages, params.initialQuality],
      [Math.max(1, Math.min(params.initialPages, 24)), 50],
      [Math.max(1, Math.min(params.initialPages, 16)), 40],
      [Math.max(1, Math.min(params.initialPages, 12)), 35],
    ];

    let result = Buffer.alloc(0);
    for (const [pages, quality] of tiers) {
      result = await sharp(buffer, { animated: true, pages })
        .resize(params.size, params.size, {
          fit: params.fit,
          ...(params.position ? { position: params.position } : {}),
        })
        .webp({
          quality,
          loop: 0,
          effort: 4,
          minSize: false,
        })
        .toBuffer();

      if (result.length <= params.maxBytes) {
        return result;
      }
    }

    return result;
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

    return this.encodeAnimatedWebp(buffer, {
      size: this.STICKER_SIZE,
      fit: "fill",
      initialPages: pages,
      initialQuality: options?.quality ?? 60,
      maxBytes: this.WHATSAPP_STICKER_MAX_BYTES,
    });
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
        this.encodeAnimatedWebp(buffer, {
          size: this.STICKER_SIZE,
          fit: "cover",
          position: "center",
          initialPages: pages,
          initialQuality: options?.quality ?? 75,
          maxBytes: this.WHATSAPP_STICKER_MAX_BYTES,
        }),
        sharp(buffer, { animated: true, pages })
          .resize(this.TRAY_ICON_SIZE, this.TRAY_ICON_SIZE, {
            fit: "cover",
            position: "center",
          })
          .webp({
            quality: options?.quality ?? 75,
            loop: 0,
            effort: 4,
            minSize: false,
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
