import { describe, expect, it } from "vitest";
import {
  addBranchNode,
  addContinueNode,
  createDocument,
  createTag,
  toggleNodeTag,
  updateNode,
  updateQuestColor,
} from "../../model/document";
import { buildGraph } from "./buildGraph";
import type { QuestNodeGraphData } from "./QuestNodeView";
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

  it("carries each node's description", () => {
    const document = createDocument();
    const described = updateNode(document, document.rootId, { description: "A short blurb." });

    const { nodes } = buildGraph(described);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeGraphData).description).toBe("A short blurb.");
  });

  it("gives every node an initial size hint", () => {
    // Without this, MiniMap (which has no fallback for an unmeasured node,
    // unlike the main canvas) renders nothing until a resize-driven
    // remeasurement happens to land after the most recent buildGraph call -
    // in practice, close to never, since buildGraph rebuilds every node
    // object from scratch on each call.
    const document = createDocument();

    const { nodes } = buildGraph(document);
    const root = nodes.find((n) => n.id === document.rootId);

    expect(root?.initialWidth).toBeGreaterThan(0);
    expect(root?.initialHeight).toBeGreaterThan(0);
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

    expect((root?.data as QuestNodeGraphData).primaryColor).toBe("#123456");
  });

  it("carries a node's assigned tag colors, dropping any dangling tag ids", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const tagged = toggleNodeTag(withTag, document.rootId, tagId);

    const { nodes } = buildGraph(tagged);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeGraphData).tagColors).toEqual(["#e07a5f"]);
  });

  it("gives untagged nodes an empty tagColors array", () => {
    const document = createDocument();
    const { nodes } = buildGraph(document);
    const root = nodes.find((n) => n.id === document.rootId);

    expect((root?.data as QuestNodeGraphData).tagColors).toEqual([]);
  });

  it("marks hasChildren and isCollapsed per node", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);

    const { nodes } = buildGraph(withChild, new Set([document.rootId]));
    const root = nodes.find((n) => n.id === document.rootId);
    const child = nodes.find((n) => n.id === nodeId);

    expect((root?.data as QuestNodeGraphData).hasChildren).toBe(true);
    expect((root?.data as QuestNodeGraphData).isCollapsed).toBe(true);
    // The child is hidden by its collapsed parent, so it isn't emitted at all.
    expect(child).toBeUndefined();
  });

  it("omits a collapsed node's descendants but keeps the node itself", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);
    const branch = addBranchNode(step2.document, document.rootId);

    const { nodes, edges } = buildGraph(branch.document, new Set([document.rootId]));

    expect(nodes.map((n) => n.id)).toEqual([document.rootId]);
    expect(edges).toEqual([]);
  });

  it("only hides descendants past the collapsed node, not siblings elsewhere in the tree", () => {
    const document = createDocument();
    const continued = addContinueNode(document, document.rootId);
    const branched = addBranchNode(continued.document, document.rootId);

    const { nodes } = buildGraph(branched.document, new Set([continued.nodeId]));

    expect(nodes.map((n) => n.id).sort()).toEqual(
      [document.rootId, continued.nodeId, branched.nodeId].sort(),
    );
  });
});
