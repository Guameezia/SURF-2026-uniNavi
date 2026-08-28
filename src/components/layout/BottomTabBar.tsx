export type AppTab = "home" | "guides" | "profile";

interface TabItem {
  id: AppTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: "home", label: "首页", icon: "🏠" },
  { id: "guides", label: "攻略", icon: "📒" },
  { id: "profile", label: "我的", icon: "👤" },
];

interface BottomTabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <nav className="bottom-tab-bar" aria-label="主导航">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-tab-item${active ? " bottom-tab-item--active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(tab.id)}
          >
            <span className="bottom-tab-icon" aria-hidden>
              {tab.icon}
            </span>
            <span className="bottom-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
