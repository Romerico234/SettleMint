import { useEffect } from "react";
import type { Tab } from "../shared/types";

type UseAuthenticatedAppRouteInput = {
  isAuthenticated: boolean;
  sessionReady: boolean;
  selectedTab: Tab;
  setSelectedTab: (tab: Tab) => void;
};

export function useAuthenticatedAppRoute({
  isAuthenticated,
  sessionReady,
  selectedTab,
  setSelectedTab,
}: UseAuthenticatedAppRouteInput) {
  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (!isAuthenticated && selectedTab !== "Home") {
      setSelectedTab("Home");
      return;
    }

    if (isAuthenticated && selectedTab === "Home") {
      setSelectedTab("Overview");
    }
  }, [isAuthenticated, selectedTab, sessionReady, setSelectedTab]);
}
