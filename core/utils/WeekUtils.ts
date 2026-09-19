
import { DateUtils } from "./DateUtils";
 
 export class WeekUtils {
   static toBrasiliaDate(utcDate: Date = new Date()): Date {
     return DateUtils.toBrasiliaDate(utcDate);
   }
 
   static getIsoWeekIdentifier(
     brasiliaDate: Date = DateUtils.toBrasiliaDate(),
   ): string {
     return DateUtils.getIsoWeekIdentifier(brasiliaDate);
   }
 
   static getMondayOfWeek(
     brasiliaDate: Date = DateUtils.toBrasiliaDate(),
   ): Date {
     return DateUtils.getMondayOfWeek(brasiliaDate);
   }
 
   static getDayIndexFromMonday(
     brasiliaDate: Date = DateUtils.toBrasiliaDate(),
   ): number {
     return DateUtils.getDayIndexFromMonday(brasiliaDate);
   }
 }
