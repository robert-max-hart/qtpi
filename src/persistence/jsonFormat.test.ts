import { describe, expect, it } from "vitest";
import { addBranchNode, addContinueNode, createDocument } from "../model/document";
import { jsonFormat } from "./jsonFormat";

describe("jsonFormat", () => {
  it("round-trips a document unchanged", () => {
    const document = createDocument();
    const { document: withContinue, nodeId } = addContinueNode(document, document.rootId);
    const { document: withBranch } = addBranchNode(withContinue, nodeId);

    const text = jsonFormat.serialize(withBranch);
    const restored = jsonFormat.deserialize(text);

    expect(restored).toEqual(withBranch);
  });

  it("rejects a document with an unsupported schema version", () => {
    const text = JSON.stringify({ schemaVersion: 2, rootId: "x", nodes: {}, quests: {}, tags: {} });

    expect(() => jsonFormat.deserialize(text)).toThrow(/Unsupported schema version/);
  });

  it("rejects a document whose rootId has no matching node", () => {
    const text = JSON.stringify({ schemaVersion: 1, rootId: "missing", nodes: {}, quests: {}, tags: {} });

    expect(() => jsonFormat.deserialize(text)).toThrow(/rootId "missing" has no matching node/);
  });

  it("rejects a node with a dangling child reference", () => {
    const document = createDocument();
    document.nodes[document.rootId].children.push({ id: "ghost", edgeType: "continue" });
    const text = jsonFormat.serialize(document);

    expect(() => jsonFormat.deserialize(text)).toThrow(/child reference to unknown node "ghost"/);
  });

  it("rejects a node reachable from more than one parent", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    // Manually forge a second edge into the same child, forming a diamond/cycle.
    const { document: withBranch, nodeId: branchId } = addBranchNode(withChild, document.rootId);
    withBranch.nodes[branchId].children.push({ id: nodeId, edgeType: "continue" });
    const text = jsonFormat.serialize(withBranch);

    expect(() => jsonFormat.deserialize(text)).toThrow(/reachable from more than one parent/);
  });

  it("rejects a node that references an unknown quest", () => {
    const document = createDocument();
    document.nodes[document.rootId].questId = "ghost-quest";
    const text = jsonFormat.serialize(document);

    expect(() => jsonFormat.deserialize(text)).toThrow(/references unknown quest "ghost-quest"/);
  });
});
