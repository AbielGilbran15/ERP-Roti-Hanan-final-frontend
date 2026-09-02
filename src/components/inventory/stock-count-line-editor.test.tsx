import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StockCountLineEditor } from "@/components/inventory/stock-count-line-editor";
import type { StockCountDrafts } from "@/lib/stock-count";
import type { StockCountLine } from "@/lib/types";

vi.mock("@fluentui/react-components", async () => {
  const React = await import("react");
  return {
    Input: ({ contentBefore, contentAfter, onChange, ...props }: any) => React.createElement(
      "span",
      null,
      contentBefore,
      React.createElement("input", {
        ...props,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange?.(event, { value: event.currentTarget.value }),
      }),
      contentAfter,
    ),
    Button: ({ children, icon, appearance: _appearance, ...props }: any) => React.createElement("button", props, icon, children),
  };
});

const lines: StockCountLine[] = [{
  id: "line-1",
  stockId: "stock-1",
  productId: "raw-flour",
  warehouse: "Gudang Bahan Baku",
  lot: "TPG-001",
  systemQty: 376,
  varianceQty: 0,
}];
const products = [{ id: "raw-flour", name: "Tepung Terigu", stockUnit: "Kg" }];

function EditorHarness() {
  const [drafts, setDrafts] = useState<StockCountDrafts>({
    "line-1": { quantity: "", reason: "" },
  });

  return (
    <StockCountLineEditor
      lines={lines}
      products={products}
      drafts={drafts}
      setDrafts={setDrafts}
      canEdit
    />
  );
}

describe("StockCountLineEditor", () => {
  it("mempertahankan fokus saat nominal diketik berurutan", () => {
    render(<EditorHarness />);
    const input = screen.getByRole("textbox", { name: "Hasil fisik Tepung Terigu" });

    input.focus();
    fireEvent.change(input, { target: { value: "3" } });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "37" } });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "376" } });

    expect(document.activeElement).toBe(input);
    expect((input as HTMLInputElement).value).toBe("376");
  });
});
