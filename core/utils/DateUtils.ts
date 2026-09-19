export class DateUtils {
  static readonly BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;
  static readonly DEFAULT_TIMEZONE = "America/Sao_Paulo";

  static toBrasiliaDate(utcDate: Date = new Date()): Date {
    return new Date(utcDate.getTime() + this.BRASILIA_OFFSET_MS);
  }

  static formatDateTime(
    date: Date = new Date(),
    timeZone: string = DateUtils.DEFAULT_TIMEZONE,
  ): string {
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone,
    }).format(date);

    return `${formatted.replace(",", " às")} (Horário de Brasília)`;
  }

  static getIsoWeekIdentifier(
    brasiliaDate: Date = DateUtils.toBrasiliaDate(),
  ): string {
    const thursday = new Date(brasiliaDate);
    const dayOfWeek = brasiliaDate.getUTCDay();
    const daysToThursday = (4 - dayOfWeek + 7) % 7;
    thursday.setUTCDate(brasiliaDate.getUTCDate() + daysToThursday);

    const year = thursday.getUTCFullYear();

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));

    const weekNumber =
      Math.floor(
        (thursday.getTime() - startOfWeek1.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ) + 1;

    return `${year}-W${String(weekNumber).padStart(2, "0")}`;
  }

  static getMondayOfWeek(
    brasiliaDate: Date = DateUtils.toBrasiliaDate(),
  ): Date {
    const dayOfWeek = brasiliaDate.getUTCDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(brasiliaDate);
    monday.setUTCDate(brasiliaDate.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }

  static getDayIndexFromMonday(
    brasiliaDate: Date = DateUtils.toBrasiliaDate(),
  ): number {
    return (brasiliaDate.getUTCDay() + 6) % 7;
  }
}
