import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { ProductImage } from "./product-image";

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img {...props} />
  ),
}));

describe("ProductImage", () => {
  it("uses product image when src is provided", () => {
    render(
      <ProductImage
        src="https://example.com/product.jpg"
        alt="Udang Bakar"
        category="Menu Seafood"
        productId="prod-1"
      />,
    );

    const image = screen.getByAltText("Udang Bakar");
    expect(image).toHaveAttribute("src", "https://example.com/product.jpg");
  });

  it("uses local seafood fallback pool when src is empty", () => {
    render(
      <ProductImage
        src={null}
        alt="Gurame Bakar"
        category="Menu Ikan"
        productId="prod-2"
      />,
    );

    const image = screen.getByAltText("Gurame Bakar");
    expect(image.getAttribute("src")).toMatch(
      /^\/uploads\/seed\/seafood-pixabay\/seafood-\d{3}\.(jpg|png)$/,
    );
  });
});
