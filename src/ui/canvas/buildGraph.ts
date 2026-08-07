import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import type { TreeDocument } from "../../model/document";
import { layoutTree } from "./layout";
import type { QuestNodeGraphData } from "./QuestNodeView";

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * A rough estimate of `.quest-node`'s rendered size, given only as
 * `initialWidth`/`initialHeight` - React Flow uses that as a same-frame
 * placeholder and then defers to the real measured DOM size once available,
 * so it doesn't clip taller cards (e.g. ones with a tag row). It matters
 * because `buildGraph` rebuilds every node object from scratch on each call;
 * without *some* width/height on the object itself, `MiniMap` - which,
 * unlike the main canvas, has no fallback - renders nothing for a node until
 * the next resize-driven remeasurement happens to land after the most recent
 * rebuild, which in practice is close enough to "renders nothing at all".
 */
const QUEST_NODE_INITIAL_WIDTH = 150;
const QUEST_NODE_INITIAL_HEIGHT = 40;

/**
 * Converts the domain tree into the plain node/edge arrays React Flow renders.
 * A node in `collapsedIds` is still rendered, but its descendants are not -
 * `layoutTree` skips positioning them, and this filters nodes/edges down to
 * only what got a position.
 */
export function buildGraph(
  document: TreeDocument,
  collapsedIds: ReadonlySet<string> = new Set(),
): FlowGraph {
  const positions = layoutTree(document, collapsedIds);
  const isVisible = (nodeId: string) => Boolean(positions[nodeId]);

  const nodes: FlowNode[] = Object.values(document.nodes)
    .filter((node) => isVisible(node.id))
    .map((node) => {
      const tagColors = node.tags
        .map((tagId) => document.tags[tagId]?.color)
        .filter((color): color is string => Boolean(color));

      const data: QuestNodeGraphData = {
        label: node.name,
        primaryColor: document.quests[node.questId].primaryColor,
        tagColors,
        hasChildren: node.children.length > 0,
        isCollapsed: collapsedIds.has(node.id),
      };

      return {
        id: node.id,
        type: "questNode",
        position: positions[node.id],
        data,
        initialWidth: QUEST_NODE_INITIAL_WIDTH,
        initialHeight: QUEST_NODE_INITIAL_HEIGHT,
      };
    });

  const edges: FlowEdge[] = Object.values(document.nodes)
    .filter((node) => isVisible(node.id))
    .flatMap((node) =>
      node.children
        .filter((child) => isVisible(child.id))
        .map((child) => ({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
          style: child.edgeType === "branch" ? { strokeDasharray: "6 4" } : undefined,
        })),
    );

  return { nodes, edges };
}
