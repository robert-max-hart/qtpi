interface UnsavedChangesDialogProps {
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ fileName, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Unsaved changes</h2>
        <p>{fileName} has unsaved changes. Save them before continuing?</p>
        <div className="dialog-actions">
          <button type="button" onClick={onDiscard}>
            Discard
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" onClick={onSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
