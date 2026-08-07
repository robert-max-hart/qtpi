import { describe, expect, it } from "vitest";
import { addBranchNode, addContinueNode, createDocument } from "../../model/document";
import { layoutTree } from "./layout";

describe("layoutTree", () => {
  it("places a lone root node", () => {
    const document = createDocument();
    const positions = layoutTree(document);

    expect(Object.keys(positions)).toEqual([document.rootId]);
    expect(positions[document.rootId].y).toBe(0);
  });

  it("keeps a continue chain in a single vertical column", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);

    const positions = layoutTree(step2.document);

    expect(positions[step1.nodeId].x).toBe(positions[document.rootId].x);
    expect(positions[step2.nodeId].x).toBe(positions[document.rootId].x);
  });

  it("increases y by a fixed step per depth", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);

    const positions = layoutTree(step2.document);
    const rootY = positions[document.rootId].y;
    const step1Y = positions[step1.nodeId].y;
    const step2Y = positions[step2.nodeId].y;

    expect(step1Y - rootY).toBe(step2Y - step1Y);
    expect(step1Y).toBeGreaterThan(rootY);
  });

  it("keeps the continue chain aligned with the parent even when a branch exists", () => {
    const document = createDocument();
    const continued = addContinueNode(document, document.rootId);
    const branched = addBranchNode(continued.document, document.rootId);

    const positions = layoutTree(branched.document);

    expect(positions[continued.nodeId].x).toBe(positions[document.rootId].x);
    expect(positions[branched.nodeId].x).not.toBe(positions[document.rootId].x);
  });

  it("gives each of several branches off the same parent a distinct x", () => {
    const document = createDocument();
    const first = addBranchNode(document, document.rootId);
    const second = addBranchNode(first.document, document.rootId);
    const third = addBranchNode(second.document, document.rootId);

    const positions = layoutTree(third.document);
    const xs = [first.nodeId, second.nodeId, third.nodeId].map((id) => positions[id].x);

    expect(new Set(xs).size).toBe(3);
  });

  it("does not overlap two branch subtrees of different sizes", () => {
    const document = createDocument();
    const branchA = addBranchNode(document, document.rootId);
    const branchAChild = addContinueNode(branchA.document, branchA.nodeId);
    const branchB = addBranchNode(branchAChild.document, document.rootId);

    const positions = layoutTree(branchB.document);

    expect(positions[branchA.nodeId].x).not.toBe(positions[branchB.nodeId].x);
    expect(positions[branchAChild.nodeId].x).toBe(positions[branchA.nodeId].x);
  });

  it("gives a branch's own continue chain a new, consistent column", () => {
    const document = createDocument();
    const branch = addBranchNode(document, document.rootId);
    const branchStep1 = addContinueNode(branch.document, branch.nodeId);
    const branchStep2 = addContinueNode(branchStep1.document, branchStep1.nodeId);

    const positions = layoutTree(branchStep2.document);

    expect(positions[branch.nodeId].x).toBe(positions[branchStep1.nodeId].x);
    expect(positions[branchStep1.nodeId].x).toBe(positions[branchStep2.nodeId].x);
  });

  it("positions a collapsed node itself but not its descendants", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);

    const positions = layoutTree(step2.document, new Set([document.rootId]));

    expect(Object.keys(positions)).toEqual([document.rootId]);
  });

  it("treats a collapsed node as a leaf for its siblings' layout", () => {
    const document = createDocument();
    const continued = addContinueNode(document, document.rootId);
    // Give `continued` two children of its own (a continue and a branch) so
    // its expanded subtree spans two columns - otherwise collapsing it
    // wouldn't actually change the width it reserves (a single leaf child
    // already only reserves one column).
    const continuedNext = addContinueNode(continued.document, continued.nodeId);
    const branchUnderContinued = addBranchNode(continuedNext.document, continued.nodeId);
    const branched = addBranchNode(branchUnderContinued.document, document.rootId);

    const collapsedPositions = layoutTree(branched.document, new Set([continued.nodeId]));
    const expandedPositions = layoutTree(branched.document);

    // Collapsing `continued` shrinks its reserved width from two columns to
    // one, which shifts its sibling branch's x closer in.
    expect(collapsedPositions[branched.nodeId].x).not.toBe(expandedPositions[branched.nodeId].x);
    expect(collapsedPositions[continued.nodeId]).toBeDefined();
    expect(collapsedPositions[continuedNext.nodeId]).toBeUndefined();
    expect(collapsedPositions[branchUnderContinued.nodeId]).toBeUndefined();
  });
});
