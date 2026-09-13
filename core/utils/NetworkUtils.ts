export class NetworkUtils {
  static getClientIp(
    requestHeaders: Record<string, string | string[] | undefined>,
    socketRemoteAddress?: string,
  ): string {
    const forwarded = requestHeaders["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      const firstIp = forwarded[0]?.trim();
      if (firstIp) return firstIp;
    }
    const cfIp = requestHeaders["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) {
      return cfIp.trim();
    }
    return socketRemoteAddress || "Desconhecido";
  }

  static parseDevice(userAgent?: string): string {
    if (!userAgent) return "Dispositivo não identificado";

    const os = this.getOperatingSystem(userAgent);
    const browser = this.getBrowser(userAgent);

    return `${browser} (${os})`;
  }

  private static getOperatingSystem(ua: string): string {
    switch (true) {
      case /windows/i.test(ua):
        return "Windows";
      case /macintosh|mac os x/i.test(ua):
        return "macOS";
      case /android/i.test(ua):
        return "Android";
      case /iphone|ipad|ipod/i.test(ua):
        return "iOS";
      case /linux/i.test(ua):
        return "Linux";
      default:
        return "Dispositivo";
    }
  }

  private static getBrowser(ua: string): string {
    switch (true) {
      case /edg/i.test(ua):
        return "Edge";
      case /opera|opr/i.test(ua):
        return "Opera";
      case /chrome|crios/i.test(ua):
        return "Chrome";
      case /firefox|fxios/i.test(ua):
        return "Firefox";
      case /safari/i.test(ua):
        return "Safari";
      default:
        return "Navegador";
    }
  }
}
