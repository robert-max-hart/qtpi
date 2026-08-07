import { createContext, memo, useContext } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

/** The pure, testable part of a node's view data - what `buildGraph` computes from the document. */
export interface QuestNodeGraphData extends Record<string, unknown> {
  label: string;
  description: string;
  primaryColor: string;
  tagColors: string[];
  hasChildren: boolean;
  isCollapsed: boolean;
}

type QuestFlowNode = Node<QuestNodeGraphData, "questNode">;

/**
 * Supplies the collapse-toggle handler out-of-band from `data`, rather than
 * baking a per-node closure into it. `data` otherwise stays exactly what
 * `buildGraph` produced, which is what lets `buildGraph`'s object-identity
 * reuse (its `previousNodesById` param) and this component's `memo` actually
 * skip re-rendering a node whose content didn't change.
 */
const ToggleCollapseContext = createContext<(nodeId: string) => void>(() => {});
export const ToggleCollapseProvider = ToggleCollapseContext.Provider;

function QuestNodeViewComponent({ id, data }: NodeProps<QuestFlowNode>) {
  const onToggleCollapse = useContext(ToggleCollapseContext);

  return (
    <div className="quest-node" style={{ borderLeftColor: data.primaryColor }}>
      <Handle type="target" position={Position.Top} />
      <div className="quest-node-label">{data.label}</div>
      {data.description && <div className="quest-node-description">{data.description}</div>}
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
            onToggleCollapse(id);
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

/**
 * Memoized so an unaffected node (same `data`/`selected`/`position` object
 * identity - see `buildGraph`'s `previousNodesById` param) skips
 * re-rendering when a sibling node's content changes, rather than the whole
 * tree re-rendering on every keystroke.
 */
export const QuestNodeView = memo(QuestNodeViewComponent);
