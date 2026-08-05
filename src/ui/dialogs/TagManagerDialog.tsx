import { createTag, deleteTag, updateTag, type TreeDocument } from "../../model/document";

const DEFAULT_TAG_COLOR = "#888888";

interface TagManagerDialogProps {
  document: TreeDocument;
  onChangeDocument: (document: TreeDocument) => void;
  onClose: () => void;
}

export function TagManagerDialog({ document, onChangeDocument, onClose }: TagManagerDialogProps) {
  const tags = Object.values(document.tags);

  function handleAdd() {
    const { document: next } = createTag(document, "New Tag", DEFAULT_TAG_COLOR);
    onChangeDocument(next);
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
                  onChange={(event) =>
                    onChangeDocument(updateTag(document, tag.id, { name: event.target.value }))
                  }
                />
                <button type="button" onClick={() => onChangeDocument(deleteTag(document, tag.id))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
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
