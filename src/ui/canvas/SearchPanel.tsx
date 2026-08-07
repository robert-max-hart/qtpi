import { useEffect, useState, type KeyboardEvent } from "react";
import { useReactFlow, type Node as FlowNode } from "@xyflow/react";
import type { TreeDocument } from "../../model/document";

interface SearchPanelProps {
  document: TreeDocument;
  nodes: FlowNode[];
  onSelectNode: (nodeId: string) => void;
  onExpandAncestors: (nodeIds: string[]) => void;
}

const MAX_RESULTS = 8;
const FIT_VIEW_OPTIONS = { duration: 600, maxZoom: 1.5 };

/**
 * A name search (jumps to and selects one node) and a tag search (frames
 * every node carrying a matched tag, without selecting any one of them -
 * there's no single "right" node to select) stacked in one panel. Both rely
 * on `Canvas` auto-expanding collapsed ancestors of whatever they target -
 * this just waits (via the `nodes` prop, which reflects that) for the
 * target(s) to actually appear before calling `fitView`, since a node can't
 * be framed before it's on-screen.
 */
export function SearchPanel({ document, nodes, onSelectNode, onExpandAncestors }: SearchPanelProps) {
  const { fitView } = useReactFlow();
  const [nameQuery, setNameQuery] = useState("");
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [pendingFrameIds, setPendingFrameIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!pendingFocusId) return;
    if (!nodes.some((node) => node.id === pendingFocusId)) return;
    void fitView({ nodes: [{ id: pendingFocusId }], ...FIT_VIEW_OPTIONS });
    setPendingFocusId(null);
  }, [pendingFocusId, nodes, fitView]);

  useEffect(() => {
    if (!pendingFrameIds) return;
    if (!pendingFrameIds.every((id) => nodes.some((node) => node.id === id))) return;
    void fitView({ nodes: pendingFrameIds.map((id) => ({ id })), ...FIT_VIEW_OPTIONS });
    setPendingFrameIds(null);
  }, [pendingFrameIds, nodes, fitView]);

  const trimmedName = nameQuery.trim().toLowerCase();
  const nameMatches = trimmedName
    ? Object.values(document.nodes)
        .filter((node) => node.name.toLowerCase().includes(trimmedName))
        .slice(0, MAX_RESULTS)
    : [];

  const trimmedTag = tagQuery.trim().toLowerCase();
  const tagMatches = trimmedTag
    ? Object.values(document.tags)
        .filter((tag) => tag.name.toLowerCase().includes(trimmedTag))
        .slice(0, MAX_RESULTS)
    : [];

  function jumpToNode(nodeId: string) {
    onSelectNode(nodeId);
    setPendingFocusId(nodeId);
    setNameQuery("");
  }

  function jumpToTag(tagId: string) {
    const taggedNodeIds = Object.values(document.nodes)
      .filter((node) => node.tags.includes(tagId))
      .map((node) => node.id);
    if (taggedNodeIds.length === 0) return;
    onExpandAncestors(taggedNodeIds);
    setPendingFrameIds(taggedNodeIds);
    setTagQuery("");
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && nameMatches.length > 0) {
      jumpToNode(nameMatches[0].id);
    } else if (event.key === "Escape") {
      setNameQuery("");
    }
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && tagMatches.length > 0) {
      jumpToTag(tagMatches[0].id);
    } else if (event.key === "Escape") {
      setTagQuery("");
    }
  }

  return (
    <div className="canvas-search-panel">
      <div className="canvas-search">
        <input
          type="text"
          className="canvas-search-input"
          placeholder="Search nodes…"
          value={nameQuery}
          onChange={(event) => setNameQuery(event.target.value)}
          onKeyDown={handleNameKeyDown}
          aria-label="Search nodes"
        />
        {nameMatches.length > 0 && (
          <ul className="canvas-search-results">
            {nameMatches.map((node) => (
              <li key={node.id}>
                <button type="button" onClick={() => jumpToNode(node.id)}>
                  {node.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="canvas-search">
        <input
          type="text"
          className="canvas-search-input"
          placeholder="Search tags…"
          value={tagQuery}
          onChange={(event) => setTagQuery(event.target.value)}
          onKeyDown={handleTagKeyDown}
          aria-label="Search tags"
        />
        {tagMatches.length > 0 && (
          <ul className="canvas-search-results">
            {tagMatches.map((tag) => (
              <li key={tag.id}>
                <button type="button" onClick={() => jumpToTag(tag.id)}>
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
