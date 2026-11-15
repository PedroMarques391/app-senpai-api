import type { StickerFit } from "@/dtos";
import sharp, { type ResizeOptions } from "sharp";

export interface StickerConvertOptions {
  quality?: number;
  maxSeconds?: number;
  maxFrames?: number;
  isAnimated?: boolean;
  fit?: StickerFit;
}

export class SharpService {
  private readonly STICKER_SIZE = 512;
  private readonly TRAY_ICON_SIZE = 96;
  private readonly WHATSAPP_STATIC_STICKER_MAX_BYTES = 100 * 1024;
  private readonly WHATSAPP_ANIMATED_STICKER_MAX_BYTES = 500 * 1024;
  private readonly WHATSAPP_TRAY_ICON_MAX_BYTES = 50 * 1024;

  private buildResizeOptions(
    fit: StickerFit = "fill",
    position?: "center",
  ): ResizeOptions {
    const options: ResizeOptions = { fit };

    if (position || fit === "cover" || fit === "contain") {
      options.position = position ?? "center";
    }

    if (fit === "contain") {
      options.background = { r: 0, g: 0, b: 0, alpha: 0 };
    }

    return options;
  }

  private async encodeStaticWebp(
    buffer: Buffer,
    params: {
      size: number;
      fit: StickerFit;
      position?: "center";
      page?: number;
      initialQuality: number;
      maxBytes: number;
    },
  ): Promise<Buffer> {
    const tiers: Array<{
      quality: number;
      alphaQuality: number;
      blur?: number;
    }> = [
      { quality: params.initialQuality, alphaQuality: 90 },
      { quality: Math.min(params.initialQuality, 65), alphaQuality: 80 },
      { quality: 50, alphaQuality: 70 },
      { quality: 35, alphaQuality: 60 },
      { quality: 20, alphaQuality: 45 },
      { quality: 10, alphaQuality: 30, blur: 0.8 },
      { quality: 5, alphaQuality: 20, blur: 1.5 },
      { quality: 1, alphaQuality: 10, blur: 2.5 },
    ];
    const resizeOptions = this.buildResizeOptions(params.fit, params.position);

    let result = Buffer.alloc(0);
    for (const tier of tiers) {
      let pipeline = sharp(
        buffer,
        params.page !== undefined ? { page: params.page } : undefined,
      ).resize(params.size, params.size, resizeOptions);

      if (tier.blur) {
        pipeline = pipeline.blur(tier.blur);
      }

      result = await pipeline
        .webp({
          quality: tier.quality,
          alphaQuality: tier.alphaQuality,
          effort: 6,
        })
        .toBuffer();

      if (result.length <= params.maxBytes) {
        return result;
      }
    }

    return result;
  }

