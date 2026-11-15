import { NetworkUtils } from "@/utils";

export class GeoHelper {
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

      if (!ip || NetworkUtils.isPrivateOrLocalIp(ip)) {
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
