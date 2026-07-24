/**
 * 室内导航 Web 应用主页面
 */

import { useEffect, useState } from "react";
import {
  BottomTabBar,
  type AppTab,
} from "./components/layout/BottomTabBar";
import { useLeafNoteStore } from "./store/leafNoteStore";
import { useTopicStore } from "./store/topicStore";
import { HomePage } from "./pages/HomePage";
import { GuidePage } from "./pages/GuidePage";
import { ProfilePage } from "./pages/ProfilePage";
import { useGuideStore } from "./store/guideStore";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const refreshNotes = useLeafNoteStore((s) => s.refreshNotes);
  const refreshTopics = useTopicStore((s) => s.refreshTopics);
  const refreshGuides = useGuideStore((s) => s.refresh);

  useEffect(() => {
    refreshNotes();
    refreshTopics();
    refreshGuides();
  }, [activeTab, refreshNotes, refreshTopics, refreshGuides]);

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === "home" && <HomePage />}
        {activeTab === "guides" && (
          <GuidePage onShowOnMap={() => setActiveTab("home")} />
        )}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;
