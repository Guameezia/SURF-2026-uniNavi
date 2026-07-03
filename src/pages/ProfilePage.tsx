import { useMemo, useState } from "react";
import { useLeafNoteStore } from "../store/leafNoteStore";
import { useTopicStore } from "../store/topicStore";
import { formatNoteTime, getTagDef, getStatusLabel } from "../utils/leafNoteTags";
import { getIconEmoji } from "../utils/leafNoteIcons";
import {
  canPromoteCluster,
  defaultTitleFromNote,
  findCandidateClusters,
} from "../utils/topicRules";
import { PullToRefresh } from "../components/layout/PullToRefresh";
import { useLeafNoteRefresh } from "../hooks/useLeafNoteRefresh";

export function ProfilePage() {
  const { notes, likedNoteIds, lastRefreshedAt, updateNote } = useLeafNoteStore();
  const {
    notifications,
    topics,
    dismissedClusterKeys,
    markNotificationRead,
    dismissCluster,
    createTopicFromPromotion,
  } = useTopicStore();
  const refresh = useLeafNoteRefresh();

  const [promoteClusterKey, setPromoteClusterKey] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState("");

  const stats = useMemo(() => {
    const active = notes.filter((n) => n.status === "active");
    const resolved = notes.filter((n) => n.status === "resolved");
    const totalHelpful = notes.reduce((sum, n) => sum + n.helpfulCount, 0);
    return {
      total: notes.length,
      active: active.length,
      resolved: resolved.length,
      liked: likedNoteIds.size,
      totalHelpful,
    };
  }, [notes, likedNoteIds]);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    [notes]
  );

  const unreadNotifications = notifications.filter((n) => !n.read);
  const clusters = useMemo(() => findCandidateClusters(notes), [notes]);

  const startPromoteFromCluster = (clusterKey: string) => {
    const cluster = clusters.find((c) => c.clusterKey === clusterKey);
    if (!cluster) return;
    const topNote = notes.find((n) => n.id === cluster.topNoteId);
    if (!topNote) return;
    setPromoteClusterKey(clusterKey);
    setPromoteTitle(defaultTitleFromNote(topNote.text, topNote.roomId));
  };

  const confirmPromote = () => {
    if (!promoteClusterKey) return;
    const cluster = clusters.find((c) => c.clusterKey === promoteClusterKey);
    const topNote = cluster
      ? notes.find((n) => n.id === cluster.topNoteId)
      : null;
    if (!topNote || !promoteTitle.trim()) return;

    const topic = createTopicFromPromotion({
      title: promoteTitle.trim(),
      originNote: topNote,
    });
    updateNote(topNote.id, { topicId: topic.id });
    markNotificationRead(
      notifications.find((n) => n.clusterKey === promoteClusterKey)?.id ?? ""
    );
    setPromoteClusterKey(null);
    setPromoteTitle("");
  };

  return (
    <div className="tab-page profile-page">
      <header className="tab-page-header">
        <div className="profile-avatar" aria-hidden>
          👤
        </div>
        <h1>我的</h1>
        <p className="tab-page-subtitle">
          本地便签与互动记录
          {lastRefreshedAt && (
            <span className="profile-refreshed">
              · 更新于{" "}
              {new Date(lastRefreshedAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </p>
      </header>

      <PullToRefresh onRefresh={refresh}>
        <div className="tab-page-body">
          {unreadNotifications.length > 0 && (
            <section className="profile-section profile-notifications">
              <h2>话题通知</h2>
              <ul className="profile-notification-list">
                {unreadNotifications.map((ntf) => {
                  const cluster =
                    ntf.clusterKey != null
                      ? clusters.find((c) => c.clusterKey === ntf.clusterKey)
                      : undefined;
                  const showPromote =
                    ntf.kind === "candidate" &&
                    cluster != null &&
                    canPromoteCluster(cluster, topics, dismissedClusterKeys);

                  return (
                  <li
                    key={ntf.id}
                    className={`profile-notification-item profile-notification-item--${ntf.kind}`}
                  >
                    <p>{ntf.message}</p>
                    <div className="profile-notification-actions">
                      {showPromote && ntf.clusterKey && (
                        <>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => startPromoteFromCluster(ntf.clusterKey!)}
                          >
                            申请发起话题
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => dismissCluster(ntf.clusterKey!)}
                          >
                            忽略
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => markNotificationRead(ntf.id)}
                      >
                        知道了
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>

              {promoteClusterKey && (
                <div className="profile-promote-form">
                  <label htmlFor="profile-promote-title">话题标题</label>
                  <input
                    id="profile-promote-title"
                    value={promoteTitle}
                    onChange={(e) => setPromoteTitle(e.target.value)}
                    maxLength={60}
                  />
                  <div className="profile-promote-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setPromoteClusterKey(null)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={!promoteTitle.trim()}
                      onClick={confirmPromote}
                    >
                      确认发起
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="profile-stats">
            <div className="profile-stat-card">
              <span className="profile-stat-value">{stats.total}</span>
              <span className="profile-stat-label">便签总数</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-value">{stats.active}</span>
              <span className="profile-stat-label">有效</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-value">{stats.liked}</span>
              <span className="profile-stat-label">已点赞</span>
            </div>
            <div className="profile-stat-card">
              <span className="profile-stat-value">{stats.totalHelpful}</span>
              <span className="profile-stat-label">获赞合计</span>
            </div>
          </div>

          <section className="profile-section">
            <h2>最近便签</h2>
            {recentNotes.length === 0 ? (
              <p className="profile-empty">还没有便签，去首页 Drop a Leaf 试试</p>
            ) : (
              <ul className="profile-note-list">
                {recentNotes.map((note) => (
                  <li key={note.id} className="profile-note-item">
                    <span className="profile-note-icon">{getIconEmoji(note.iconId)}</span>
                    <div className="profile-note-content">
                      <p>{note.text}</p>
                      <div className="profile-note-meta">
                        <span>{note.roomId}</span>
                        <span>{getStatusLabel(note.status)}</span>
                        {note.tags.slice(0, 2).map((id) => (
                          <span key={id} style={{ color: getTagDef(id).color }}>
                            #{getTagDef(id).label}
                          </span>
                        ))}
                        <span>{formatNoteTime(note.updatedAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </PullToRefresh>
    </div>
  );
}
