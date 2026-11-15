export class NetworkUtils {
  static isPrivateOrLocalIp(ip: string): boolean {
    if (!ip) return true;
    const cleanIp = ip.trim();
    if (
      cleanIp === "127.0.0.1" ||
      cleanIp === "::1" ||
      cleanIp === "localhost" ||
      cleanIp.startsWith("::ffff:127.")
    ) {
      return true;
    }

    const parts = cleanIp
      .replace(/^::ffff:/, "")
      .split(".")
      .map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
    }

    return false;
  }

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
