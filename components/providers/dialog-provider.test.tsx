import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DialogProvider, useDialog } from "./dialog-provider";

function ConfirmLauncher() {
  const { confirm } = useDialog();

  return (
    <button
      type="button"
      onClick={() =>
        confirm({
          title: "Post Invoice",
          description: "Invoice: INV-001\nCustomer: Acme\nTotal: Rp10.000",
        })
      }
    >
      Open confirm
    </button>
  );
}

describe("DialogProvider", () => {
  it("preserves multiline confirm descriptions for readable invoice summaries", () => {
    render(
      <DialogProvider>
        <ConfirmLauncher />
      </DialogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open confirm" }));

    expect(screen.getByText(/Invoice: INV-001/)).toHaveClass(
      "whitespace-pre-line",
    );
  });
});
