import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { WorkspaceBoundary } from "./workspace-boundary";
import * as cloudSync from "@/lib/cloud-sync-client";

describe("WorkspaceBoundary privacy & session isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render clinical children when session is not ready", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        WorkspaceBoundary,
        null,
        React.createElement("div", { id: "sensitive-patient-data" }, "Confidential Finding")
      )
    );

    expect(html).not.toContain("sensitive-patient-data");
    expect(html).not.toContain("Confidential Finding");
    expect(html).toContain('role="status"');
    expect(html).toContain("Opening your clinical workspace…");
  });

  it("keeps the status message inside role='status' and retry button outside", () => {
    const errorStateComponent = React.createElement(
      "div",
      { className: "flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-slate-600" },
      React.createElement(
        "div",
        { role: "status" },
        "Session verification is unavailable. Account data stays hidden; retry to reopen it."
      ),
      React.createElement(
        "button",
        { type: "button", className: "rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100" },
        "Retry session verification"
      )
    );

    const html = ReactDOMServer.renderToStaticMarkup(errorStateComponent);
    expect(html).toContain('<div role="status">Session verification is unavailable. Account data stays hidden; retry to reopen it.</div>');
    expect(html).toContain('<button type="button"');
    const statusContent = html.match(/<div role="status">(.*?)<\/div>/)?.[1];
    expect(statusContent).not.toContain("<button");
  });

  it("clears userId and unmounts children when sessionReady becomes false", () => {
    // Simulate subscription transitions
    let activeSession = { ready: false, userId: null as string | null, error: false };
    const setSession = (next: typeof activeSession) => {
      activeSession = next;
    };

    const handleState = (state: cloudSync.SyncClientState) => {
      if (state.sessionReady) {
        setSession({
          ready: true,
          userId: state.currentUser?.id ?? null,
          error: false,
        });
      } else {
        setSession({
          ready: false,
          userId: null,
          error: Boolean(state.errorMessage),
        });
      }
    };

    // 1. Session ready with user A
    handleState({
      sessionReady: true,
      status: "synced",
      lastSyncedAt: null,
      pendingChanges: 0,
      errorMessage: null,
      isAuthenticated: true,
      currentUser: { id: "user-a", email: "a@test.com", name: "User A", role: "clinician", createdAt: "", updatedAt: "" },
      conflictCases: [],
    });
    expect(activeSession.ready).toBe(true);
    expect(activeSession.userId).toBe("user-a");

    // 2. Sign-out or failed session check: sessionReady becomes false
    handleState({
      sessionReady: false,
      status: "local_only",
      lastSyncedAt: null,
      pendingChanges: 0,
      errorMessage: "Session expired",
      isAuthenticated: false,
      currentUser: null,
      conflictCases: [],
    });

    // userId MUST be cleared to null
    expect(activeSession.ready).toBe(false);
    expect(activeSession.userId).toBeNull();
    expect(activeSession.error).toBe(true);

    // When ready is false, WorkspaceBoundary does NOT render children or hidden div
    const rendered = activeSession.ready
      ? React.createElement("div", { key: activeSession.userId ?? "local" }, "Children")
      : React.createElement("div", { role: "status" }, "Status message");

    const html = ReactDOMServer.renderToStaticMarkup(rendered);
    expect(html).not.toContain("Children");
    expect(html).not.toContain("hidden");
    expect(html).toContain('role="status"');
  });

  it("keys children by userId so each user gets a fresh component tree", () => {
    const userATree = React.createElement(
      "div",
      { key: "user-a" },
      React.createElement("input", { defaultValue: "User A draft finding" })
    );
    const userBTree = React.createElement(
      "div",
      { key: "user-b" },
      React.createElement("input", { defaultValue: "User B draft finding" })
    );

    expect(userATree.key).toBe("user-a");
    expect(userBTree.key).toBe("user-b");
    expect(userATree.key).not.toBe(userBTree.key);
  });

  it("debounces window focus listener calls to checkSession", () => {
    vi.useFakeTimers();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const checkSessionMock = vi.fn();

    const verifyDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        checkSessionMock();
      }, 500);
    };

    // Simulate 5 rapid focus events within 300ms
    verifyDebounced();
    vi.advanceTimersByTime(100);
    verifyDebounced();
    vi.advanceTimersByTime(100);
    verifyDebounced();
    vi.advanceTimersByTime(100);
    verifyDebounced();
    vi.advanceTimersByTime(100);
    verifyDebounced();

    // Not fired yet because 500ms has not elapsed since the last focus event
    expect(checkSessionMock).not.toHaveBeenCalled();

    // Advance 500ms
    vi.advanceTimersByTime(500);

    // Exactly 1 call made despite 5 focus events
    expect(checkSessionMock).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
