import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error to console.error too - not useful test noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders a fallback with the error message when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
