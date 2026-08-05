export type EdgeType = "continue" | "branch";

export interface ChildRef {
  id: string;
  edgeType: EdgeType;
}

/**
 * A single story point in the quest tree. Named `QuestNode` rather than `Node`
 * to avoid colliding with the DOM's global `Node` type and React Flow's `Node` type.
 */
export interface QuestNode {
  id: string;
  name: string;
  description: string;
  questId: string;
  parent: string | null;
  children: ChildRef[];
  tags: string[];
  metadata: Record<string, unknown>;
}
