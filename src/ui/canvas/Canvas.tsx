import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Node as FlowNode } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TreeDocument } from "../../model/document";
import { buildGraph } from "./buildGraph";
import { QuestNodeView } from "./QuestNodeView";

const nodeTypes = { questNode: QuestNodeView };

interface CanvasProps {
  document: TreeDocument;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export function Canvas({ document, selectedNodeId, onSelectNode }: CanvasProps) {
  const { nodes, edges } = useMemo(() => {
    const graph = buildGraph(document);
    const nodes: FlowNode[] = graph.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
    return { nodes, edges: graph.edges };
  }, [document, selectedNodeId]);

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
      </ReactFlow>
    </div>
  );
}
