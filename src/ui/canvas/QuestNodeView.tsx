import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

/** The pure, testable part of a node's view data - what `buildGraph` computes from the document. */
export interface QuestNodeGraphData extends Record<string, unknown> {
  label: string;
  primaryColor: string;
  tagColors: string[];
  hasChildren: boolean;
  isCollapsed: boolean;
}

/** `Canvas` adds the interactive callback on top of `buildGraph`'s pure data before rendering. */
export interface QuestNodeData extends QuestNodeGraphData {
  onToggleCollapse: () => void;
}

type QuestFlowNode = Node<QuestNodeData, "questNode">;

export function QuestNodeView({ data }: NodeProps<QuestFlowNode>) {
  return (
    <div className="quest-node" style={{ borderLeftColor: data.primaryColor }}>
      <Handle type="target" position={Position.Top} />
      <div className="quest-node-label">{data.label}</div>
      {data.tagColors.length > 0 && (
        <div className="quest-node-tags">
          {data.tagColors.map((color, index) => (
            <span key={index} className="tag-dot" style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
      {data.hasChildren && (
        <button
          type="button"
          className="quest-node-collapse-toggle nodrag"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggleCollapse();
          }}
          title={data.isCollapsed ? "Expand subtree" : "Collapse subtree"}
          aria-label={data.isCollapsed ? "Expand subtree" : "Collapse subtree"}
        >
          {data.isCollapsed ? "+" : "−"}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
