interface DirectionsPanelProps {
  steps: string[];
  expanded?: boolean;
  onToggle?: () => void;
}

export function DirectionsPanel({
  steps,
  expanded = true,
  onToggle,
}: DirectionsPanelProps) {
  if (steps.length === 0) return null;

  return (
    <div className="directions-panel">
      <button
        type="button"
        className="directions-panel-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="directions-panel-title">Directions</span>
        <span className="directions-panel-meta">
          {steps.length} steps
        </span>
        {onToggle && (
          <span className="directions-panel-chevron" aria-hidden>
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </button>

      {expanded && (
        <ol className="directions-steps">
          {steps.map((step, idx) => (
            <li key={idx} className="directions-step">
              <span className="directions-step-num">{idx + 1}</span>
              <span className="directions-step-text">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
