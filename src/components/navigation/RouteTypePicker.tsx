import type { RouteMode } from "../../types/indoor";

interface RouteTypePickerProps {
  selected: RouteMode;
  onSelect: (mode: RouteMode) => void;
}

export function RouteTypePicker({ selected, onSelect }: RouteTypePickerProps) {
  return (
    <div className="route-type-picker" role="tablist" aria-label="Route type">
      {(["comfort", "fast"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={selected === mode}
          className={`route-type-option ${selected === mode ? "active" : ""}`}
          onClick={() => onSelect(mode)}
        >
          {mode === "comfort" ? "Comfort" : "Fast"}
        </button>
      ))}
    </div>
  );
}
