import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the toolbar, canvas, and inspector regions", () => {
    render(<App />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Load")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
  });
});
