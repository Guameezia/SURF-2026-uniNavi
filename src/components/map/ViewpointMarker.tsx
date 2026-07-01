import type { ViewpointDef } from "../../types/room";

interface ViewpointMarkerProps {
  viewpoint: ViewpointDef;
  onClick: () => void;
}

export function ViewpointMarker({ viewpoint, onClick }: ViewpointMarkerProps) {
  return (
    <g
      className="viewpoint-marker"
      transform={`translate(${viewpoint.x}, ${viewpoint.y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer" }}
    >
      <circle r={10} fill="rgba(255, 193, 7, 0.35)" />
      <circle r={6} fill="#ffc107" stroke="#e65100" strokeWidth={1.5} />
      <text y={-12} textAnchor="middle" fontSize={10} fill="#e65100" fontWeight="700">
        观景台
      </text>
    </g>
  );
}

interface ViewpointDialogProps {
  open: boolean;
  viewpoint: ViewpointDef | null;
  onClose: () => void;
}

export function ViewpointDialog({ open, viewpoint, onClose }: ViewpointDialogProps) {
  if (!open || !viewpoint) return null;

  return (
    <div className="leaf-note-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="leaf-note-dialog viewpoint-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="vp-title"
      >
        <div className="leaf-note-dialog-header">
          <span className="viewpoint-dialog-icon" aria-hidden="true">
            🔭
          </span>
          <h3 id="vp-title">{viewpoint.title}</h3>
        </div>
        <p className="leaf-note-view-text">{viewpoint.content}</p>
        <div className="leaf-note-dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
