export class GeoUtils {
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

  static async lookupLocation(
    ip: string,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<string> {
    try {
      if (headers) {
        const city = headers["cf-ipcity"] as string | undefined;
        const region = headers["cf-region"] as string | undefined;
        const country = headers["cf-ipcountry"] as string | undefined;

        if (city || region || country) {
          return [city, region, country].filter(Boolean).join(", ");
        }
      }

      if (!ip || this.isPrivateOrLocalIp(ip)) {
        return "Rede local / Desenvolvimento";
      }

      const cleanIp = ip.replace(/^::ffff:/, "").trim();

      const response = await fetch(`https://ipwho.is/${cleanIp}`, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          const parts = [data.city, data.region, data.country].filter(Boolean);
          if (parts.length > 0) {
            return parts.join(", ");
          }
        }
      }
    } catch {}

    return "Não identificada";
  }
}
