export class QuotaUtils {
  static readonly FREE_DAILY_STICKER_LIMIT = 3;


  static getCycleInfo(referenceDate: Date = new Date()): {
    cycleDate: string;
    cycleStart: Date;
  } {
    const brasilianOffset = -3 * 60 * 60 * 1000;
    const brasiliaDate = new Date(referenceDate.getTime() + brasilianOffset);

    const year = brasiliaDate.getUTCFullYear();
    const month = brasiliaDate.getUTCMonth();
    const day = brasiliaDate.getUTCDate();
    const hour = brasiliaDate.getUTCHours();

    let cycleYear = year;
    let cycleMonth = month;
    let cycleDay = day;

    if (hour < 6) {
      const prev = new Date(Date.UTC(year, month, day - 1));
      cycleYear = prev.getUTCFullYear();
      cycleMonth = prev.getUTCMonth();
      cycleDay = prev.getUTCDate();
    }

    const cycleStart = new Date(
      Date.UTC(cycleYear, cycleMonth, cycleDay, 9, 0, 0, 0),
    );

    const yyyy = cycleYear.toString();
    const mm = String(cycleMonth + 1).padStart(2, "0");
    const dd = String(cycleDay).padStart(2, "0");
    const cycleDate = `${yyyy}-${mm}-${dd}`;

    return { cycleDate, cycleStart };
  }
}
