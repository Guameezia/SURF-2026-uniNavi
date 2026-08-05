import { useEffect, useMemo, useState } from "react";
import type { FloorId, Graph } from "../../types/indoor";
import type { GuideRouteGeometry } from "../../types/guide";
import { getFloorOverview } from "../../data/roomConfig";
import { GuideRouteLayer } from "../map/GuideRouteLayer";

interface GuideRoutePreviewProps {
  graph: Graph;
  geometry: GuideRouteGeometry;
}

export function GuideRoutePreview({
  graph,
  geometry,
}: GuideRoutePreviewProps) {
  const floors = useMemo(() => {
    const ids = new Set<FloorId>();
    geometry.floorSegments.forEach((segment) => ids.add(segment.floorId));
    geometry.stopAnchors.forEach((anchor) => ids.add(anchor.floorId));
    return [...ids].sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
  }, [geometry]);
  const [floorId, setFloorId] = useState<FloorId>(floors[0] ?? "0F");

  useEffect(() => {
    if (!floors.includes(floorId)) setFloorId(floors[0] ?? "0F");
  }, [floors, floorId]);

  if (floors.length === 0) return null;
  const overview = getFloorOverview(floorId);

  return (
    <section className="guide-editor-preview" aria-label="按楼层路线预览">
      <div className="guide-editor-preview-head">
        <strong>各层路线预览</strong>
        <div className="guide-editor-floor-tabs" role="tablist">
          {floors.map((floor) => (
            <button
              key={floor}
              type="button"
              role="tab"
              aria-selected={floor === floorId}
              className={
                floor === floorId ? "guide-editor-floor-tab--active" : ""
              }
              onClick={() => setFloorId(floor)}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>
      <svg
        className="guide-editor-preview-map"
        viewBox={`0 0 ${overview.width} ${overview.height}`}
        role="img"
        aria-label={`${floorId} 攻略路线`}
      >
        <image
          href={overview.imageSrc}
          width={overview.width}
          height={overview.height}
          opacity={0.94}
        />
        <GuideRouteLayer
          floorId={floorId}
          geometry={geometry}
          graph={graph}
          activeLegIndex={null}
        />
      </svg>
      {!geometry.complete && (
        <p className="guide-editor-preview-error" role="alert">
          存在无法连通的相邻站点，请调整站点后再保存。
        </p>
      )}
    </section>
  );
}
