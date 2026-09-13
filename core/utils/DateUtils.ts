export class DateUtils {
  static formatDateTime(
    date: Date = new Date(),
    timeZone: string = "America/Sao_Paulo",
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
}
