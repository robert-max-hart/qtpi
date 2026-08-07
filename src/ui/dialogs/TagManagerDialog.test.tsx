import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDocument, createTag } from "../../model/document";
import { TagManagerDialog } from "./TagManagerDialog";

describe("TagManagerDialog", () => {
  it("shows a hint when there are no tags yet", () => {
    const document = createDocument();
    render(<TagManagerDialog document={document} onChangeDocument={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("No tags yet.")).toBeInTheDocument();
  });

  it("adds a new tag with a default name and color", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    render(
      <TagManagerDialog document={document} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));

    const updated = onChangeDocument.mock.calls[0][0];
    const tags = Object.values(updated.tags) as { name: string; color: string }[];
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("New Tag");
  });

  it("gives a second added tag a distinct default name instead of colliding", () => {
    const document = createDocument();
    const { document: withOne } = createTag(document, "New Tag", "#888888");
    const onChangeDocument = vi.fn();
    render(
      <TagManagerDialog document={withOne} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));

    const updated = onChangeDocument.mock.calls[0][0];
    const names = (Object.values(updated.tags) as { name: string }[]).map((t) => t.name).sort();
    expect(names).toEqual(["New Tag", "New Tag 2"]);
  });

  it("shows an error instead of applying a rename that collides with another tag", () => {
    const document = createDocument();
    const { document: withFirst, tagId: firstId } = createTag(document, "Foreshadowing", "#e07a5f");
    const { document: withBoth, tagId: secondId } = createTag(withFirst, "Red herring", "#4a90d9");
    const onChangeDocument = vi.fn();

    render(
      <TagManagerDialog document={withBoth} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Red herring name"), {
      target: { value: "Foreshadowing" },
    });

    expect(onChangeDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent('A tag named "Foreshadowing" already exists.');
    // Sanity: the other tag really is still there under its original name, untouched.
    expect(withBoth.tags[firstId].name).toBe("Foreshadowing");
    expect(withBoth.tags[secondId].name).toBe("Red herring");
  });

  it("renames a tag", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const onChangeDocument = vi.fn();

    render(
      <TagManagerDialog document={withTag} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Foreshadowing name"), {
      target: { value: "Renamed" },
    });

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.tags[tagId].name).toBe("Renamed");
  });

  it("recolors a tag", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const onChangeDocument = vi.fn();

    render(
      <TagManagerDialog document={withTag} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Foreshadowing color"), {
      target: { value: "#000000" },
    });

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.tags[tagId].color).toBe("#000000");
  });

  it("deletes a tag", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const onChangeDocument = vi.fn();

    render(
      <TagManagerDialog document={withTag} onChangeDocument={onChangeDocument} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.tags[tagId]).toBeUndefined();
  });

  it("closes when the Close button or the overlay is clicked", () => {
    const document = createDocument();
    const onClose = vi.fn();
    const { container } = render(
      <TagManagerDialog document={document} onChangeDocument={vi.fn()} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector(".dialog-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when clicking inside the dialog itself", () => {
    const document = createDocument();
    const onClose = vi.fn();
    render(<TagManagerDialog document={document} onChangeDocument={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByText("Manage Tags"));

    expect(onClose).not.toHaveBeenCalled();
  });
});
