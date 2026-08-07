import { useEffect, useState, type KeyboardEvent } from "react";
import { useReactFlow, type Node as FlowNode } from "@xyflow/react";
import type { TreeDocument } from "../../model/document";

interface SearchPanelProps {
  document: TreeDocument;
  nodes: FlowNode[];
  onSelectNode: (nodeId: string) => void;
}

const MAX_RESULTS = 8;

/**
 * A search-by-name box that jumps the viewport to a match. Selecting a match
 * that's hidden under a collapsed ancestor relies on `Canvas` auto-expanding
 * collapsed ancestors whenever the selection changes - this just waits (via
 * the `nodes` prop, which reflects that) for the target to actually appear
 * before calling `fitView`, since it can't be framed before it's on-screen.
 */
export function SearchPanel({ document, nodes, onSelectNode }: SearchPanelProps) {
  const { fitView } = useReactFlow();
  const [query, setQuery] = useState("");
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocusId) return;
    if (!nodes.some((node) => node.id === pendingFocusId)) return;
    void fitView({ nodes: [{ id: pendingFocusId }], duration: 600, maxZoom: 1.5 });
    setPendingFocusId(null);
  }, [pendingFocusId, nodes, fitView]);

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? Object.values(document.nodes)
        .filter((node) => node.name.toLowerCase().includes(trimmed))
        .slice(0, MAX_RESULTS)
    : [];

  function jumpTo(nodeId: string) {
    onSelectNode(nodeId);
    setPendingFocusId(nodeId);
    setQuery("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && matches.length > 0) {
      jumpTo(matches[0].id);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div className="canvas-search">
      <input
        type="text"
        className="canvas-search-input"
        placeholder="Search nodes…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Search nodes"
      />
      {matches.length > 0 && (
        <ul className="canvas-search-results">
          {matches.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => jumpTo(node.id)}>
                {node.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
