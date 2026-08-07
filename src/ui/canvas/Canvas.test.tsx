import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  addContinueNode,
  createTag,
  toggleNodeTag,
  createDocument,
  updateNode,
  type TreeDocument,
} from "../../model/document";
import { Canvas } from "./Canvas";

/** Mimics App's controlled selectedNodeId, needed for tests that rely on selection round-tripping back in. */
function CanvasHarness({ document }: { document: TreeDocument }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  return <Canvas document={document} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />;
}

describe("Canvas", () => {
  it("calls onSelectNode with a node's id when it is clicked", () => {
    const document = createDocument();
    const onSelectNode = vi.fn();
    const { container } = render(
      <Canvas document={document} selectedNodeId={null} onSelectNode={onSelectNode} />,
    );

    const nodeEl = container.querySelector(".react-flow__node");
    expect(nodeEl).not.toBeNull();
    nodeEl!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectNode).toHaveBeenCalledWith(document.rootId);
  });

  it("calls onSelectNode with null when the background is clicked", () => {
    const document = createDocument();
    const onSelectNode = vi.fn();
    const { container } = render(
      <Canvas document={document} selectedNodeId={document.rootId} onSelectNode={onSelectNode} />,
    );

    const pane = container.querySelector(".react-flow__pane");
    expect(pane).not.toBeNull();
    pane!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectNode).toHaveBeenCalledWith(null);
  });

  it("marks the selected node with React Flow's selected class", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const { container } = render(
      <Canvas document={withChild} selectedNodeId={nodeId} onSelectNode={vi.fn()} />,
    );

    const selectedEl = container.querySelector(".react-flow__node.selected");
    expect(selectedEl).not.toBeNull();
    expect(selectedEl?.textContent).toBe("New Node");
  });

  it("renders the node's quest color as its left border accent", () => {
    const document = createDocument();
    const questId = document.nodes[document.rootId].questId;
    const { container } = render(
      <Canvas document={document} selectedNodeId={null} onSelectNode={vi.fn()} />,
    );

    const card = container.querySelector<HTMLElement>(".quest-node");
    expect(card?.style.borderLeftColor).toBe("rgb(74, 144, 217)");
    expect(document.quests[questId].primaryColor).toBe("#4a90d9");
  });

  it("does not render a node's notes on the canvas card", () => {
    const document = createDocument();
    const noted = updateNode(document, document.rootId, { notes: "Only the author should see this." });

    render(<Canvas document={noted} selectedNodeId={null} onSelectNode={vi.fn()} />);

    expect(screen.queryByText("Only the author should see this.")).not.toBeInTheDocument();
  });

  it("renders one tag dot per tag assigned to a node", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, document.rootId, tagId);

    const { container } = render(
      <Canvas document={tagged} selectedNodeId={null} onSelectNode={vi.fn()} />,
    );

    const dots = container.querySelectorAll(".tag-dot");
    expect(dots).toHaveLength(1);
    expect((dots[0] as HTMLElement).style.backgroundColor).toBe("rgb(224, 122, 95)");
  });

  // React Flow leaves un-measured nodes `visibility: hidden` in jsdom (no
  // real ResizeObserver), which makes testing-library's accessibility-aware
  // `getByRole` treat anything inside a node card as hidden. Reach in via a
  // plain DOM query instead, same as the existing `.quest-node`/`.tag-dot`
  // assertions above.
  function collapseToggle(container: HTMLElement): HTMLElement {
    const button = container.querySelector<HTMLElement>(".quest-node-collapse-toggle");
    expect(button).not.toBeNull();
    return button!;
  }

  it("does not show a collapse toggle on a leaf node", () => {
    const document = createDocument();
    const { container } = render(
      <Canvas document={document} selectedNodeId={null} onSelectNode={vi.fn()} />,
    );

    expect(container.querySelector(".quest-node-collapse-toggle")).toBeNull();
  });

  it("collapsing a node hides its descendants, and expanding it shows them again", () => {
    const document = createDocument();
    const { document: withChild } = addContinueNode(document, document.rootId);
    const { container } = render(
      <Canvas document={withChild} selectedNodeId={null} onSelectNode={vi.fn()} />,
    );

    expect(screen.getByText("New Node")).toBeInTheDocument();

    fireEvent.click(collapseToggle(container));
    expect(screen.queryByText("New Node")).not.toBeInTheDocument();
    expect(collapseToggle(container)).toHaveAttribute("aria-label", "Expand subtree");

    fireEvent.click(collapseToggle(container));
    expect(screen.getByText("New Node")).toBeInTheDocument();
  });

  it("clicking a collapse toggle does not also select the node", () => {
    const document = createDocument();
    const { document: withChild } = addContinueNode(document, document.rootId);
    const onSelectNode = vi.fn();
    const { container } = render(
      <Canvas document={withChild} selectedNodeId={null} onSelectNode={onSelectNode} />,
    );

    fireEvent.click(collapseToggle(container));

    expect(onSelectNode).not.toHaveBeenCalled();
  });

  it("toggles the minimap on and off", () => {
    const document = createDocument();
    const { container } = render(
      <Canvas document={document} selectedNodeId={null} onSelectNode={vi.fn()} />,
    );

    expect(container.querySelector(".react-flow__minimap")).not.toBeNull();

    fireEvent.click(screen.getByText("Hide minimap"));
    expect(container.querySelector(".react-flow__minimap")).toBeNull();

    fireEvent.click(screen.getByText("Show minimap"));
    expect(container.querySelector(".react-flow__minimap")).not.toBeNull();
  });

  it("search lists name matches and selecting one selects the node", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const named = updateNode(withChild, nodeId, { name: "Findable Child" });
    const onSelectNode = vi.fn();
    render(<Canvas document={named} selectedNodeId={null} onSelectNode={onSelectNode} />);

    fireEvent.change(screen.getByLabelText("Search nodes"), { target: { value: "findable" } });
    const result = screen.getByRole("button", { name: "Findable Child" });
    fireEvent.click(result);

    expect(onSelectNode).toHaveBeenCalledWith(nodeId);
  });

  it("search reveals a node hidden under a collapsed ancestor", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const named = updateNode(withChild, nodeId, { name: "Findable Child" });
    const { container } = render(<CanvasHarness document={named} />);

    fireEvent.click(collapseToggle(container));
    expect(screen.queryByText("Findable Child")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search nodes"), { target: { value: "findable" } });
    fireEvent.click(screen.getByRole("button", { name: "Findable Child" }));

    expect(screen.getByText("Findable Child")).toBeInTheDocument();
  });

  it("clears the search query after jumping to a result", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const named = updateNode(withChild, nodeId, { name: "Findable Child" });
    render(<CanvasHarness document={named} />);

    const searchInput = screen.getByLabelText("Search nodes") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "findable" } });
    fireEvent.click(screen.getByRole("button", { name: "Findable Child" }));

    expect(searchInput.value).toBe("");
  });

  it("tag search lists tag matches by name", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, document.rootId, tagId);
    render(<CanvasHarness document={tagged} />);

    fireEvent.change(screen.getByLabelText("Search tags"), { target: { value: "fore" } });

    expect(screen.getByRole("button", { name: "Foreshadowing" })).toBeInTheDocument();
  });

  it("tag search reveals a tagged node hidden under a collapsed ancestor", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const named = updateNode(withChild, nodeId, { name: "Findable Child" });
    const { document: withTag, tagId } = createTag(named, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, nodeId, tagId);
    const { container } = render(<CanvasHarness document={tagged} />);

    fireEvent.click(collapseToggle(container));
    expect(screen.queryByText("Findable Child")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tags"), { target: { value: "fore" } });
    fireEvent.click(screen.getByRole("button", { name: "Foreshadowing" }));

    expect(screen.getByText("Findable Child")).toBeInTheDocument();
  });

  it("clears the tag search query after jumping to a result", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, document.rootId, tagId);
    render(<CanvasHarness document={tagged} />);

    const searchInput = screen.getByLabelText("Search tags") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "fore" } });
    fireEvent.click(screen.getByRole("button", { name: "Foreshadowing" }));

    expect(searchInput.value).toBe("");
  });
});
