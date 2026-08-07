import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  addBranchNode,
  addContinueNode,
  createDocument,
  createTag,
} from "../../model/document";
import { InspectorPanel } from "./InspectorPanel";

describe("InspectorPanel", () => {
  it("shows a placeholder when nothing is selected", () => {
    const document = createDocument();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={null}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByText("Select a node to inspect it.")).toBeInTheDocument();
  });

  it("shows the selected node's name and description", () => {
    const document = createDocument();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Root");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Notes")).toHaveValue("");
  });

  it("saves name edits instantly, with no save button", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Arrive at the mill" } });

    expect(onChangeDocument).toHaveBeenCalledTimes(1);
    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.nodes[document.rootId].name).toBe("Arrive at the mill");
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("saves description edits instantly", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A quiet start." } });

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.nodes[document.rootId].description).toBe("A quiet start.");
  });

  it("saves notes edits instantly", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Only the author should see this." } });

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.nodes[document.rootId].notes).toBe("Only the author should see this.");
  });

  it("adds a continue node and selects it", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    const onSelectNode = vi.fn();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add continue node" }));

    const updated = onChangeDocument.mock.calls[0][0];
    const newNodeId = onSelectNode.mock.calls[0][0];
    expect(updated.nodes[document.rootId].children).toEqual([{ id: newNodeId, edgeType: "continue" }]);
  });

  it("disables 'Add continue node' once the node already has a continuation", () => {
    const document = createDocument();
    const { document: withContinue } = addContinueNode(document, document.rootId);

    render(
      <InspectorPanel
        document={withContinue}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add continue node" })).toBeDisabled();
  });

  it("adds a branch node and selects it", () => {
    const document = createDocument();
    const onChangeDocument = vi.fn();
    const onSelectNode = vi.fn();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add branch node" }));

    const updated = onChangeDocument.mock.calls[0][0];
    const newNodeId = onSelectNode.mock.calls[0][0];
    expect(updated.nodes[newNodeId].questId).not.toBe(document.nodes[document.rootId].questId);
  });

  it("disables deletion of the root node and explains why", () => {
    const document = createDocument();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete node" })).toBeDisabled();
    expect(screen.getByText("The root node cannot be deleted.")).toBeInTheDocument();
  });

  it("disables deletion of a node that has children and explains why", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const { document: withGrandchild } = addContinueNode(withChild, nodeId);

    render(
      <InspectorPanel
        document={withGrandchild}
        selectedNodeId={nodeId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete node" })).toBeDisabled();
    expect(screen.getByText(/has children/)).toBeInTheDocument();
  });

  it("deletes a childless, non-root node and clears the selection", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const onChangeDocument = vi.fn();
    const onSelectNode = vi.fn();

    render(
      <InspectorPanel
        document={withChild}
        selectedNodeId={nodeId}
        onChangeDocument={onChangeDocument}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete node" }));

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.nodes[nodeId]).toBeUndefined();
    expect(onSelectNode).toHaveBeenCalledWith(null);
  });

  it("allows branching off a node that already has a branch", () => {
    const document = createDocument();
    const { document: withBranch } = addBranchNode(document, document.rootId);

    render(
      <InspectorPanel
        document={withBranch}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add branch node" })).not.toBeDisabled();
  });

  it("shows the selected node's quest color and lets it be overridden", () => {
    const document = createDocument();
    const questId = document.nodes[document.rootId].questId;
    const onChangeDocument = vi.fn();

    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Quest color")).toHaveValue(document.quests[questId].primaryColor);

    fireEvent.change(screen.getByLabelText("Quest color"), { target: { value: "#123456" } });

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.quests[questId].primaryColor).toBe("#123456");
  });

  it("shows a hint instead of a tag list when no tags exist yet", () => {
    const document = createDocument();
    render(
      <InspectorPanel
        document={document}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByText(/No tags yet/)).toBeInTheDocument();
  });

  it("toggles a tag onto and off of the selected node", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const onChangeDocument = vi.fn();

    render(
      <InspectorPanel
        document={withTag}
        selectedNodeId={document.rootId}
        onChangeDocument={onChangeDocument}
        onSelectNode={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /Foreshadowing/ });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    const updated = onChangeDocument.mock.calls[0][0];
    expect(updated.nodes[document.rootId].tags).toEqual([tagId]);
  });

  it("shows a tag as already checked when the node has it", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = {
      ...withTag,
      nodes: {
        ...withTag.nodes,
        [document.rootId]: { ...withTag.nodes[document.rootId], tags: [tagId] },
      },
    };

    render(
      <InspectorPanel
        document={tagged}
        selectedNodeId={document.rootId}
        onChangeDocument={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /Foreshadowing/ })).toBeChecked();
  });
});
