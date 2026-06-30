import { useId } from "react";
import type { POI } from "../../types/indoor";
import { formatPOIDisplay, getAmbiguousLabels } from "../../utils/poiSearch";

interface RouteSearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  suggestions: POI[];
  allPois: POI[];
  showSuggestions?: boolean;
  onChange: (value: string) => void;
  onSelect: (poi: POI) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export function RouteSearchField({
  label,
  placeholder,
  value,
  suggestions,
  allPois,
  showSuggestions = false,
  onChange,
  onSelect,
  onFocus,
  onBlur,
  disabled = false,
}: RouteSearchFieldProps) {
  const inputId = useId();
  const ambiguousLabels = getAmbiguousLabels(allPois);

  const handlePick = (poi: POI) => {
    onSelect(poi);
  };

  return (
    <div className="route-search-field">
      <label htmlFor={inputId} className="route-search-label">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        className="route-search-input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete="off"
      />
      {!disabled && showSuggestions && suggestions.length > 0 && (
        <ul className="route-suggestions" role="listbox">
          {suggestions.map((poi) => {
            const needsFloorBadge = ambiguousLabels.has(
              poi.label.toLowerCase()
            );
            return (
              <li key={poi.id}>
                <button
                  type="button"
                  className="route-suggestion-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePick(poi);
                  }}
                >
                  <span className="route-suggestion-main">
                    <span className="route-suggestion-label">{poi.label}</span>
                    {needsFloorBadge && (
                      <span className="route-suggestion-floor">
                        {poi.floorId}
                      </span>
                    )}
                  </span>
                  <span className="route-suggestion-id">{poi.id}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 供父组件在选中后写入输入框的展示文案 */
export function getPOISearchDisplay(poi: POI, allPois: POI[]): string {
  return formatPOIDisplay(poi, getAmbiguousLabels(allPois));
}
