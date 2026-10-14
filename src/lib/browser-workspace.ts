const contexts = new WeakMap<Window, { userId: string | null; listeners: Set<() => void> }>();

function context() {
  if (typeof window === "undefined") return null;
  let value = contexts.get(window);
  if (!value) {
    value = { userId: null, listeners: new Set() };
    contexts.set(window, value);
  }
  return value;
}

export function getWorkspaceUserId(): string | null {
  return context()?.userId ?? null;
}

export function workspaceStorageKey(part: string, userId = getWorkspaceUserId()): string {
  const scope = userId === null ? "local" : `user:${encodeURIComponent(userId)}`;
  return `dentarith:v2:${scope}:${part}`;
}

export function setWorkspaceUserId(userId: string | null): void {
  const current = context();
  if (current && current.userId !== userId) {
    // Give an outgoing clinical form a chance to preserve its scoped draft.
    if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("dentarith-workspace-before-change"));
    current.userId = userId;
    notifyWorkspaceChanged();
  }
}

export function assertWorkspaceCurrent(userId: string | null): void {
  if (getWorkspaceUserId() !== userId) {
    throw new Error("The active workspace changed. Please retry in the current account.");
  }
}

export function notifyWorkspaceChanged(): void {
  for (const listener of context()?.listeners ?? []) {
    try { listener(); } catch { /* A UI observer cannot invalidate a persisted write. */ }
  }
}

export function subscribeWorkspace(listener: () => void): () => void {
  const listeners = context()?.listeners;
  listeners?.add(listener);
  return () => listeners?.delete(listener);
}
