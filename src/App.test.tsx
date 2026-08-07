import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as fileIO from "./persistence/fileIO";

vi.mock("./persistence/fileIO", () => ({
  openDocument: vi.fn(),
  saveDocument: vi.fn(),
  saveDocumentAs: vi.fn(),
}));

function selectRootNode(container: HTMLElement) {
  const nodeEl = container.querySelector(".react-flow__node");
  fireEvent.click(nodeEl!);
}

function makeDirty(container: HTMLElement) {
  selectRootNode(container);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Edited root" } });
}

function getUnsavedDialog(): HTMLElement {
  return screen.getByText("Unsaved changes").closest(".dialog") as HTMLElement;
}

describe("App", () => {
  it("renders the toolbar, canvas, and inspector regions", () => {
    render(<App />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Load")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
  });
});

describe("App - unsaved changes guard", () => {
  beforeEach(() => {
    vi.mocked(fileIO.openDocument).mockReset();
    vi.mocked(fileIO.saveDocument).mockReset();
    vi.mocked(fileIO.saveDocumentAs).mockReset();
  });

  it("New resets immediately when there are no unsaved changes", () => {
    render(<App />);
    fireEvent.click(screen.getByText("New"));
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("New prompts for save/discard/cancel once the document is dirty", () => {
    const { container } = render(<App />);
    makeDirty(container);

    fireEvent.click(screen.getByText("New"));

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("Cancel dismisses the prompt and keeps the current document", () => {
    const { container } = render(<App />);
    makeDirty(container);
    fireEvent.click(screen.getByText("New"));

    fireEvent.click(within(getUnsavedDialog()).getByText("Cancel"));

    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    selectRootNode(container);
    expect(screen.getByLabelText("Name")).toHaveValue("Edited root");
  });

  it("Discard proceeds with the pending action without saving", () => {
    const { container } = render(<App />);
    makeDirty(container);
    fireEvent.click(screen.getByText("New"));

    fireEvent.click(within(getUnsavedDialog()).getByText("Discard"));

    expect(fileIO.saveDocument).not.toHaveBeenCalled();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    selectRootNode(container);
    expect(screen.getByLabelText("Name")).toHaveValue("Root");
  });

  it("Save from the prompt saves, then proceeds with the pending action", async () => {
    vi.mocked(fileIO.saveDocument).mockResolvedValue({ handle: null, fileName: "quest-tree.json" });
    const { container } = render(<App />);
    makeDirty(container);
    fireEvent.click(screen.getByText("New"));

    fireEvent.click(within(getUnsavedDialog()).getByText("Save"));

    await screen.findByText("Select a node to inspect it.");
    expect(fileIO.saveDocument).toHaveBeenCalled();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    selectRootNode(container);
    expect(screen.getByLabelText("Name")).toHaveValue("Root");
  });

  it("does not proceed with the pending action if the save is cancelled", async () => {
    vi.mocked(fileIO.saveDocument).mockResolvedValue(null);
    const { container } = render(<App />);
    makeDirty(container);
    fireEvent.click(screen.getByText("New"));

    fireEvent.click(within(getUnsavedDialog()).getByText("Save"));

    await vi.waitFor(() => expect(fileIO.saveDocument).toHaveBeenCalled());
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows an error banner when loading a file fails", async () => {
    vi.mocked(fileIO.openDocument).mockRejectedValue(new Error("bad json"));
    render(<App />);

    fireEvent.click(screen.getByText("Load"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load that file");
  });

  it("shows an error banner when saving fails", async () => {
    vi.mocked(fileIO.saveDocument).mockRejectedValue(new Error("disk full"));
    render(<App />);

    fireEvent.click(screen.getByText("Save"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the file");
  });

  it("clears a stale load/save error banner as soon as the document is edited", async () => {
    vi.mocked(fileIO.saveDocument).mockRejectedValue(new Error("disk full"));
    const { container } = render(<App />);
    fireEvent.click(screen.getByText("Save"));
    await screen.findByRole("alert");

    makeDirty(container);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
