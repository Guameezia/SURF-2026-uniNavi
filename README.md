# S 楼室内导航 Web 版

基于 React + TypeScript + Vite 的室内导航 Web 应用，从 uni-app 微信小程序项目迁移而来。

## 项目简介

本项目是 S 楼室内导航系统的 Web 版本，提供楼层地图浏览、POI（兴趣点）查看和室内路径规划功能。系统支持 0F-5F 共 6 个楼层的地图显示和导航。

### 核心功能

- **楼层地图显示**：支持 6 个楼层（0F-5F）的 SVG 地图显示
- **POI 展示**：在地图上显示房间、洗手间、出口、电梯、楼梯等兴趣点
- **楼层切换**：快速切换不同楼层查看地图
- **路径规划**：支持同楼层和跨楼层的最短路径规划
- **地图交互**：支持鼠标滚轮缩放和拖拽平移

## 技术栈

- **框架**：React 18
- **语言**：TypeScript 5
- **构建工具**：Vite
- **状态管理**：Zustand
- **地图渲染**：SVG 原生渲染

## 快速开始

### 安装依赖

```bash
cd uni-navi-web
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
uni-navi-web/
├── public/
│   └── maps/                      # SVG 地图资源
│       ├── S_0F.svg               # 0 楼地图
│       ├── S_1F.svg               # 1 楼地图
│       ├── S_2F.svg               # 2 楼地图
│       ├── S_3F.svg               # 3 楼地图
│       ├── S_4F.svg               # 4 楼地图
│       └── S_5F.svg               # 5 楼地图
├── src/
│   ├── types/
│   │   └── indoor.ts              # TypeScript 类型定义
│   ├── data/
│   │   ├── nodes.ts               # S 楼节点数据 (539 个)
│   │   ├── edges.ts               # S 楼边数据 (613 条)
│   │   ├── floorGeometry.ts       # 楼层坐标 / viewBox 单一数据源
│   │   ├── floorPortals.ts        # 跨层竖井连接单一数据源
│   │   ├── roomConfig.ts          # 0F/1F 分房间导航配置
│   │   ├── index.ts               # 数据导出入口
│   │   └── adapters/
│   │       └── legacyIndoorData.ts
│   ├── algorithms/
│   │   ├── graph.ts               # 图数据结构构建
│   │   ├── pathfinding.ts         # Dijkstra 路径算法
│   │   └── routeRoomBridge.ts     # 图寻路 ↔ 分房间导航桥接
│   ├── store/
│   │   ├── mapStore.ts            # 地图与导航状态
│   │   └── roomStore.ts           # 分房间当前位置
│   ├── components/
│   │   └── map/
│   │       ├── MapViewport.tsx    # 统一视口（CAD / 分房间）
│   │       ├── IndoorMapSVG.tsx   # 2F–5F 整层 CAD
│   │       ├── RoomMapView.tsx    # 0F/1F 分房间导航
│   │       └── FloorSelector.tsx
│   ├── App.tsx                    # 主应用组件
│   ├── App.css                    # 应用样式
│   └── main.tsx                   # 应用入口
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 数据格式

### 节点 (MapNode)

```typescript
interface MapNode {
  id: string;           // 节点唯一标识，如 "S-1F-101"
  type: IndoorNodeType; // 节点类型
  label: string;        // 显示标签
  building: string;     // 所属建筑，如 "S"
  floorId: FloorId;     // 所在楼层，如 "1F"
  block: string;        // 所属区块
  x: number;            // X 坐标
  y: number;            // Y 坐标
}
```

节点类型：
- `room` - 房间（273 个）
- `junction` - 路口/中转点（134 个）
- `stairs` - 楼梯（52 个）
- `exit` - 出口（34 个）
- `elevator` - 电梯（24 个）
- `toilet` - 洗手间（22 个）

### 边 (MapEdge)

```typescript
interface MapEdge {
  from: string;         // 起点节点 ID
  to: string;           // 终点节点 ID
  distance: number;     // 距离（米）
  edgeType: EdgeType;   // 边类型
  directionHint: string; // 方向提示
  waypoints?: MapPoint[]; // 可选中间折点，用于贴合浅灰色可走廊道
}
```

边类型：
- `flat` - 同层平面连接（547 条）
- `stairs` - 楼梯连接（46 条）
- `elevator` - 电梯连接（20 条）

## 路径算法

### Dijkstra 最短路径

使用 Dijkstra 算法计算最短路径，支持两种模式：

1. **同楼层路径**：仅使用 `flat` 类型的边，优先在同一楼层内寻路
2. **跨楼层路径**：允许使用 `flat`、`stairs`、`elevator` 所有类型的边

### 路径分段

计算结果按楼层分段返回 `RouteSegment[]`，每段包含：
- `floorId` - 所在楼层
- `nodeIds` - 途经节点 ID 列表
- `points` - 坐标点列表，用于 SVG 绘制

## 地图模式

`MapViewport` 按楼层自动切换渲染策略：

| 楼层 | 模式 | 组件 | 交互 |
|------|------|------|------|
| 0F、1F | 分房间导航 | `RoomMapView` | 方向键 / 方向盘在 room 间移动 |
| 2F–5F | 整层 CAD | `IndoorMapSVG` | 缩放、拖拽、点击 POI |

规划路线后，`routeRoomBridge` 将图寻路的 `nodeIds` 映射为 room 序列；在 0F/1F 会：

- 自动进入路线起点 room
- 方向盘仅显示沿路线允许的方向
- 高亮「下一站」room（顶栏提示 + 小地图绿色块）
- 小地图叠加 CAD 路径线

跨层竖井连接定义在 `floorPortals.ts`，与 `roomConfig` 共用，避免多处手工维护。

## 地图渲染

### 双层渲染架构

1. **底层**：通过 `<img>` 加载楼层 SVG 地图作为背景
2. **顶层**：SVG overlay 渲染路网节点、边和导航路径

### 交互功能

- **缩放**：鼠标滚轮或点击 +/- 按钮
- **平移**：鼠标拖拽
- **重置**：点击重置按钮恢复初始视图
- **选择**：点击 POI 节点选中

### 颜色说明

| 元素 | 颜色 |
|------|------|
| 房间 | 绿色 (#4CAF50) |
| 洗手间 | 蓝色 (#2196F3) |
| 出口 | 橙色 (#FF9800) |
| 电梯 | 紫色 (#9C27B0) |
| 楼梯 | 粉色 (#E91E63) |
| 路径 | 蓝色 (#1976D2) |

## 使用说明

1. **浏览地图**：使用右侧楼层选择器切换楼层，用鼠标滚轮缩放、拖拽平移地图
2. **查看 POI**：点击地图上的节点查看详情，不同颜色代表不同类型的地点
3. **规划路径**：
   - 在顶部选择起点 POI
   - 选择终点 POI
   - 点击「Plan」按钮
   - 路径会在地图上显示，跨楼层路径可通过楼层选择器切换查看
4. **0F/1F 分房间浏览**：
   - 使用方向键或屏幕方向盘在走廊 / 房间间移动
   - Tongfa 食堂、SA007、SD085 等有贴图；其余区域为占位
   - 右下角小地图可缩放、点击跳转 room；导航时显示路径
   - 「Drop a Leaf」放置便签，支持 localStorage 持久化
5. **清除路径**：点击「Edit」后可重新编辑路线

调试模式仅在开发环境（`npm run dev`）显示。

## 开发计划

### 当前版本

- [x] 项目基础架构搭建
- [x] S 楼数据迁移
- [x] 楼层地图显示（CAD + 分房间双模式）
- [x] POI 展示与路径规划（Comfort / Fast）
- [x] 图寻路 ↔ 分房间导航桥接
- [x] 楼层几何 / 竖井连接单一数据源

### 后续计划

以下功能计划在后续版本中实现：

- [ ] 室内定位服务
- [ ] 模糊搜索和筛选
- [ ] AI 智能推荐
- [ ] 复杂信息卡片
- [ ] UI 美化和动画
- [ ] 更多建筑数据
- [ ] 移动端适配优化

## 从旧项目迁移

本项目从 uni-app 微信小程序版本迁移而来，主要变更：

| 原项目 | 新项目 |
|--------|--------|
| uni-app / Vue | React 18 |
| JavaScript | TypeScript 5 |
| 小程序 Canvas | SVG 原生渲染 |
| 本地状态 | Zustand 状态管理 |
| `floor` 字段 | `floorId` 字段 |
| `staircase` 类型 | `stairs` 类型 |

## License

MIT
