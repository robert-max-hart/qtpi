interface ToolbarProps {
  fileName: string;
  isDirty: boolean;
  onNew: () => void;
  onLoad: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpenTagManager: () => void;
}

export function Toolbar({ fileName, isDirty, onNew, onLoad, onSave, onSaveAs, onOpenTagManager }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button" onClick={onNew}>
        New
      </button>
      <button type="button" onClick={onLoad}>
        Load
      </button>
      <button type="button" onClick={onSave}>
        Save
      </button>
      <button type="button" onClick={onSaveAs}>
        Save As
      </button>
      <button type="button" onClick={onOpenTagManager}>
        Tags
      </button>
      <span className="toolbar-filename">
        {fileName}
        {isDirty && <span aria-label="unsaved changes"> *</span>}
      </span>
    </div>
  );
}
