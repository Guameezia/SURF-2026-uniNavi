import type { Direction } from "../../types/room";

const DIR_LABEL: Record<Direction, string> = {
  up: "↑ 北",
  down: "↓ 南",
  left: "← 西",
  right: "→ 东",
};

interface DirectionPadProps {
  available: Partial<Record<Direction, string>>;
  onMove: (direction: Direction) => void;
}

export function DirectionPad({ available, onMove }: DirectionPadProps) {
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

  return (
    <div className="dir-pad" role="group" aria-label="方向移动">
      {btn("up", "up")}
      {btn("left", "left")}
      <span className="dir-pad-center">移动</span>
      {btn("right", "right")}
      {btn("down", "down")}
    </div>
  );
}
