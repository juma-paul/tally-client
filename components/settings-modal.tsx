"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UserSettings, getSettings, updateSettings, updateMyName } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, refetchUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.name || "");
      loadSettings();
    }
  }, [isOpen, user?.name]);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    setIsSaving(true);
    try {
      await Promise.all([
        updateSettings({
          theme: settings.theme,
          voice_enabled: settings.voice_enabled,
          notifications: settings.notifications,
        }),
        displayName.trim() !== (user?.name || "") &&
          updateMyName(displayName.trim() || user?.email?.split("@")[0] || ""),
      ]);
      await refetchUser();
      onClose();
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleThemeChange(theme: "light" | "dark" | "system") {
    if (!settings) return;
    setSettings({ ...settings, theme });
    localStorage.setItem("tally-theme", theme);

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Display name */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user?.email?.split("@")[0] || "Your name"}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="mb-2 block text-sm font-medium">Theme</label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2 text-sm capitalize transition-colors",
                      settings.theme === theme
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    )}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Voice Input/Output</div>
                <div className="text-xs text-muted-foreground">
                  Enable microphone and audio playback
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, voice_enabled: !settings.voice_enabled })
                }
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  settings.voice_enabled ? "bg-foreground" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                    settings.voice_enabled && "translate-x-5"
                  )}
                />
              </button>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Notifications</div>
                <div className="text-xs text-muted-foreground">
                  Get reminders for your habits
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, notifications: !settings.notifications })
                }
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  settings.notifications ? "bg-foreground" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                    settings.notifications && "translate-x-5"
                  )}
                />
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-lg bg-foreground py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load settings
          </div>
        )}
      </div>
    </div>
  );
}
