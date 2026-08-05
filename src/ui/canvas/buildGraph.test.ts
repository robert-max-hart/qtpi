import { describe, expect, it } from "vitest";
import {
  addBranchNode,
  addContinueNode,
  createDocument,
  createTag,
  toggleNodeTag,
  updateQuestColor,
} from "../../model/document";
import { buildGraph } from "./buildGraph";
import type { QuestNodeData } from "./QuestNodeView";
import { layoutTree } from "./layout";

describe("buildGraph", () => {
  it("emits one flow node per domain node, positioned per layoutTree", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);

    const { nodes } = buildGraph(withChild);
    const positions = layoutTree(withChild);

    expect(nodes).toHaveLength(2);
    const root = nodes.find((n) => n.id === document.rootId);
    const child = nodes.find((n) => n.id === nodeId);

    expect(root?.position).toEqual(positions[document.rootId]);
    expect(child?.position).toEqual(positions[nodeId]);
    expect(root?.data.label).toBe("Root");
  });

  it("emits one edge per parent-child link, from source to target", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);

    const { edges } = buildGraph(withChild);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: document.rootId, target: nodeId });
  });

  it("visually distinguishes branch edges from continue edges", () => {
    const document = createDocument();
    const continued = addContinueNode(document, document.rootId);
    const branched = addBranchNode(continued.document, document.rootId);

    const { edges } = buildGraph(branched.document);
    const continueEdge = edges.find((e) => e.target === continued.nodeId);
    const branchEdge = edges.find((e) => e.target === branched.nodeId);

    expect(continueEdge?.style).toBeUndefined();
    expect(branchEdge?.style).toMatchObject({ strokeDasharray: expect.any(String) });
  });

  it("carries each node's quest primary color", () => {
    const document = createDocument();
    const questId = document.nodes[document.rootId].questId;
    const recolored = updateQuestColor(document, questId, "#123456");

    const { nodes } = buildGraph(recolored);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeData).primaryColor).toBe("#123456");
  });

  it("carries a node's assigned tag colors, dropping any dangling tag ids", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, document.rootId, tagId);

    const { nodes } = buildGraph(tagged);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeData).tagColors).toEqual(["#e07a5f"]);
  });

  it("gives untagged nodes an empty tagColors array", () => {
    const document = createDocument();
    const { nodes } = buildGraph(document);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeData).tagColors).toEqual([]);
  });
});
