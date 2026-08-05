import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface QuestNodeData extends Record<string, unknown> {
  label: string;
  primaryColor: string;
  tagColors: string[];
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
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
