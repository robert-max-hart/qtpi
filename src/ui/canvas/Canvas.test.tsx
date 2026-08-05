import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addContinueNode, createTag, toggleNodeTag, createDocument } from "../../model/document";
import { Canvas } from "./Canvas";

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
});
