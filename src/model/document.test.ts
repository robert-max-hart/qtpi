import { describe, expect, it } from "vitest";
import {
  addBranchNode,
  addContinueNode,
  createDocument,
  createTag,
  deleteNode,
  deleteTag,
  describeError,
  DocumentError,
  toggleNodeTag,
  updateNode,
  updateQuestColor,
  updateTag,
} from "./document";

describe("describeError", () => {
  it("returns a DocumentError's own message", () => {
    expect(describeError(new DocumentError("Node not found: x"))).toBe("Node not found: x");
  });

  it("falls back to a generic message for anything else", () => {
    expect(describeError(new Error("boom"))).toBe("Something went wrong.");
    expect(describeError("not even an error")).toBe("Something went wrong.");
  });
});

describe("createDocument", () => {
  it("always has exactly one root node with no parent", () => {
    const document = createDocument();
    const nodeIds = Object.keys(document.nodes);

    expect(nodeIds).toHaveLength(1);
    expect(document.nodes[document.rootId].parent).toBeNull();
  });

  it("creates exactly one quest whose start node is the root", () => {
    const document = createDocument();
    const questIds = Object.keys(document.quests);

    expect(questIds).toHaveLength(1);
    expect(document.quests[questIds[0]].startNodeId).toBe(document.rootId);
    expect(document.nodes[document.rootId].questId).toBe(questIds[0]);
  });
});

describe("addContinueNode", () => {
  it("inherits the parent's questId", () => {
    const document = createDocument();
    const { document: next, nodeId } = addContinueNode(document, document.rootId);

    expect(next.nodes[nodeId].questId).toBe(document.nodes[document.rootId].questId);
    expect(next.nodes[nodeId].parent).toBe(document.rootId);
  });

  it("records a 'continue' edge on the parent", () => {
    const document = createDocument();
    const { document: next, nodeId } = addContinueNode(document, document.rootId);

    expect(next.nodes[document.rootId].children).toEqual([
      { id: nodeId, edgeType: "continue" },
    ]);
  });

  it("rejects a second continue child on the same node", () => {
    const document = createDocument();
    const { document: next } = addContinueNode(document, document.rootId);

    expect(() => addContinueNode(next, document.rootId)).toThrow(DocumentError);
  });
});

describe("addBranchNode", () => {
  it("assigns a new questId, distinct from the parent's", () => {
    const document = createDocument();
    const parentQuestId = document.nodes[document.rootId].questId;
    const { document: next, nodeId, questId } = addBranchNode(document, document.rootId);

    expect(questId).not.toBe(parentQuestId);
    expect(next.nodes[nodeId].questId).toBe(questId);
    expect(next.quests[questId].startNodeId).toBe(nodeId);
  });

  it("records a 'branch' edge on the parent", () => {
    const document = createDocument();
    const { document: next, nodeId } = addBranchNode(document, document.rootId);

    expect(next.nodes[document.rootId].children).toEqual([
      { id: nodeId, edgeType: "branch" },
    ]);
  });

  it("auto-assigns each new quest a different primary color", () => {
    const document = createDocument();
    const first = addBranchNode(document, document.rootId);
    const second = addBranchNode(first.document, document.rootId);

    const firstColor = first.document.quests[first.questId].primaryColor;
    const secondColor = second.document.quests[second.questId].primaryColor;
    expect(firstColor).not.toBe(secondColor);
  });

  it("allows more than one branch off the same parent", () => {
    const document = createDocument();
    const first = addBranchNode(document, document.rootId);
    const second = addBranchNode(first.document, document.rootId);

    expect(second.document.nodes[document.rootId].children).toHaveLength(2);
  });
});

describe("deleteNode", () => {
  it("blocks deleting the root node even when it has no children", () => {
    const document = createDocument();
    expect(() => deleteNode(document, document.rootId)).toThrow(DocumentError);
  });

  it("blocks deleting a node that still has children", () => {
    const document = createDocument();
    const { document: withChild } = addContinueNode(document, document.rootId);

    expect(() => deleteNode(withChild, document.rootId)).toThrow(DocumentError);
  });

  it("deletes a childless leaf and detaches it from its parent", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);

    const result = deleteNode(withChild, nodeId);

    expect(result.nodes[nodeId]).toBeUndefined();
    expect(result.nodes[document.rootId].children).toEqual([]);
  });

  it("removes the quest record once its last node is deleted", () => {
    const document = createDocument();
    const { document: withBranch, nodeId, questId } = addBranchNode(document, document.rootId);

    const result = deleteNode(withBranch, nodeId);

    expect(result.quests[questId]).toBeUndefined();
  });

  it("keeps the quest record if other nodes still reference it", () => {
    const document = createDocument();
    const { document: withBranch, nodeId: branchId, questId } = addBranchNode(
      document,
      document.rootId,
    );
    const { document: withContinue, nodeId: leafId } = addContinueNode(withBranch, branchId);

    const result = deleteNode(withContinue, leafId);

    expect(result.quests[questId]).toBeDefined();
  });
});

