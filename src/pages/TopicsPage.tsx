import { useMemo, useState } from "react";
import { useLeafNoteStore } from "../store/leafNoteStore";
import { useTopicStore } from "../store/topicStore";
import type { LeafNote } from "../types/leafNote";
import type { Topic } from "../types/topic";
import { getIconDef, getIconEmoji, inferIconFromTags } from "../utils/leafNoteIcons";
import { getTagDef } from "../utils/leafNoteTags";
import {
  getTopicTagChipColor,
  getRandomTagEmoji,
} from "../utils/topicTagColors";
import {
  getNotesForTopic,
  getNoteAuthorLabel,
  getTopicSourceEmoji,
  getTopicSourceLabel,
  getTopicStats,
  pickFeaturedTopics,
} from "../utils/topicRules";
import { PullToRefresh } from "../components/layout/PullToRefresh";
import { useLeafNoteRefresh } from "../hooks/useLeafNoteRefresh";
import type { LeafNoteTagId } from "../types/leafNote";

type LeaderboardPeriod = "today" | "week" | "all";

const PERIOD_TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "today", label: "今日" },
  { id: "week", label: "本周" },
  { id: "all", label: "全部" },
];

const TAG_EMOJIS = [
  "📋", "✏️", "🔌", "🖨️", "🍽️", "🪜", "➡️", "⚠️", "📖", "📅", "🍃", "💡",
];

interface TopicsPageProps {
  onParticipateTopic: (topicId: string, suggestedTags: LeafNoteTagId[]) => void;
}

function filterByPeriod(notes: LeafNote[], period: LeaderboardPeriod): LeafNote[] {
  if (period === "all") return notes;
  const now = Date.now();
  const ms = period === "today" ? 86400000 : 7 * 86400000;
  return notes.filter((n) => now - n.createdAt <= ms);
}

function sortByHeat(notes: LeafNote[]): LeafNote[] {
  return [...notes].sort(
    (a, b) =>
      b.helpfulCount - a.helpfulCount || b.createdAt - a.createdAt
  );
}

function formatHeat(n: number): string {
  return n.toLocaleString("zh-CN");
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="topics-rank topics-rank--gold" aria-label="第1名">1</span>;
  }
  if (rank === 2) {
    return <span className="topics-rank topics-rank--silver" aria-label="第2名">2</span>;
  }
  if (rank === 3) {
    return <span className="topics-rank topics-rank--bronze" aria-label="第3名">3</span>;
  }
  return <span className="topics-rank topics-rank--plain">#{rank}</span>;
}

function TopicSourceBadge({ source }: { source: Topic["source"] }) {
  return (
    <span className={`topic-source-badge topic-source-badge--${source}`}>
      {getTopicSourceEmoji(source)} {getTopicSourceLabel(source)}
    </span>
  );
}

function HotTagChip({
  tagId,
  index,
  iconSeed,
}: {
  tagId: LeafNoteTagId;
  index: number;
  iconSeed: number;
}) {
  const def = getTagDef(tagId);
  const color = getTopicTagChipColor(tagId, index);
  const emoji = getRandomTagEmoji(tagId, index, iconSeed, TAG_EMOJIS);

  return (
    <span
      className="topics-hot-tag-chip"
      style={{
        borderColor: color,
        color,
        backgroundColor: `${color}18`,
      }}
    >
      <span className="topics-hot-tag-chip-emoji">{emoji}</span>
      <span className="topics-hot-tag-chip-label">{def.label}</span>
    </span>
  );
}

