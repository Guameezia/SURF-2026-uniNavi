import { LeafIcon } from "./LeafIcon";

interface LeafToolbarProps {
  dropMode: boolean;
  onToggleDropMode: () => void;
  noteCount: number;
}

export function LeafToolbar({
  dropMode,
  onToggleDropMode,
  noteCount,
}: LeafToolbarProps) {
  return (
    <div className="leaf-toolbar leaf-toolbar--inline">
      <button
        type="button"
        className={`leaf-toolbar-btn${dropMode ? " leaf-toolbar-btn--active" : ""}`}
        onClick={onToggleDropMode}
      >
        <LeafIcon size={16} />
        <span>{dropMode ? "Cancel" : "Drop a Leaf"}</span>
      </button>
      <span className="leaf-toolbar-meta">
        {noteCount === 0
          ? "No notes yet"
          : `${noteCount} note${noteCount > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}