describe("updateNode", () => {
  it("patches only the given fields", () => {
    const document = createDocument();
    const result = updateNode(document, document.rootId, { name: "Arrive at the mill" });

    expect(result.nodes[document.rootId].name).toBe("Arrive at the mill");
    expect(result.nodes[document.rootId].description).toBe("");
  });

  it("a new node's notes default to empty, and updateNode can patch them", () => {
    const document = createDocument();
    expect(document.nodes[document.rootId].notes).toBe("");

    const result = updateNode(document, document.rootId, { notes: "Private author notes." });

    expect(result.nodes[document.rootId].notes).toBe("Private author notes.");
  });
});

describe("updateQuestColor", () => {
  it("overrides the quest's primary color", () => {
    const document = createDocument();
    const questId = document.nodes[document.rootId].questId;

    const result = updateQuestColor(document, questId, "#123456");

    expect(result.quests[questId].primaryColor).toBe("#123456");
  });

  it("is immediately visible from every node in the quest, since nodes reference the quest by id", () => {
    const document = createDocument();
    const { document: withChild, nodeId } = addContinueNode(document, document.rootId);
    const questId = withChild.nodes[document.rootId].questId;

    const result = updateQuestColor(withChild, questId, "#123456");

    expect(result.quests[result.nodes[document.rootId].questId].primaryColor).toBe("#123456");
    expect(result.quests[result.nodes[nodeId].questId].primaryColor).toBe("#123456");
  });

  it("throws for an unknown quest", () => {
    const document = createDocument();
    expect(() => updateQuestColor(document, "does-not-exist", "#123456")).toThrow(DocumentError);
  });
});

describe("tags", () => {
  it("creates a tag with a name and color", () => {
    const document = createDocument();
    const { document: next, tagId } = createTag(document, "Foreshadowing", "#e07a5f");

    expect(next.tags[tagId]).toEqual({ id: tagId, name: "Foreshadowing", color: "#e07a5f" });
  });

  it("updates a tag's name and color", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");

    const result = updateTag(withTag, tagId, { name: "Renamed", color: "#000000" });

    expect(result.tags[tagId]).toEqual({ id: tagId, name: "Renamed", color: "#000000" });
  });

  it("throws when updating an unknown tag", () => {
    const document = createDocument();
    expect(() => updateTag(document, "does-not-exist", { name: "x" })).toThrow(DocumentError);
  });

  it("rejects creating a tag whose name (trimmed, case-insensitive) is already taken", () => {
    const document = createDocument();
    const { document: withTag } = createTag(document, "Foreshadowing", "#e07a5f");

    expect(() => createTag(withTag, "  foreshadowing  ", "#000000")).toThrow(
      'A tag named "  foreshadowing  " already exists.',
    );
  });

  it("rejects renaming a tag to a name another tag already has", () => {
    const document = createDocument();
    const { document: withFirst } = createTag(document, "Foreshadowing", "#e07a5f");
    const { document: withBoth, tagId: secondId } = createTag(withFirst, "Red herring", "#4a90d9");

    expect(() => updateTag(withBoth, secondId, { name: "foreshadowing" })).toThrow(DocumentError);
  });

  it("allows renaming a tag to its own current name (case/whitespace aside)", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");

    const result = updateTag(withTag, tagId, { name: "Foreshadowing" });

    expect(result.tags[tagId].name).toBe("Foreshadowing");
  });

  it("toggles a tag onto a node, then off again", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");

    const withTagOn = toggleNodeTag(withTag, document.rootId, tagId);
    expect(withTagOn.nodes[document.rootId].tags).toEqual([tagId]);

    const withTagOff = toggleNodeTag(withTagOn, document.rootId, tagId);
    expect(withTagOff.nodes[document.rootId].tags).toEqual([]);
  });

  it("throws when toggling an unknown tag", () => {
    const document = createDocument();
    expect(() => toggleNodeTag(document, document.rootId, "does-not-exist")).toThrow(DocumentError);
  });

  it("removes a deleted tag from every node that had it", () => {
    const document = createDocument();
    const { document: withTag, tagId } = createTag(document, "Foreshadowing", "#e07a5f");
    const { document: withChild, nodeId } = addContinueNode(withTag, document.rootId);
    const tagged = toggleNodeTag(toggleNodeTag(withChild, document.rootId, tagId), nodeId, tagId);

    const result = deleteTag(tagged, tagId);

    expect(result.tags[tagId]).toBeUndefined();
    expect(result.nodes[document.rootId].tags).toEqual([]);
    expect(result.nodes[nodeId].tags).toEqual([]);
  });

  it("throws when deleting an unknown tag", () => {
    const document = createDocument();
    expect(() => deleteTag(document, "does-not-exist")).toThrow(DocumentError);
  });
});
