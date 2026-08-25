import { describe, expect, it } from "vitest";
import { getStatusKind } from "@/lib/status";

describe("warna status", () => {
  it("memprioritaskan status bahaya yang juga mengandung kata positif", () => {
    expect(getStatusKind("Tidak Hadir")).toBe("danger");
  });

  it("membedakan sinyal keputusan", () => {
    expect(getStatusKind("Prioritas Tinggi")).toBe("warning");
    expect(getStatusKind("Perlu Tindakan")).toBe("danger");
    expect(getStatusKind("Aman")).toBe("positive");
  });
});