function FeaturedTopicHero({
  topic,
  notes,
  onParticipate,
}: {
  topic: Topic;
  notes: LeafNote[];
  onParticipate: () => void;
}) {
  const stats = getTopicStats(topic.id, notes);
  const sampleNotes = getNotesForTopic(topic.id, notes);
  const heroNote = sampleNotes[0] ?? null;
  const moreNotes = sampleNotes.slice(1, 3);

  const heroEmoji = heroNote
    ? getIconEmoji(heroNote.iconId)
    : getIconDef(inferIconFromTags(topic.suggestedTags)).emoji;

  const iconSeed = topic.id.length * 997 + topic.suggestedTags.length * 131;
  const visibleTags = topic.suggestedTags.slice(0, 7);
  const hiddenTagCount = Math.max(0, topic.suggestedTags.length - visibleTags.length);

  return (
    <section className="topics-featured topics-hero-card" aria-label="今日主话题">
      <span className="topics-featured-badge">
        {getTopicSourceEmoji(topic.source)} {getTopicSourceLabel(topic.source)}
      </span>

      <p className="topics-hero-kicker">今日主话题</p>

      <div className="topics-hero-tag-box">
        <span className="topics-hero-tag-big">{heroEmoji}</span>
      </div>

      <p className="topics-hero-tag-name">{topic.title}</p>

      {heroNote ? (
        <>
          <p className="topics-hero-note-text">{heroNote.text}</p>
          <div className="topics-hero-byline">
            <span className="topics-hero-by-user">
              by <strong>{getNoteAuthorLabel(heroNote.id)}</strong>
            </span>
            <span className="topics-hero-like-badge">
              ❤ {formatHeat(heroNote.helpfulCount)}
            </span>
          </div>
        </>
      ) : (
        <p className="topics-hero-note-text topics-hero-note-text--muted">
          {topic.subtitle ?? "还没有便签参与此话题，来做第一个吧"}
        </p>
      )}

      {topic.originNoteId && topic.initiatorLabel && !heroNote && (
        <p className="topics-hero-origin">
          由 <strong>{topic.initiatorLabel}</strong> 的便签发起
        </p>
      )}

      {visibleTags.length > 0 && (
        <div className="topics-hot-tag-section">
          <div className="topics-hot-tag-cloud" role="list" aria-label="话题 Tag">
            {visibleTags.map((tagId, index) => (
              <HotTagChip
                key={tagId}
                tagId={tagId}
                index={index}
                iconSeed={iconSeed}
              />
            ))}
            {hiddenTagCount > 0 && (
              <span className="topics-hot-tag-more">+{hiddenTagCount} more</span>
            )}
          </div>
        </div>
      )}

      <div className="topics-hero-interaction-box">
        <span className="topics-hero-interaction-num">
          {formatHeat(stats.participantEstimate)}
        </span>
        <span className="topics-hero-interaction-unit">互动参与</span>
      </div>
      <p className="topics-hero-interaction-footer">
        {stats.noteCount} 人贴便签 · {formatHeat(stats.totalLikes)} 次获赞
      </p>

      <div className="topics-hero-cta-row">
        <button type="button" className="btn-primary topics-hero-cta" onClick={onParticipate}>
          贴一条便签参与
        </button>
        <button type="button" className="btn-secondary topics-hero-cta" onClick={onParticipate}>
          去地图看看
        </button>
      </div>

      {moreNotes.length > 0 && (
        <ul className="topics-hero-note-list">
          {moreNotes.map((note) => (
            <li key={note.id} className="topics-hero-note-item">
              <span className="topics-hero-note-emoji">{getIconEmoji(note.iconId)}</span>
              <div>
                <p className="topics-hero-note-text topics-hero-note-text--inline">
                  {note.text}
                </p>
                <span className="topics-hero-by-user">
                  {note.roomId} · by <strong>{getNoteAuthorLabel(note.id)}</strong> · ❤{" "}
                  {note.helpfulCount}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopicListRow({
  topic,
  notes,
  onSelect,
}: {
  topic: Topic;
  notes: LeafNote[];
  onSelect: () => void;
}) {
  const stats = getTopicStats(topic.id, notes);

  return (
    <button type="button" className="topic-list-row" onClick={onSelect}>
      <div className="topic-list-row-main">
        <TopicSourceBadge source={topic.source} />
        <span className="topic-list-row-title">{topic.title}</span>
        {topic.status === "ended" && (
          <span className="topic-list-row-ended">已结束</span>
        )}
      </div>
      <div className="topic-list-row-meta">
        <span>{stats.noteCount} 便签</span>
        <span>❤ {stats.totalLikes}</span>
        <span className="topic-list-row-status">
          {topic.status === "active" ? "进行中" : "已结束"}
        </span>
      </div>
    </button>
  );
}

export function TopicsPage({ onParticipateTopic }: TopicsPageProps) {
  const { notes, likedNoteIds, lastRefreshedAt } = useLeafNoteStore();
  const { topics } = useTopicStore();
  const refresh = useLeafNoteRefresh();
  const [period, setPeriod] = useState<LeaderboardPeriod>("today");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const activeNotes = useMemo(
    () => notes.filter((n) => n.status === "active"),
    [notes]
  );

  const { main, subs } = useMemo(
    () => pickFeaturedTopics(topics, activeNotes),
    [topics, activeNotes]
  );

  const otherTopics = useMemo(() => {
    const exclude = new Set([main?.id, ...subs.map((t) => t.id)].filter(Boolean));
    return topics
      .filter((t) => t.status === "active" && !exclude.has(t.id))
      .slice(0, 5);
  }, [topics, main, subs]);

  const listTopics = useMemo(() => [...subs, ...otherTopics], [subs, otherTopics]);

  const selectedTopic = useMemo(
    () => (selectedTopicId ? topics.find((t) => t.id === selectedTopicId) : null),
    [topics, selectedTopicId]
  );

  const periodNotes = useMemo(
    () => sortByHeat(filterByPeriod(activeNotes, period)),
    [activeNotes, period]
  );

  const ranked = periodNotes.slice(0, 15);

  const handleParticipate = (topic: Topic) => {
    onParticipateTopic(topic.id, topic.suggestedTags);
  };

  return (
    <div className="tab-page topics-page topics-page--plaza">
      <PullToRefresh onRefresh={refresh} className="ptr--dark">
        <div className="topics-lb-scroll">
          <header className="topics-lb-header">
            <h1>话题广场</h1>
            <p className="topics-lb-tagline">
              今日议题 · 便签聚热 · 地图参与
              {lastRefreshedAt && (
                <span className="topics-lb-refreshed">
                  {" "}
                  · 已更新{" "}
                  {new Date(lastRefreshedAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </header>

          {main ? (
            <FeaturedTopicHero
              topic={main}
              notes={activeNotes}
              onParticipate={() => handleParticipate(main)}
            />
          ) : (
            <section className="topics-featured topics-hero-card">
              <p className="topics-hero-note-text topics-hero-note-text--muted">
                暂无进行中话题
              </p>
            </section>
          )}

          {listTopics.length > 0 && (
            <section className="topics-list-section" aria-label="今日话题列表">
              <h2 className="topics-section-title">更多话题</h2>
              <div className="topic-list">
                {listTopics.map((topic) => (
                  <TopicListRow
                    key={topic.id}
                    topic={topic}
                    notes={activeNotes}
                    onSelect={() =>
                      setSelectedTopicId((id) =>
                        id === topic.id ? null : topic.id
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {selectedTopic && (
            <section className="topics-detail-panel" aria-label="话题详情">
              <div className="topics-detail-head">
                <h3>{selectedTopic.title}</h3>
                <TopicSourceBadge source={selectedTopic.source} />
              </div>
              {selectedTopic.subtitle && (
                <p className="topics-detail-subtitle">{selectedTopic.subtitle}</p>
              )}
              <div className="topics-hero-cta-row">
                <button
                  type="button"
                  className="btn-primary topics-hero-cta"
                  onClick={() => handleParticipate(selectedTopic)}
                >
                  贴便签参与
                </button>
              </div>
              <ul className="topics-detail-note-list">
                {getNotesForTopic(selectedTopic.id, activeNotes).length === 0 ? (
                  <li className="topics-lb-empty">暂无便签</li>
                ) : (
                  getNotesForTopic(selectedTopic.id, activeNotes).map((note, idx) => (
                    <li key={note.id} className="topics-hero-note-item">
                      {selectedTopic.originNoteId === note.id && idx === 0 && (
                        <span className="topics-detail-origin-tag">发起便签</span>
                      )}
                      <span className="topics-hero-note-emoji">{getIconEmoji(note.iconId)}</span>
                      <div>
                        <p className="topics-hero-note-text">{note.text}</p>
                        <span className="topics-hero-by-user">
                          {note.roomId} · ❤ {note.helpfulCount}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          )}

          <section className="topics-lb-board topics-lb-board--collapsed">
            <button
              type="button"
              className="topics-lb-collapse-toggle"
              onClick={() => setLeaderboardOpen((v) => !v)}
              aria-expanded={leaderboardOpen}
            >
              便签热榜（补充）
              <span className="topics-lb-collapse-icon">{leaderboardOpen ? "▾" : "▸"}</span>
            </button>

            {leaderboardOpen && (
              <>
                <div className="topics-lb-tabs" role="tablist">
                  {PERIOD_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={period === tab.id}
                      className={`topics-lb-tab${period === tab.id ? " topics-lb-tab--active" : ""}`}
                      onClick={() => setPeriod(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <ul className="topics-lb-list">
                  {ranked.length === 0 ? (
                    <li className="topics-lb-empty">排行榜为空</li>
                  ) : (
                    ranked.map((note, idx) => {
                      const rank = idx + 1;
                      const primaryTag = note.tags[0];
                      const tagDef = primaryTag ? getTagDef(primaryTag) : null;
                      return (
                        <li key={note.id} className="topics-lb-row">
                          <div className="topics-lb-row-left">
                            <RankBadge rank={rank} />
                            <div className="topics-lb-row-info">
                              <div className="topics-lb-row-title">
                                <span className="topics-lb-row-emoji">
                                  {getIconEmoji(note.iconId)}
                                </span>
                                <span className="topics-lb-row-name">{note.roomId}</span>
                              </div>
                              <p className="topics-lb-row-bio">{note.text}</p>
                              {tagDef && (
                                <span
                                  className="topics-lb-row-tag"
                                  style={{ color: tagDef.color }}
                                >
                                  #{tagDef.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="topics-lb-row-right">
                            <span className="topics-lb-row-likes">❤ {note.helpfulCount}</span>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
                <p className="topics-hero-interaction-footer">
                  {periodNotes.length} 条便签 ·{" "}
                  {periodNotes.reduce((s, n) => s + n.helpfulCount, 0)} 次获赞 ·{" "}
                  {likedNoteIds.size} 次点赞
                </p>
              </>
            )}
          </section>
        </div>
      </PullToRefresh>
    </div>
  );
}
