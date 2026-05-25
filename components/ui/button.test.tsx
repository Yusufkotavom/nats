import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Link from "next/link";

import { Button } from "./button";

describe("Button", () => {
  it("does not inject onClick into child link when no onClick prop is passed", () => {
    render(
      <Button asChild>
        <Link href="/budgeting">Budgeting</Link>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Budgeting" });
    expect(link.getAttribute("onclick")).toBeNull();
  });

  it("keeps click behavior when onClick is explicitly provided", () => {
    const handleClick = vi.fn();

    render(
      <Button asChild onClick={handleClick}>
        <Link href="/budgeting">Budgeting</Link>
      </Button>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Budgeting" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
