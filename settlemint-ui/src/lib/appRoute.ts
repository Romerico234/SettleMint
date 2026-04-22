import { useEffect, useState } from "react";
import type { Tab } from "../shared/types";

type RouteState = {
  tab: Tab;
  groupId: string;
  cycleId: string;
  inviteCode: string;
};

export function useAppRoute() {
  const initialRouteState = getRouteState();
  const [inviteFromUrl, setInviteFromUrl] = useState(initialRouteState.inviteCode);
  const [selectedTab, setSelectedTab] = useState<Tab>(initialRouteState.tab);
  const [requestedGroupID, setRequestedGroupID] = useState(initialRouteState.groupId);
  const [requestedCycleID, setRequestedCycleID] = useState(initialRouteState.cycleId);

  useEffect(() => {
    function handlePopState() {
      const nextRouteState = getRouteState();
      setSelectedTab(nextRouteState.tab);
      setRequestedGroupID(nextRouteState.groupId);
      setRequestedCycleID(nextRouteState.cycleId);
      setInviteFromUrl(nextRouteState.inviteCode);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    syncBrowserRoute({
      tab: selectedTab,
      groupId: requestedGroupID,
      cycleId: requestedCycleID,
      inviteCode: inviteFromUrl,
    });
  }, [selectedTab, requestedGroupID, requestedCycleID, inviteFromUrl]);

  return {
    inviteFromUrl,
    setInviteFromUrl,
    selectedTab,
    setSelectedTab,
    requestedGroupID,
    setRequestedGroupID,
    requestedCycleID,
    setRequestedCycleID,
  };
}

function getRouteState(): RouteState {
  const url = new URL(window.location.href);
  const pathname = url.pathname.toLowerCase();

  return {
    tab: tabFromPathname(pathname),
    groupId: url.searchParams.get("group")?.trim() || "",
    cycleId: url.searchParams.get("cycle")?.trim() || "",
    inviteCode: url.searchParams.get("invite")?.trim() || "",
  };
}

function syncBrowserRoute(input: RouteState) {
  const nextUrl = new URL(window.location.href);
  nextUrl.pathname = pathnameForTab(input.tab);

  if (input.groupId) {
    nextUrl.searchParams.set("group", input.groupId);
  } else {
    nextUrl.searchParams.delete("group");
  }

  if (input.cycleId) {
    nextUrl.searchParams.set("cycle", input.cycleId);
  } else {
    nextUrl.searchParams.delete("cycle");
  }

  if (input.inviteCode) {
    nextUrl.searchParams.set("invite", input.inviteCode);
  } else {
    nextUrl.searchParams.delete("invite");
  }

  const nextRelativeUrl = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextRelativeUrl !== currentRelativeUrl) {
    window.history.replaceState({}, "", nextRelativeUrl);
  }
}

function tabFromPathname(pathname: string): Tab {
  switch (pathname) {
    case "/expenses":
      return "Expenses";
    case "/settlement-plan":
      return "Settlement Plan";
    case "/archive":
      return "Archive";
    case "/dashboard":
    case "/":
    default:
      return "Overview";
  }
}

function pathnameForTab(tab: Tab) {
  switch (tab) {
    case "Expenses":
      return "/expenses";
    case "Settlement Plan":
      return "/settlement-plan";
    case "Archive":
      return "/archive";
    case "Overview":
    default:
      return "/dashboard";
  }
}
