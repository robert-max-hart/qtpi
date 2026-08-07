import { describe, expect, it } from "vitest";
import { addBranchNode, addContinueNode, createDocument } from "../../model/document";
import { collapsedAncestorsOf } from "./collapse";

describe("collapsedAncestorsOf", () => {
  it("returns an empty array when no ancestor is collapsed", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);

    expect(collapsedAncestorsOf(step2.document, step2.nodeId, new Set())).toEqual([]);
  });

  it("finds a directly collapsed parent", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);

    const result = collapsedAncestorsOf(step1.document, step1.nodeId, new Set([document.rootId]));

    expect(result).toEqual([document.rootId]);
  });

  it("finds every collapsed ancestor up the chain, nearest first", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);
    const step2 = addContinueNode(step1.document, step1.nodeId);
    const step3 = addContinueNode(step2.document, step2.nodeId);

    const result = collapsedAncestorsOf(
      step3.document,
      step3.nodeId,
      new Set([document.rootId, step2.nodeId]),
    );

    expect(result).toEqual([step2.nodeId, document.rootId]);
  });

  it("does not include the node itself, even if it is in the collapsed set", () => {
    const document = createDocument();
    const step1 = addContinueNode(document, document.rootId);

    const result = collapsedAncestorsOf(step1.document, step1.nodeId, new Set([step1.nodeId]));

    expect(result).toEqual([]);
  });

  it("only walks the queried node's own ancestor chain, not sibling branches", () => {
    const document = createDocument();
    const branchA = addBranchNode(document, document.rootId);
    const branchB = addBranchNode(branchA.document, document.rootId);

    const result = collapsedAncestorsOf(branchB.document, branchB.nodeId, new Set([branchA.nodeId]));

    expect(result).toEqual([]);
  });

  it("returns an empty array for the root node", () => {
    const document = createDocument();

    expect(collapsedAncestorsOf(document, document.rootId, new Set([document.rootId]))).toEqual([]);
  });
});
