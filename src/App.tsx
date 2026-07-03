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
import { useAppNavStore } from "./store/appNavStore";
import { HomePage } from "./pages/HomePage";
import { TopicsPage } from "./pages/TopicsPage";
import { ProfilePage } from "./pages/ProfilePage";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const refreshNotes = useLeafNoteStore((s) => s.refreshNotes);
  const refreshTopics = useTopicStore((s) => s.refreshTopics);
  const participateTopic = useAppNavStore((s) => s.participateTopic);

  useEffect(() => {
    refreshNotes();
    refreshTopics();
  }, [activeTab, refreshNotes, refreshTopics]);

  const handleParticipateTopic = (
    topicId: string,
    suggestedTags: Parameters<typeof participateTopic>[1]
  ) => {
    participateTopic(topicId, suggestedTags);
    setActiveTab("home");
  };

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === "home" && <HomePage />}
        {activeTab === "topics" && (
          <TopicsPage onParticipateTopic={handleParticipateTopic} />
        )}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;
