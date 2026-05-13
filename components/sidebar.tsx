"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Conversation,
  getConversations,
  createConversation,
  deleteConversation,
  updateConversation,
} from "@/lib/api";

type SidebarProps = {
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  refreshTrigger?: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onOpenSettings,
  onOpenHelp,
  refreshTrigger,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Context menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  // Inline rename state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Load immediately — no blocking loading state
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) loadConversations();
  }, [refreshTrigger]);

  async function loadConversations() {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }

  // Close context menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function onDown(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-conv-menu]")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  // Focus & select-all when rename input appears
  useEffect(() => {
    if (editingId !== null) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  }, [editingId]);

  async function handleNewChat() {
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      onSelectConversation(conv.id);
      onNewChat();
      onMobileClose?.();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }

  async function handleDelete(id: number) {
    setOpenMenuId(null);
    if (!confirm("Delete this conversation?")) return;
    // Optimistic remove
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) onNewChat();
    try {
      await deleteConversation(id);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      loadConversations(); // restore on error
    }
  }

  function startEdit(conv: Conversation) {
    setOpenMenuId(null);
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }

  async function commitEdit(id: number) {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    try {
      await updateConversation(id, title);
    } catch {
      loadConversations(); // revert on error
    }
  }

  function handleSelectConversation(id: number) {
    onSelectConversation(id);
    onMobileClose?.();
  }

  function groupByDate(convs: Conversation[]) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { label: string; items: Conversation[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Last 7 days", items: [] },
      { label: "Older", items: [] },
    ];

    convs.forEach((conv) => {
      const date = new Date(conv.updated_at);
      if (date.toDateString() === today.toDateString()) {
        groups[0].items.push(conv);
      } else if (date.toDateString() === yesterday.toDateString()) {
        groups[1].items.push(conv);
      } else if (date > lastWeek) {
        groups[2].items.push(conv);
      } else {
        groups[3].items.push(conv);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }

  const groupedConversations = groupByDate(conversations);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-background",
          "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          "md:static md:inset-auto md:z-auto md:translate-x-0 md:shadow-none md:transition-none",
          isCollapsed ? "md:w-12" : "md:w-64",
        )}
      >
        {isCollapsed ? (
          /* ── Collapsed state (desktop only) ── */
          <div className="flex h-full flex-col items-center py-4">
            <button
              onClick={() => setIsCollapsed(false)}
              className="mb-4 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Expand sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={handleNewChat}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="New chat"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        ) : (
          /* ── Expanded state ── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-sm font-medium">Chats</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hidden rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:block"
                  title="Collapse sidebar"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={onMobileClose}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                  title="Close"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={handleNewChat}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New chat
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2">
              {conversations.length === 0 ? (
                /* Pulse skeleton while first load completes */
                <div className="space-y-1 p-2">
                  {[80, 65, 72, 55].map((w, i) => (
                    <div
                      key={i}
                      className="h-8 animate-pulse rounded-lg bg-muted/60"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              ) : (
                groupedConversations.map((group) => (
                  <div key={group.label} className="mb-4">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </div>
                    {group.items.map((conv) => (
                      <div
                        key={conv.id}
                        data-conv-menu
                        className={cn(
                          "group relative flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-sm transition-colors",
                          currentConversationId === conv.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {editingId === conv.id ? (
                          /* ── Inline rename ── */
                          <input
                            ref={editInputRef}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => commitEdit(conv.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-foreground/20 bg-background px-1 py-0.5 text-sm text-foreground outline-none focus:border-foreground/40"
                          />
                        ) : (
                          <>
                            {/* Title */}
                            <span
                              role="button"
                              tabIndex={0}
                              className="flex-1 truncate"
                              onClick={() => handleSelectConversation(conv.id)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSelectConversation(conv.id)
                              }
                            >
                              {conv.title}
                            </span>

                            {/* ··· button — visible on hover or when menu is open */}
                            <button
                              data-conv-menu
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === conv.id ? null : conv.id);
                              }}
                              className={cn(
                                "ml-1 shrink-0 rounded p-0.5 text-muted-foreground transition-all",
                                "opacity-0 group-hover:opacity-100 hover:text-foreground",
                                openMenuId === conv.id && "opacity-100"
                              )}
                              title="Options"
                            >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="4" cy="10" r="1.5" />
                                <circle cx="10" cy="10" r="1.5" />
                                <circle cx="16" cy="10" r="1.5" />
                              </svg>
                            </button>

                            {/* Dropdown */}
                            {openMenuId === conv.id && (
                              <div
                                data-conv-menu
                                className="absolute right-0 top-full z-20 mt-0.5 w-36 rounded-lg border border-border bg-background py-1 shadow-lg"
                              >
                                <button
                                  data-conv-menu
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(conv);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                                >
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Rename
                                </button>
                                <button
                                  data-conv-menu
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(conv.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 transition-colors hover:bg-muted"
                                >
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <button
                  onClick={() => { onOpenHelp(); onMobileClose?.(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Help
                </button>
                <button
                  onClick={() => { onOpenSettings(); onMobileClose?.(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
