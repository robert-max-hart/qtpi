import type { QuestNode } from "./node";
import type { Quest } from "./quest";
import type { TagDefinition } from "./tag";

/**
 * The whole quest tree for one file/session. Named `TreeDocument` rather than
 * `Document` to avoid colliding with the DOM's global `Document` type.
 */
export interface TreeDocument {
  rootId: string;
  nodes: Record<string, QuestNode>;
  quests: Record<string, Quest>;
  tags: Record<string, TagDefinition>;
}

export class DocumentError extends Error {}

const QUEST_COLOR_PALETTE = [
  "#4a90d9",
  "#e07a5f",
  "#81b29a",
  "#f2cc8f",
  "#9b5de5",
  "#f15bb5",
  "#00bbf9",
  "#00f5d4",
  "#ef476f",
  "#ffd166",
  "#06d6a0",
  "#118ab2",
];

function nextQuestColor(document: TreeDocument): string {
  const usedCount = Object.keys(document.quests).length;
  return QUEST_COLOR_PALETTE[usedCount % QUEST_COLOR_PALETTE.length];
}

function generateId(): string {
  return crypto.randomUUID();
}

function requireNode(document: TreeDocument, nodeId: string): QuestNode {
  const node = document.nodes[nodeId];
  if (!node) {
    throw new DocumentError(`Node not found: ${nodeId}`);
  }
  return node;
}

/** A brand new document always has exactly one root node and one quest. */
export function createDocument(): TreeDocument {
  const rootId = generateId();
  const questId = generateId();

  const quest: Quest = {
    id: questId,
    name: "Quest 1",
    primaryColor: QUEST_COLOR_PALETTE[0],
    startNodeId: rootId,
  };

  const root: QuestNode = {
    id: rootId,
    name: "Root",
    description: "",
    notes: "",
    questId,
    parent: null,
    children: [],
    tags: [],
  };

  return {
    rootId,
    nodes: { [rootId]: root },
    quests: { [questId]: quest },
    tags: {},
  };
}

/** Adds a linear continuation of the parent's quest. A node may have at most one "continue" child. */
export function addContinueNode(
  document: TreeDocument,
  parentId: string,
): { document: TreeDocument; nodeId: string } {
  const parent = requireNode(document, parentId);
  if (parent.children.some((child) => child.edgeType === "continue")) {
    throw new DocumentError(
      "This node already has a continuation - only one 'continue' child is allowed per node.",
    );
  }

  const nodeId = generateId();
  const node: QuestNode = {
    id: nodeId,
    name: "New Node",
    description: "",
    notes: "",
    questId: parent.questId,
    parent: parentId,
    children: [],
    tags: [],
  };

  return {
    nodeId,
    document: {
      ...document,
      nodes: {
        ...document.nodes,
        [parentId]: {
          ...parent,
          children: [...parent.children, { id: nodeId, edgeType: "continue" }],
        },
        [nodeId]: node,
      },
    },
  };
}

/** Branches off the parent into a brand new quest, with an auto-assigned primary color. */
export function addBranchNode(
  document: TreeDocument,
  parentId: string,
): { document: TreeDocument; nodeId: string; questId: string } {
  const parent = requireNode(document, parentId);

  const nodeId = generateId();
  const questId = generateId();
  const quest: Quest = {
    id: questId,
    name: `Quest ${Object.keys(document.quests).length + 1}`,
    primaryColor: nextQuestColor(document),
    startNodeId: nodeId,
  };
  const node: QuestNode = {
    id: nodeId,
    name: "New Quest",
    description: "",
    notes: "",
    questId,
    parent: parentId,
    children: [],
    tags: [],
  };

  return {
    nodeId,
    questId,
    document: {
      ...document,
      nodes: {
        ...document.nodes,
        [parentId]: {
          ...parent,
          children: [...parent.children, { id: nodeId, edgeType: "branch" }],
        },
        [nodeId]: node,
      },
      quests: {
        ...document.quests,
        [questId]: quest,
      },
    },
  };
}

/**
 * Deletion is blocked while a node has children, and the root node can never
 * be deleted (a document must always have at least one node).
 */
