import { describe, expect, it } from "vitest";
import { addLocalDays, endOfLocalDay, localDateKey, startOfLocalDay, toDateTimeLocalValue } from "@/lib/date";

describe("tanggal operasional lokal", () => {
  it("membentuk kunci tanggal tanpa bergantung pada potongan tanggal hardcoded", () => {
    const value = new Date(2026, 7, 25, 23, 45);
    expect(localDateKey(value)).toBe("2026-08-25");
    expect(toDateTimeLocalValue(value)).toBe("2026-08-25T23:45");
  });

  it("menghitung batas hari dan perpindahan hari secara lokal", () => {
    const value = new Date(2026, 7, 25, 12, 30);
    expect(startOfLocalDay(value).getHours()).toBe(0);
    expect(endOfLocalDay(value).getHours()).toBe(23);
    expect(localDateKey(addLocalDays(value, 1))).toBe("2026-08-26");
  });
});
