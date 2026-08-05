interface ToolbarProps {
  onOpenTagManager: () => void;
}

export function Toolbar({ onOpenTagManager }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button">New</button>
      <button type="button">Load</button>
      <button type="button">Save</button>
      <button type="button" onClick={onOpenTagManager}>
        Tags
      </button>
    </div>
  );
}
