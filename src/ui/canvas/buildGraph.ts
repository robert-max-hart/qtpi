import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import type { TreeDocument } from "../../model/document";
import { layoutTree } from "./layout";
import type { QuestNodeData } from "./QuestNodeView";

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Converts the domain tree into the plain node/edge arrays React Flow renders. */
export function buildGraph(document: TreeDocument): FlowGraph {
  const positions = layoutTree(document);

  const nodes: FlowNode[] = Object.values(document.nodes).map((node) => {
    const tagColors = node.tags
      .map((tagId) => document.tags[tagId]?.color)
      .filter((color): color is string => Boolean(color));

    const data: QuestNodeData = {
      label: node.name,
      primaryColor: document.quests[node.questId].primaryColor,
      tagColors,
    };

    return {
      id: node.id,
      type: "questNode",
      position: positions[node.id],
      data,
    };
  });

  const edges: FlowEdge[] = Object.values(document.nodes).flatMap((node) =>
    node.children.map((child) => ({
      id: `${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: "smoothstep",
      style: child.edgeType === "branch" ? { strokeDasharray: "6 4" } : undefined,
    })),
  );

  return { nodes, edges };
}
