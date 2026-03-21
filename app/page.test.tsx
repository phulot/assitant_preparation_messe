import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Page from "./page";

describe("Home page", () => {
  it("renders without crashing", () => {
    render(<Page />);
    expect(document.body).toBeTruthy();
  });
});
