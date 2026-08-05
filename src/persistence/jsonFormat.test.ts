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
});
