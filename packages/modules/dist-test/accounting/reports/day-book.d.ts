import type { DayBookReport } from "./types";
/**
 * Generate the day book for a single calendar day.
 *
 * @param tenantId  Tenant scope
 * @param date      The day to generate the book for (time part is ignored)
 */
export declare function getDayBook(tenantId: string, date: Date): Promise<DayBookReport>;
//# sourceMappingURL=day-book.d.ts.map