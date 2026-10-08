import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders without requiring remote font classes", () => {
    const element = RootLayout({
      children: "content",
      params: Promise.resolve({}),
    });
    expect(element.props.className).toBe("h-full antialiased");
    expect(element.props.lang).toBe("en");
  });
});
