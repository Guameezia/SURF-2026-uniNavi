import type { Direction } from "../../types/room";

const DIR_LABEL: Record<Direction, string> = {
  up: "↑ 北",
  down: "↓ 南",
  left: "← 西",
  right: "→ 东",
};

export interface VerticalPadOptions {
  canUp: boolean;
  canDown: boolean;
  upFloor?: string;
  downFloor?: string;
  onUp: () => void;
  onDown: () => void;
}

interface DirectionPadProps {
  available: Partial<Record<Direction, string>>;
  onMove: (direction: Direction) => void;
  vertical?: VerticalPadOptions;
}

export function DirectionPad({ available, onMove, vertical }: DirectionPadProps) {
  const btn = (dir: Direction, gridArea: string) => {
    const target = available[dir];
    if (!target) {
      return <span key={dir} className="dir-pad-empty" style={{ gridArea: gridArea.replace(/"/g, "") }} />;
    }
    return (
      <button
        key={dir}
        type="button"
        className="dir-pad-btn"
        style={{ gridArea: gridArea.replace(/"/g, "") }}
        onClick={() => onMove(dir)}
        title={`前往 ${target}`}
      >
        {DIR_LABEL[dir]}
      </button>
    );
  };

  const inShaft = !!vertical;

  return (
    <div
      className={`dir-pad${inShaft ? " dir-pad--shaft" : ""}`}
      role="group"
      aria-label={inShaft ? "方向移动与上下楼" : "方向移动"}
    >
      {btn("up", "up")}
      {btn("left", "left")}
      {inShaft ? (
        <div className="dir-pad-center dir-pad-center--vertical">
          <button
            type="button"
            className="dir-pad-vertical-btn"
            disabled={!vertical.canUp}
            onClick={vertical.onUp}
            title={vertical.canUp ? `上楼 ${vertical.upFloor ?? ""}` : "无法上楼"}
          >
            上楼
          </button>
          <button
            type="button"
            className="dir-pad-vertical-btn dir-pad-vertical-btn--down"
            disabled={!vertical.canDown}
            onClick={vertical.onDown}
            title={vertical.canDown ? `下楼 ${vertical.downFloor ?? ""}` : "无法下楼"}
          >
            下楼
          </button>
        </div>
      ) : (
        <span className="dir-pad-center">移动</span>
      )}
      {btn("right", "right")}
      {btn("down", "down")}
    </div>
  );
}
