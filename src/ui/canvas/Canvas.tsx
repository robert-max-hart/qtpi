import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, Panel, type Node as FlowNode } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TreeDocument } from "../../model/document";
import { buildGraph } from "./buildGraph";
import { collapsedAncestorsOf } from "./collapse";
import { QuestNodeView, type QuestNodeData, type QuestNodeGraphData } from "./QuestNodeView";
import { SearchPanel } from "./SearchPanel";

const nodeTypes = { questNode: QuestNodeView };

interface CanvasProps {
  document: TreeDocument;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export function Canvas({ document, selectedNodeId, onSelectNode }: CanvasProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [isMinimapVisible, setIsMinimapVisible] = useState(true);

  // A node's id is only ever stale here after New/Load swaps in a whole new
  // document (fresh ids) - drop anything that no longer exists.
  useEffect(() => {
    setCollapsedIds((prev) => {
      const next = new Set([...prev].filter((id) => document.nodes[id]));
      return next.size === prev.size ? prev : next;
    });
  }, [document]);

  // Whatever gets selected - a click, a search jump, "Add continue/branch
  // node" from the inspector - should always be visible, even if it's under
  // a collapsed ancestor.
  useEffect(() => {
    if (!selectedNodeId) return;
    setCollapsedIds((prev) => {
      const toExpand = collapsedAncestorsOf(document, selectedNodeId, prev);
      if (toExpand.length === 0) return prev;
      const next = new Set(prev);
      toExpand.forEach((id) => next.delete(id));
      return next;
    });
  }, [selectedNodeId, document]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const graph = buildGraph(document, collapsedIds);
    const nodes: FlowNode[] = graph.nodes.map((node) => {
      const data: QuestNodeData = {
        ...(node.data as QuestNodeGraphData),
        onToggleCollapse: () => toggleCollapse(node.id),
      };
      return { ...node, selected: node.id === selectedNodeId, data };
    });
    return { nodes, edges: graph.edges };
  }, [document, selectedNodeId, collapsedIds, toggleCollapse]);

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        colorMode="system"
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
      >
        <Background />
        <Controls showInteractive={false} />
        {isMinimapVisible && (
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => (node.data as QuestNodeData).primaryColor}
            nodeStrokeWidth={0}
          />
        )}
        <Panel position="top-left">
          <SearchPanel document={document} nodes={nodes} onSelectNode={onSelectNode} />
        </Panel>
        <Panel position="top-right">
          <button
            type="button"
            className="canvas-minimap-toggle"
            onClick={() => setIsMinimapVisible((visible) => !visible)}
          >
            {isMinimapVisible ? "Hide minimap" : "Show minimap"}
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
