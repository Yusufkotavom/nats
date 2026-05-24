import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { SearchableSelect } from "./searchable-select";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("SearchableSelect", () => {
  const options = [
    { value: "cust-1", label: "PT Alpha" },
    { value: "cust-2", label: "PT Beta" },
  ];

  it("opens on click and emits selected value", () => {
    const handleValueChange = vi.fn();

    render(
      <SearchableSelect
        options={options}
        value={null}
        onValueChange={handleValueChange}
        placeholder="Pilih customer"
      />,
    );

    fireEvent.click(screen.getByPlaceholderText("Pilih customer"));
    fireEvent.click(screen.getByText("PT Alpha"));

    expect(handleValueChange).toHaveBeenCalledWith("cust-1");
  });

  it("shows selected label after option is picked", () => {
    function Harness() {
      const [value, setValue] = useState<string | null>(null);

      return (
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={setValue}
          placeholder="Pilih customer"
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByPlaceholderText("Pilih customer"));
    fireEvent.click(screen.getByText("PT Beta"));

    expect(screen.getByDisplayValue("PT Beta")).toBeInTheDocument();
  });
});