  async convertToStatic(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<Buffer> {
    return this.encodeStaticWebp(buffer, {
      size: this.STICKER_SIZE,
      fit: options?.fit ?? "fill",
      initialQuality: options?.quality ?? 80,
      maxBytes: this.WHATSAPP_STATIC_STICKER_MAX_BYTES,
    });
  }

  private async encodeAnimatedWebp(
    buffer: Buffer,
    params: {
      size: number;
      fit: StickerFit;
      position?: "center";
      initialPages: number;
      initialQuality: number;
      maxBytes: number;
    },
  ): Promise<Buffer> {
    const cap = (maxPages: number) =>
      Math.max(1, Math.min(params.initialPages, maxPages));

    const tiers: Array<{
      pages: number;
      quality: number;
      alphaQuality: number;
      effort: number;
      minSize: boolean;
      blur?: number;
    }> = [
      {
        pages: params.initialPages,
        quality: params.initialQuality,
        alphaQuality: 85,
        effort: 4,
        minSize: false,
      },
      {
        pages: cap(36),
        quality: Math.min(params.initialQuality, 55),
        alphaQuality: 75,
        effort: 5,
        minSize: false,
      },
      {
        pages: cap(24),
        quality: 45,
        alphaQuality: 65,
        effort: 6,
        minSize: true,
      },
      {
        pages: cap(18),
        quality: 35,
        alphaQuality: 55,
        effort: 6,
        minSize: true,
      },
      {
        pages: cap(12),
        quality: 25,
        alphaQuality: 45,
        effort: 6,
        minSize: true,
      },
      {
        pages: cap(10),
        quality: 18,
        alphaQuality: 35,
        effort: 6,
        minSize: true,
        blur: 1.0,
      },
      {
        pages: cap(8),
        quality: 12,
        alphaQuality: 25,
        effort: 6,
        minSize: true,
        blur: 1.5,
      },
      {
        pages: cap(4),
        quality: 8,
        alphaQuality: 20,
        effort: 6,
        minSize: true,
        blur: 2.0,
      },
      {
        pages: 1,
        quality: 5,
        alphaQuality: 15,
        effort: 6,
        minSize: true,
        blur: 2.5,
      },
    ];
    const resizeOptions = this.buildResizeOptions(params.fit, params.position);

    let result = Buffer.alloc(0);
    for (const tier of tiers) {
      let pipeline = sharp(buffer, {
        animated: true,
        pages: tier.pages,
      }).resize(params.size, params.size, resizeOptions);

      if (tier.blur) {
        pipeline = pipeline.blur(tier.blur);
      }

      result = await pipeline
        .webp({
          quality: tier.quality,
          alphaQuality: tier.alphaQuality,
          loop: 0,
          effort: tier.effort,
          minSize: tier.minSize,
        })
        .toBuffer();

      if (result.length <= params.maxBytes) {
        return result;
      }
    }

    return result;
  }

  private async resolveAnimatedPages(
    buffer: Buffer,
    options?: StickerConvertOptions,
    defaultMaxFrames = 60,
  ): Promise<number> {
    const metadata = await sharp(buffer, { animated: true })
      .metadata()
      .catch(() => null);

    const avgDelay = metadata?.delay?.length
      ? metadata.delay.reduce((a, b) => a + b, 0) / metadata.delay.length
      : 100;

    const maxSeconds = options?.maxSeconds ?? 6;
    const framesInMaxSeconds = Math.round((maxSeconds * 1000) / avgDelay);
    const maxFramesCap = options?.maxFrames ?? defaultMaxFrames;

    return Math.max(
      1,
      Math.min(metadata?.pages || 1, framesInMaxSeconds, maxFramesCap),
    );
  }

  async convertToAnimated(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<Buffer> {
    const pages = await this.resolveAnimatedPages(buffer, options, 60);

    return this.encodeAnimatedWebp(buffer, {
      size: this.STICKER_SIZE,
      fit: options?.fit ?? "fill",
      initialPages: pages,
      initialQuality: options?.quality ?? 60,
      maxBytes: this.WHATSAPP_ANIMATED_STICKER_MAX_BYTES,
    });
  }

  async convertToStickerPackIcon(
    buffer: Buffer,
    options?: StickerConvertOptions,
  ): Promise<{ icon: Buffer; cover: Buffer }> {
    const isAnimated = options?.isAnimated ?? false;

    if (isAnimated) {
      const pages = await this.resolveAnimatedPages(buffer, options, 48);

      const [cover, icon] = await Promise.all([
        this.encodeAnimatedWebp(buffer, {
          size: this.STICKER_SIZE,
          fit: "cover",
          position: "center",
          initialPages: pages,
          initialQuality: options?.quality ?? 75,
          maxBytes: this.WHATSAPP_ANIMATED_STICKER_MAX_BYTES,
        }),
        this.encodeAnimatedWebp(buffer, {
          size: this.TRAY_ICON_SIZE,
          fit: "cover",
          position: "center",
          initialPages: pages,
          initialQuality: options?.quality ?? 75,
          maxBytes: this.WHATSAPP_TRAY_ICON_MAX_BYTES,
        }),
      ]);

      return { cover, icon };
    }

    const metadata = await sharp(buffer, { animated: true })
      .metadata()
      .catch(() => null);
    const pages = metadata?.pages || 1;
    const targetPage =
      pages > 1 ? Math.min(Math.floor(pages * 0.25), pages - 1) : 0;

    const [cover, icon] = await Promise.all([
      this.encodeStaticWebp(buffer, {
        size: this.STICKER_SIZE,
        fit: "cover",
        position: "center",
        page: targetPage,
        initialQuality: options?.quality ?? 85,
        maxBytes: this.WHATSAPP_STATIC_STICKER_MAX_BYTES,
      }),
      this.encodeStaticWebp(buffer, {
        size: this.TRAY_ICON_SIZE,
        fit: "cover",
        position: "center",
        page: targetPage,
        initialQuality: options?.quality ?? 80,
        maxBytes: this.WHATSAPP_TRAY_ICON_MAX_BYTES,
      }),
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
