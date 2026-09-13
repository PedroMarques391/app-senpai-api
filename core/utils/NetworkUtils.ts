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

    let os = "Dispositivo";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
    else if (/linux/i.test(userAgent)) os = "Linux";

    let browser = "Navegador";
    if (/edg/i.test(userAgent)) browser = "Edge";
    else if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
    else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent)) browser = "Safari";
    else if (/opera|opr/i.test(userAgent)) browser = "Opera";

    return `${browser} (${os})`;
  }
}
