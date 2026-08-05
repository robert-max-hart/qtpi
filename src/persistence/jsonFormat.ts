import type { TreeDocument } from "../model/document";
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
    return {
      rootId: payload.rootId,
      nodes: payload.nodes,
      quests: payload.quests,
      tags: payload.tags,
    };
  },
};
