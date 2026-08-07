import { useState } from "react";
import {
  createTag,
  deleteTag,
  describeError,
  normalizeTagName,
  updateTag,
  type TreeDocument,
} from "../../model/document";

const DEFAULT_TAG_COLOR = "#888888";
const DEFAULT_TAG_NAME = "New Tag";

interface TagManagerDialogProps {
  document: TreeDocument;
  onChangeDocument: (document: TreeDocument) => void;
  onClose: () => void;
}

/** "New Tag", then "New Tag 2", "New Tag 3", ... so repeated clicks on "Add tag" never collide. */
function nextDefaultTagName(document: TreeDocument): string {
  const taken = new Set(Object.values(document.tags).map((tag) => normalizeTagName(tag.name)));
  if (!taken.has(normalizeTagName(DEFAULT_TAG_NAME))) return DEFAULT_TAG_NAME;

  let n = 2;
  while (taken.has(normalizeTagName(`${DEFAULT_TAG_NAME} ${n}`))) n++;
  return `${DEFAULT_TAG_NAME} ${n}`;
}

export function TagManagerDialog({ document, onChangeDocument, onClose }: TagManagerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const tags = Object.values(document.tags);

  function handleAdd() {
    try {
      const { document: next } = createTag(document, nextDefaultTagName(document), DEFAULT_TAG_COLOR);
      onChangeDocument(next);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  }

  function handleRename(tagId: string, name: string) {
    try {
      onChangeDocument(updateTag(document, tagId, { name }));
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Manage Tags</h2>

        {tags.length === 0 ? (
          <p className="field-hint">No tags yet.</p>
        ) : (
          <ul className="tag-list">
            {tags.map((tag) => (
              <li key={tag.id} className="tag-row">
                <input
                  type="color"
                  aria-label={`${tag.name} color`}
                  value={tag.color}
                  onChange={(event) =>
                    onChangeDocument(updateTag(document, tag.id, { color: event.target.value }))
                  }
                />
                <input
                  type="text"
                  aria-label={`${tag.name} name`}
                  value={tag.name}
                  onChange={(event) => handleRename(tag.id, event.target.value)}
                />
                <button type="button" onClick={() => onChangeDocument(deleteTag(document, tag.id))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="inspector-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" onClick={handleAdd}>
            Add tag
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