export function deleteNode(document: TreeDocument, nodeId: string): TreeDocument {
  const node = requireNode(document, nodeId);

  if (nodeId === document.rootId) {
    throw new DocumentError(
      "Cannot delete the root node - a document must always have at least one node.",
    );
  }
  if (node.children.length > 0) {
    throw new DocumentError(
      "Cannot delete a node that has children - delete or reassign its children first.",
    );
  }

  const nodes = { ...document.nodes };
  delete nodes[nodeId];

  if (node.parent !== null) {
    const parent = nodes[node.parent];
    nodes[node.parent] = {
      ...parent,
      children: parent.children.filter((child) => child.id !== nodeId),
    };
  }

  const quests = { ...document.quests };
  const questStillUsed = Object.values(nodes).some((n) => n.questId === node.questId);
  if (!questStillUsed) {
    delete quests[node.questId];
  }

  return { ...document, nodes, quests };
}

export function updateNode(
  document: TreeDocument,
  nodeId: string,
  patch: Partial<Pick<QuestNode, "name" | "description" | "notes">>,
): TreeDocument {
  const node = requireNode(document, nodeId);
  return {
    ...document,
    nodes: {
      ...document.nodes,
      [nodeId]: { ...node, ...patch },
    },
  };
}

/** Overrides a quest's primary color. Every node in the quest shares it by reference, not by copy. */
export function updateQuestColor(document: TreeDocument, questId: string, color: string): TreeDocument {
  const quest = document.quests[questId];
  if (!quest) {
    throw new DocumentError(`Quest not found: ${questId}`);
  }
  return {
    ...document,
    quests: {
      ...document.quests,
      [questId]: { ...quest, primaryColor: color },
    },
  };
}

/** Tag names are compared trimmed and case-insensitively, so "Foo" and " foo " collide. */
function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

function isTagNameTaken(document: TreeDocument, name: string, excludeTagId?: string): boolean {
  const normalized = normalizeTagName(name);
  return Object.values(document.tags).some(
    (tag) => tag.id !== excludeTagId && normalizeTagName(tag.name) === normalized,
  );
}

export function createTag(
  document: TreeDocument,
  name: string,
  color: string,
): { document: TreeDocument; tagId: string } {
  if (isTagNameTaken(document, name)) {
    throw new DocumentError(`A tag named "${name}" already exists.`);
  }

  const tagId = generateId();
  const tag: TagDefinition = { id: tagId, name, color };
  return {
    tagId,
    document: { ...document, tags: { ...document.tags, [tagId]: tag } },
  };
}

export function updateTag(
  document: TreeDocument,
  tagId: string,
  patch: Partial<Pick<TagDefinition, "name" | "color">>,
): TreeDocument {
  const tag = document.tags[tagId];
  if (!tag) {
    throw new DocumentError(`Tag not found: ${tagId}`);
  }
  if (patch.name !== undefined && isTagNameTaken(document, patch.name, tagId)) {
    throw new DocumentError(`A tag named "${patch.name}" already exists.`);
  }
  return {
    ...document,
    tags: { ...document.tags, [tagId]: { ...tag, ...patch } },
  };
}

/** Deleting a tag removes it from every node that referenced it. */
export function deleteTag(document: TreeDocument, tagId: string): TreeDocument {
  if (!document.tags[tagId]) {
    throw new DocumentError(`Tag not found: ${tagId}`);
  }

  const tags = { ...document.tags };
  delete tags[tagId];

  const nodes = { ...document.nodes };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.tags.includes(tagId)) {
      nodes[id] = { ...node, tags: node.tags.filter((t) => t !== tagId) };
    }
  }

  return { ...document, tags, nodes };
}

/** Adds the tag to the node if it's absent, or removes it if it's already there. */
export function toggleNodeTag(document: TreeDocument, nodeId: string, tagId: string): TreeDocument {
  const node = requireNode(document, nodeId);
  if (!document.tags[tagId]) {
    throw new DocumentError(`Tag not found: ${tagId}`);
  }

  const tags = node.tags.includes(tagId)
    ? node.tags.filter((t) => t !== tagId)
    : [...node.tags, tagId];

  return {
    ...document,
    nodes: { ...document.nodes, [nodeId]: { ...node, tags } },
  };
}
