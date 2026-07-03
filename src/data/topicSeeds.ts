import type { Topic } from "../types/topic";

/**
 * 官方话题种子数据。
 * 后期接入平台时可改为 API 拉取，结构保持不变。
 */
export const OFFICIAL_TOPIC_SEEDS: Topic[] = [
  {
    id: "official-exam-study",
    title: "期末自习哪里人少？",
    subtitle: "分享你的宝藏自习位，帮同学避坑",
    source: "official",
    status: "active",
    suggestedTags: ["study", "tip"],
    priority: 100,
    createdAt: Date.now(),
  },
  {
    id: "official-canteen-today",
    title: "今天食堂哪档值得排？",
    subtitle: "实时口味情报，路过就贴一条",
    source: "official",
    status: "active",
    suggestedTags: ["food", "tip"],
    priority: 90,
    createdAt: Date.now(),
  },
  {
    id: "official-shortcut",
    title: "校园捷径情报站",
    subtitle: "楼梯、侧门、近路——地图上没有的才最有用",
    source: "official",
    status: "active",
    suggestedTags: ["shortcut", "tip"],
    priority: 80,
    createdAt: Date.now(),
  },
  {
    id: "official-facility",
    title: "设施避坑指南",
    subtitle: "打印机、插座、Wi-Fi 哪里靠谱？",
    source: "official",
    status: "active",
    suggestedTags: ["facility", "warning"],
    priority: 70,
    createdAt: Date.now(),
  },
];
