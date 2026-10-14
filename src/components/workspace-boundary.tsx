"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getCloudSyncClient } from "@/lib/cloud-sync-client";

/** Mount clinical workspaces only after verifying the clinician session. */
export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{
    ready: boolean;
    userId: string | null;
    error: boolean;
  }>({
    ready: false,
    userId: null,
    error: false,
  });

  useEffect(() => {
    const client = getCloudSyncClient();
    const unsubscribe = client.subscribe((state) => {
      if (state.sessionReady) {
        setSession({
          ready: true,
          userId: state.currentUser?.id ?? null,
          error: false,
        });
      } else {
        if (state.errorMessage) {
          console.error("[Dentarith] Session verification failure:", state.errorMessage);
        }
        setSession({
          ready: false,
          userId: null,
          error: Boolean(state.errorMessage),
        });
      }
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const verifyDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void client.checkSession();
      }, 500);
    };

    window.addEventListener("focus", verifyDebounced);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
      window.removeEventListener("focus", verifyDebounced);
    };
  }, []);

  if (!session.ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-sm text-slate-600">
        <div role="status">
          {session.error
            ? "Session verification is unavailable. Account data stays hidden; retry to reopen it."
            : "Opening your clinical workspace…"}
        </div>
        {session.error && (
          <button
            type="button"
            onClick={() => {
              void getCloudSyncClient().checkSession();
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
          >
            Retry session verification
          </button>
        )}
      </div>
    );
  }

  return <div key={session.userId ?? "local"}>{children}</div>;
}

