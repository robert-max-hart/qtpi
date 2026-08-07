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

/** Constant object, shared by every branch edge, rather than a fresh literal per edge per call. */
const BRANCH_EDGE_STYLE = { strokeDasharray: "6 4" };

function sameTagColors(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((color, index) => color === b[index]);
}

/**
 * Converts the domain tree into the plain node/edge arrays React Flow renders.
 * A node in `collapsedIds` is still rendered, but its descendants are not -
 * `layoutTree` skips positioning them, and this filters nodes/edges down to
 * only what got a position.
 *
 * `previousNodesById`, if given, lets a node that hasn't actually changed
 * (same content, position, and selection) keep its exact previous object.
 * Without this, editing one node's name would give *every* node a new
 * object identity on every keystroke (the whole `document` is replaced on
 * every edit) - which both defeats `QuestNodeView`'s `memo` and forces React
 * Flow to re-measure every node's DOM size. Same object-identity issue
 * behind the earlier minimap-visibility bug, just for the whole tree
 * instead of just the minimap.
 */
export function buildGraph(
  document: TreeDocument,
  collapsedIds: ReadonlySet<string> = new Set(),
  selectedNodeId: string | null = null,
  previousNodesById?: ReadonlyMap<string, FlowNode>,
): FlowGraph {
  const positions = layoutTree(document, collapsedIds);
  const isVisible = (nodeId: string) => Boolean(positions[nodeId]);

  const nodes: FlowNode[] = Object.values(document.nodes)
    .filter((node) => isVisible(node.id))
    .map((node) => {
      const tagColors = node.tags
        .map((tagId) => document.tags[tagId]?.color)
        .filter((color): color is string => Boolean(color));
      const primaryColor = document.quests[node.questId].primaryColor;
      const hasChildren = node.children.length > 0;
      const isCollapsed = collapsedIds.has(node.id);
      const selected = node.id === selectedNodeId;
      const position = positions[node.id];

      const previous = previousNodesById?.get(node.id);
      const previousData = previous?.data as QuestNodeGraphData | undefined;
      const unchanged =
        previous !== undefined &&
        previous.selected === selected &&
        previous.position.x === position.x &&
        previous.position.y === position.y &&
        previousData !== undefined &&
        previousData.label === node.name &&
        previousData.description === node.description &&
        previousData.primaryColor === primaryColor &&
        previousData.hasChildren === hasChildren &&
        previousData.isCollapsed === isCollapsed &&
        sameTagColors(previousData.tagColors, tagColors);

      if (unchanged) return previous;

      const data: QuestNodeGraphData = {
        label: node.name,
        description: node.description,
        primaryColor,
        tagColors,
        hasChildren,
        isCollapsed,
      };

      return {
        id: node.id,
        type: "questNode",
        position,
        selected,
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
          style: child.edgeType === "branch" ? BRANCH_EDGE_STYLE : undefined,
        })),
    );

  return { nodes, edges };
}
