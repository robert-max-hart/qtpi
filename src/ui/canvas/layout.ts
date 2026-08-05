import type { ChildRef, QuestNode } from "../../model/node";
import type { TreeDocument } from "../../model/document";

export const X_SPACING = 220;
export const Y_SPACING = 140;

export interface Position {
  x: number;
  y: number;
}

interface SubtreeLayout {
  width: number;
  centerX: number;
}

function orderedChildren(node: QuestNode): ChildRef[] {
  const continueChild = node.children.find((child) => child.edgeType === "continue");
  const branchChildren = node.children.filter((child) => child.edgeType === "branch");
  return continueChild ? [continueChild, ...branchChildren] : branchChildren;
}

/**
 * Lays a tree out top-down: a node's "continue" child always keeps the exact
 * same x as its parent (so a whole quest's linear chain stays in one vertical
 * column), while "branch" children reserve their own subtree width and fan
 * out to the side without overlapping their siblings.
 */
export function layoutTree(document: TreeDocument): Record<string, Position> {
  const positions: Record<string, Position> = {};

  function place(nodeId: string, leftBound: number, depth: number): SubtreeLayout {
    const node = document.nodes[nodeId];
    const children = orderedChildren(node);

    if (children.length === 0) {
      const centerX = leftBound + 0.5;
      positions[nodeId] = { x: centerX * X_SPACING, y: depth * Y_SPACING };
      return { width: 1, centerX };
    }

    let cursor = leftBound;
    let totalWidth = 0;
    let continueCenterX: number | null = null;

    for (const child of children) {
      const childLayout = place(child.id, cursor, depth + 1);
      if (child.edgeType === "continue") {
        continueCenterX = childLayout.centerX;
      }
      cursor += childLayout.width;
      totalWidth += childLayout.width;
    }

    const centerX = continueCenterX ?? leftBound + totalWidth / 2;
    positions[nodeId] = { x: centerX * X_SPACING, y: depth * Y_SPACING };
    return { width: totalWidth, centerX };
  }

  place(document.rootId, 0, 0);
  return positions;
}
