import { useEffect, useState } from "react";
import {
  addBranchNode,
  addContinueNode,
  deleteNode,
  DocumentError,
  toggleNodeTag,
  updateNode,
  updateQuestColor,
  type TreeDocument,
} from "../../model/document";

interface InspectorPanelProps {
  document: TreeDocument;
  selectedNodeId: string | null;
  onChangeDocument: (document: TreeDocument) => void;
  onSelectNode: (nodeId: string | null) => void;
}

export function InspectorPanel({
  document,
  selectedNodeId,
  onChangeDocument,
  onSelectNode,
}: InspectorPanelProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [selectedNodeId]);

  const node = selectedNodeId ? document.nodes[selectedNodeId] : null;

  if (!node) {
    return (
      <div className="inspector">
        <p>Select a node to inspect it.</p>
      </div>
    );
  }

  const nodeId = node.id;
  const isRoot = nodeId === document.rootId;
  const hasChildren = node.children.length > 0;
  const hasContinueChild = node.children.some((child) => child.edgeType === "continue");
  const quest = document.quests[node.questId];
  const allTags = Object.values(document.tags);

  function handleAddContinue() {
    try {
      const result = addContinueNode(document, nodeId);
      onChangeDocument(result.document);
      onSelectNode(result.nodeId);
      setError(null);
    } catch (err) {
      setError(err instanceof DocumentError ? err.message : "Something went wrong.");
    }
  }

  function handleAddBranch() {
    try {
      const result = addBranchNode(document, nodeId);
      onChangeDocument(result.document);
      onSelectNode(result.nodeId);
      setError(null);
    } catch (err) {
      setError(err instanceof DocumentError ? err.message : "Something went wrong.");
    }
  }

  function handleDelete() {
    try {
      const next = deleteNode(document, nodeId);
      onChangeDocument(next);
      onSelectNode(null);
      setError(null);
    } catch (err) {
      setError(err instanceof DocumentError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="inspector">
      <label className="field">
        Name
        <input
          type="text"
          value={node.name}
          onChange={(event) => onChangeDocument(updateNode(document, nodeId, { name: event.target.value }))}
        />
      </label>

      <label className="field">
        Description
        <textarea
          rows={5}
          value={node.description}
          onChange={(event) =>
            onChangeDocument(updateNode(document, nodeId, { description: event.target.value }))
          }
        />
      </label>

      <label className="field">
        Notes
        <textarea
          rows={5}
          value={node.notes}
          onChange={(event) => onChangeDocument(updateNode(document, nodeId, { notes: event.target.value }))}
        />
      </label>

      <label className="field">
        Quest color
        <input
          type="color"
          value={quest.primaryColor}
          onChange={(event) =>
            onChangeDocument(updateQuestColor(document, node.questId, event.target.value))
          }
        />
      </label>

      <div className="field">
        <span>Tags</span>
        {allTags.length === 0 ? (
          <p className="field-hint">No tags yet - create some via Tags in the toolbar.</p>
        ) : (
          <div className="tag-toggle-list">
            {allTags.map((tag) => (
              <label key={tag.id} className="tag-toggle">
                <input
                  type="checkbox"
                  checked={node.tags.includes(tag.id)}
                  onChange={() => onChangeDocument(toggleNodeTag(document, nodeId, tag.id))}
                />
                <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          onClick={handleAddContinue}
          disabled={hasContinueChild}
          title={hasContinueChild ? "This node already continues to another node." : undefined}
        >
          Add continue node
        </button>
        <button type="button" onClick={handleAddBranch}>
          Add branch node
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isRoot || hasChildren}
          title={
            isRoot
              ? "The root node cannot be deleted."
              : hasChildren
                ? "Delete or reassign this node's children first."
                : undefined
          }
        >
          Delete node
        </button>
      </div>

      {isRoot && <p className="field-hint">The root node cannot be deleted.</p>}
      {!isRoot && hasChildren && (
        <p className="field-hint">This node has children - delete or reassign them first.</p>
      )}
      {error && (
        <p className="inspector-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
