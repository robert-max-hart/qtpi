import { normalizeTagName, type TreeDocument } from "../model/document";
import type { QuestNode } from "../model/node";
import type { Quest } from "../model/quest";
import type { TagDefinition } from "../model/tag";
import type { FormatAdapter } from "./formatAdapter";

const SCHEMA_VERSION = 1;

interface SerializedDocumentV1 {
  schemaVersion: 1;
  rootId: string;
  nodes: Record<string, QuestNode>;
  quests: Record<string, Quest>;
  tags: Record<string, TagDefinition>;
}

/**
 * Rejects a structurally-broken document (dangling references, a node
 * reachable from more than one parent or a cycle) with a descriptive error,
 * rather than letting it through to crash later during layout/render - the
 * app's own mutation functions always produce a well-formed tree, but this is
 * a hand-editable flat file, so a bad edit is a real possibility. Walks
 * iteratively (not recursively) so a corrupt file with a cycle can't blow the
 * validator's own call stack either.
 */
function validateShape(payload: SerializedDocumentV1): void {
  if (!payload.nodes[payload.rootId]) {
    throw new Error(`Corrupt document: rootId "${payload.rootId}" has no matching node.`);
  }

  const visited = new Set<string>([payload.rootId]);
  const stack = [payload.rootId];

  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    const node = payload.nodes[nodeId];

    if (!payload.quests[node.questId]) {
      throw new Error(`Corrupt document: node "${nodeId}" references unknown quest "${node.questId}".`);
    }

    for (const child of node.children) {
      if (!payload.nodes[child.id]) {
        throw new Error(
          `Corrupt document: node "${nodeId}" has a child reference to unknown node "${child.id}".`,
        );
      }
      if (visited.has(child.id)) {
        throw new Error(
          `Corrupt document: node "${child.id}" is reachable from more than one parent (or forms a cycle).`,
        );
      }
      visited.add(child.id);
      stack.push(child.id);
    }
  }

  const seenTagNames = new Set<string>();
  for (const tag of Object.values(payload.tags)) {
    const normalized = normalizeTagName(tag.name);
    if (seenTagNames.has(normalized)) {
      throw new Error(`Corrupt document: more than one tag is named "${tag.name}".`);
    }
    seenTagNames.add(normalized);
  }
}

export const jsonFormat: FormatAdapter = {
  extension: "json",

  serialize(document: TreeDocument): string {
    const payload: SerializedDocumentV1 = {
      schemaVersion: SCHEMA_VERSION,
      rootId: document.rootId,
      nodes: document.nodes,
      quests: document.quests,
      tags: document.tags,
    };
    return JSON.stringify(payload, null, 2);
  },

  deserialize(text: string): TreeDocument {
    const payload = JSON.parse(text) as SerializedDocumentV1;
    if (payload.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported schema version: ${payload.schemaVersion}`);
    }
    validateShape(payload);
    return {
      rootId: payload.rootId,
      nodes: payload.nodes,
      quests: payload.quests,
      tags: payload.tags,
    };
  },
};
