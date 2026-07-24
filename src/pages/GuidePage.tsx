/**
 * 攻略页 — 收藏夹 + 主题路线（地图信息聚合 MVP）
 */

import { useMemo, useState } from "react";
import { useGuideStore } from "../store/guideStore";
import { useLeafNoteStore } from "../store/leafNoteStore";
import { useAppNavStore } from "../store/appNavStore";
import { useMapStore } from "../store/mapStore";
import { useRoomStore } from "../store/roomStore";
import {
  GUIDE_THEMES,
  getGuideThemeDef,
  type GuideTheme,
} from "../types/guide";
import { getRoomById } from "../data/roomConfig";

interface GuidePageProps {
  onShowOnMap: () => void;
}

export function GuidePage({ onShowOnMap }: GuidePageProps) {
  const notes = useLeafNoteStore((s) => s.notes);
  const {
    collections,
    routes,
    createCollection,
    deleteCollection,
    removeNoteFromCollection,
    createRoute,
    deleteRoute,
    setActiveOverlay,
    buildShareText,
  } = useGuideStore();
  const focusOnMap = useAppNavStore((s) => s.focusOnMap);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const setRoom = useRoomStore((s) => s.setRoom);
  const graph = useMapStore((s) => s.graph);
  const recomputeRouteGeometries = useGuideStore((s) => s.recomputeRouteGeometries);

  const [tab, setTab] = useState<"collections" | "routes">("collections");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<GuideTheme>("tour");
  const [routeName, setRouteName] = useState("");
  const [sourceCollectionId, setSourceCollectionId] = useState("");
  const [pickedNoteIds, setPickedNoteIds] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeNotes = useMemo(
    () => notes.filter((n) => n.status === "active"),
    [notes]
  );

  const sourceNotes = useMemo(() => {
    if (!sourceCollectionId) return activeNotes;
    const collection = collections.find((c) => c.id === sourceCollectionId);
    if (!collection) return [];
    // 收藏夹内便签按加入顺序展示，便于按序生成路线
    return collection.noteIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => !!n);
  }, [activeNotes, collections, sourceCollectionId, notes]);

  const pickedStopsPreview = useMemo(() => {
    return pickedNoteIds
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((note) => {
        const room = getRoomById(note.floorId, note.roomId);
        return {
          noteId: note.id,
          floorId: note.floorId,
          label: room?.label ?? note.roomId,
          text: note.text.slice(0, 36),
        };
      });
  }, [pickedNoteIds, notes]);

  const handleCreateCollection = () => {
    createCollection(name, theme);
    setName("");
    setError(null);
  };

  const handleCreateRoute = (options?: { autoShowOnMap?: boolean }) => {
    const autoShowOnMap = options?.autoShowOnMap ?? true;
    if (pickedNoteIds.length < 3) {
      setError("请先选出至少 3 个便签点，再生成路线。");
      return;
    }
    if (pickedNoteIds.length > 8) {
      setError("一条路线最多 8 个点，请减少选点。");
      return;
    }
    const route = createRoute({
      name: routeName.trim() || `主题路线 · ${pickedNoteIds.length} 站`,
      noteIds: pickedNoteIds,
      notes,
      collectionId: sourceCollectionId || null,
      graph: graph ?? undefined,
    });
    if (!route) {
      setError("生成失败：需要 3–8 个仍然存在的地点便签。");
      return;
    }
    setRouteName("");
    setPickedNoteIds([]);
    setError(null);
    setSuccess(`已生成路线「${route.name}」`);
    window.setTimeout(() => setSuccess(null), 2500);
    if (autoShowOnMap) {
      showRouteOnMap(route.id);
    } else {
      setTab("routes");
    }
  };

  const startRouteFromCollection = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;
    const ids = collection.noteIds.filter((id) => notes.some((n) => n.id === id));
    if (ids.length < 3) {
      setError("该收藏夹有效便签不足 3 个，请先加入更多地点。");
      return;
    }
    setSourceCollectionId(collectionId);
    setPickedNoteIds(ids.slice(0, 8));
    setRouteName(`${collection.name}路线`);
    setError(null);
    setTab("routes");
    setSuccess("已带入收藏夹地点，确认后点击「生成路线」");
    window.setTimeout(() => setSuccess(null), 2500);
  };

  const togglePick = (noteId: string) => {
    setError(null);
    setPickedNoteIds((prev) => {
      if (prev.includes(noteId)) return prev.filter((id) => id !== noteId);
      if (prev.length >= 8) {
        setError("一条路线最多选 8 个点。");
        return prev;
      }
      return [...prev, noteId];
    });
  };

  const clearPicks = () => {
    setPickedNoteIds([]);
    setError(null);
  };

  const handleShare = async (kind: "collection" | "route", id: string) => {
    const text = buildShareText(kind, id, notes);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage("已复制分享文本，可粘贴发送或截图展示");
    } catch {
      setShareMessage(text);
    }
    window.setTimeout(() => setShareMessage(null), 2500);
  };

  const showCollectionOnMap = (id: string) => {
    setActiveOverlay({ kind: "collection", id });
    const latest = useGuideStore.getState().collections.find((c) => c.id === id);
    const firstNote = notes.find((n) => latest?.noteIds.includes(n.id));
    if (firstNote) {
      setCurrentFloor(firstNote.floorId);
      setRoom(firstNote.roomId);
      focusOnMap({
        floorId: firstNote.floorId,
        roomId: firstNote.roomId,
        noteId: firstNote.id,
      });
    }
    onShowOnMap();
  };

  const showRouteOnMap = (id: string) => {
    if (graph) {
      const existing = useGuideStore.getState().routes.find((r) => r.id === id);
      if (existing && !existing.geometry) {
        recomputeRouteGeometries(graph);
      }
    }
    setActiveOverlay({ kind: "route", id });
    const route = useGuideStore.getState().routes.find((r) => r.id === id);
    if (!route || route.stops.length === 0) {
      onShowOnMap();
      return;
    }

    // 生成/打开攻略路线后直接进入第 1 站，不经过楼层鸟瞰。
    const entry = route.stops[0];
    setCurrentFloor(entry.floorId);
    setRoom(entry.roomId);
    focusOnMap({
      floorId: entry.floorId,
      roomId: entry.roomId,
    });
    onShowOnMap();
  };

  return (
    <div className="tab-page guide-page">
      <header className="tab-page-header guide-page-header">
        <div>
          <h1>攻略</h1>
          <p>把地图便签聚合成收藏夹与主题路线</p>
        </div>
      </header>

      <div className="guide-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`guide-tab${tab === "collections" ? " guide-tab--active" : ""}`}
          aria-selected={tab === "collections"}
          onClick={() => setTab("collections")}
        >
          收藏夹
        </button>
        <button
          type="button"
          role="tab"
          className={`guide-tab${tab === "routes" ? " guide-tab--active" : ""}`}
          aria-selected={tab === "routes"}
          onClick={() => setTab("routes")}
        >
          路线
        </button>
      </div>

      {shareMessage && (
        <p className="guide-toast" role="status">
          {shareMessage}
        </p>
      )}
      {success && (
        <p className="guide-toast" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="guide-error" role="alert">
          {error}
        </p>
      )}

      <div className="tab-page-body guide-page-body">
        {tab === "collections" ? (
          <>
            <section className="guide-card">
              <h2>新建收藏夹</h2>
              <label className="guide-field">
                <span>名称</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：校园美食"
                  maxLength={40}
                />
              </label>
              <label className="guide-field">
                <span>主题</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as GuideTheme)}
                >
                  {GUIDE_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateCollection}
              >
                创建
              </button>
            </section>

            <section className="guide-card">
              <h2>我的收藏夹</h2>
              {collections.length === 0 ? (
                <p className="guide-empty">
                  还没有收藏夹。可在地图便签详情里点击「加入收藏夹」。
                </p>
              ) : (
                <ul className="guide-stack">
                  {collections.map((c) => {
                    const themeDef = getGuideThemeDef(c.theme);
                    const items = c.noteIds
                      .map((id) => notes.find((n) => n.id === id))
                      .filter(Boolean);
                    return (
                      <li key={c.id} className="guide-stack-item">
                        <div className="guide-stack-head">
                          <div>
                            <strong>{c.name}</strong>
                            <span
                              className="guide-theme-chip"
                              style={{
                                color: themeDef.color,
                                borderColor: themeDef.color,
                              }}
                            >
                              {themeDef.label}
                            </span>
                            <span className="guide-meta">{items.length} 个地点</span>
                          </div>
                          <div className="guide-stack-actions">
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              onClick={() => showCollectionOnMap(c.id)}
                              disabled={items.length === 0}
                            >
                              地图高亮
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => startRouteFromCollection(c.id)}
                              disabled={items.length < 3}
                              title={
                                items.length < 3
                                  ? "至少 3 个地点才能生成路线"
                                  : "带入选点并去生成路线"
                              }
                            >
                              生成路线
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleShare("collection", c.id)}
                            >
                              分享
                            </button>
                            <button
                              type="button"
                              className="btn-danger btn-sm"
                              onClick={() => deleteCollection(c.id)}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        {items.length > 0 && (
                          <ul className="guide-mini-list">
                            {items.map((note) => {
                              if (!note) return null;
                              const room = getRoomById(note.floorId, note.roomId);
                              return (
                                <li key={note.id}>
                                  <span>
                                    [{note.floorId}] {room?.label ?? note.roomId}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() =>
                                      removeNoteFromCollection(c.id, note.id)
                                    }
                                  >
                                    移除
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="guide-card">
              <h2>① 选出便签点</h2>
              <p className="guide-hint">
                按点击顺序组成 3–8 站路线；可从来源收藏夹一键带入，或手动多选。
              </p>
              <label className="guide-field">
                <span>来源</span>
                <select
                  value={sourceCollectionId}
                  onChange={(e) => {
                    setSourceCollectionId(e.target.value);
                    setPickedNoteIds([]);
                    setError(null);
                  }}
                >
                  <option value="">全部便签（手动选点）</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      收藏夹：{c.name}
                    </option>
                  ))}
                </select>
              </label>

              {sourceCollectionId && sourceNotes.length >= 3 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setPickedNoteIds(
                      sourceNotes.slice(0, 8).map((n) => n.id)
                    );
                    setError(null);
                  }}
                >
                  按收藏夹顺序全选（最多 8 站）
                </button>
              )}

              <div className="guide-pick-meta">
                已选 {pickedNoteIds.length} / 8（至少 3 个）
                {pickedNoteIds.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={clearPicks}
                  >
                    清空选点
                  </button>
                )}
              </div>
              {sourceNotes.length === 0 ? (
                <p className="guide-empty">暂无可选便签，先去地图放几片叶子吧。</p>
              ) : (
                <ul className="guide-pick-list">
                  {sourceNotes.map((note) => {
                    const room = getRoomById(note.floorId, note.roomId);
                    const order = pickedNoteIds.indexOf(note.id);
                    const selected = order >= 0;
                    return (
                      <li key={note.id}>
                        <button
                          type="button"
                          className={`guide-pick-item${selected ? " guide-pick-item--on" : ""}`}
                          onClick={() => togglePick(note.id)}
                        >
                          <span className="guide-pick-order">
                            {selected ? order + 1 : "+"}
                          </span>
                          <span className="guide-pick-body">
                            <strong>
                              [{note.floorId}] {room?.label ?? note.roomId}
                            </strong>
                            <span>{note.text.slice(0, 48)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="guide-card guide-card--create-route">
              <h2>② 生成路线</h2>
              <p className="guide-hint">
                确认站序后命名并生成；生成后会自动打开地图连线（橙色虚线 + 序号）。
              </p>

              {pickedStopsPreview.length > 0 ? (
                <ol className="guide-route-preview">
                  {pickedStopsPreview.map((stop, index) => (
                    <li key={stop.noteId}>
                      <span className="guide-route-index">{index + 1}</span>
                      <span>
                        [{stop.floorId}] {stop.label}
                        <em>{stop.text}</em>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="guide-empty">还没有选点，先在上方选出至少 3 站。</p>
              )}

              <label className="guide-field">
                <span>路线名称</span>
                <input
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="例如：新生 30 分钟导览"
                  maxLength={40}
                />
              </label>

              <div className="guide-create-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleCreateRoute({ autoShowOnMap: true })}
                  disabled={pickedNoteIds.length < 3}
                >
                  生成路线并地图连线
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCreateRoute({ autoShowOnMap: false })}
                  disabled={pickedNoteIds.length < 3}
                >
                  仅生成路线
                </button>
              </div>
            </section>

            <section className="guide-card">
              <h2>我的路线</h2>
              {routes.length === 0 ? (
                <p className="guide-empty">还没有路线。</p>
              ) : (
                <ul className="guide-stack">
                  {routes.map((route) => (
                    <li key={route.id} className="guide-stack-item">
                      <div className="guide-stack-head">
                        <div>
                          <strong>{route.name}</strong>
                          <span className="guide-meta">
                            {route.stops.length} 站
                          </span>
                        </div>
                        <div className="guide-stack-actions">
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => showRouteOnMap(route.id)}
                          >
                            地图连线
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => handleShare("route", route.id)}
                          >
                            分享
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => deleteRoute(route.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <ol className="guide-route-stops">
                        {route.stops.map((stop, index) => (
                          <li key={`${route.id}-${stop.noteId}-${index}`}>
                            <button
                              type="button"
                              className="guide-route-stop"
                              onClick={() => {
                                setActiveOverlay({ kind: "route", id: route.id });
                                setCurrentFloor(stop.floorId);
                                setRoom(stop.roomId);
                                focusOnMap({
                                  floorId: stop.floorId,
                                  roomId: stop.roomId,
                                  noteId: stop.noteId,
                                });
                                onShowOnMap();
                              }}
                            >
                              <span className="guide-route-index">{index + 1}</span>
                              <span>
                                [{stop.floorId}] {stop.roomLabel}
                                <em>{stop.noteText}</em>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {pickedNoteIds.length > 0 && (
              <div className="guide-route-dock" role="region" aria-label="生成路线">
                <p className="guide-route-dock-meta">
                  已选 {pickedNoteIds.length} 站
                  {pickedNoteIds.length < 3
                    ? " · 再选几站即可生成"
                    : " · 可生成路线"}
                </p>
                <label className="guide-field">
                  <span>路线名称</span>
                  <input
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="例如：新生 30 分钟导览"
                    maxLength={40}
                  />
                </label>
                <div className="guide-route-dock-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleCreateRoute({ autoShowOnMap: true })}
                    disabled={pickedNoteIds.length < 3}
                  >
                    生成路线并地图连线
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleCreateRoute({ autoShowOnMap: false })}
                    disabled={pickedNoteIds.length < 3}
                  >
                    仅生成路线
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
