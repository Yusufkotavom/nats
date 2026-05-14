import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

type LinkLikeProps = ComponentProps<"a">;

let capturedProps: LinkLikeProps | null = null;

function CaptureLink(props: LinkLikeProps) {
  capturedProps = props;
  return <a {...props} />;
}

describe("Button", () => {
  beforeEach(() => {
    capturedProps = null;
  });

  it("does not inject onClick into child link when no onClick prop is passed", () => {
    render(
      <Button asChild>
        <CaptureLink href="/budgeting">Budgeting</CaptureLink>
      </Button>,
    );

    expect(capturedProps).not.toBeNull();
    expect(capturedProps?.onClick).toBeUndefined();
  });

  it("keeps click behavior when onClick is explicitly provided", () => {
    const handleClick = vi.fn();

    render(
      <Button asChild onClick={handleClick}>
        <a href="/budgeting">Budgeting</a>
      </Button>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Budgeting" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
