"use client";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const commands = [
  { action: "Create Habit", how: 'create a [name] habit', example: "create a running habit for 5km daily" },
  { action: "List Habits", how: "show my habits", example: "what habits do I have?" },
  { action: "Log Activity", how: "I did [activity]", example: "I ran 3km today" },
  { action: "View Progress", how: "how am I doing with [habit]?", example: "show my running progress" },
  { action: "Update Habit", how: "change [habit] to [new value]", example: "update my running goal to 10km" },
  { action: "Delete Habit", how: "delete [habit]", example: "remove my running habit" },
  { action: "Get Help", how: "/help", example: "type /help anytime" },
];

const tips = [
  "Be Natural: Say 'I walked 8000 steps' instead of 'log 8000 for walking'",
  "Use Voice: Tap the microphone to speak your updates",
  "Check Progress: Ask 'how am I doing?' for an overview",
  "Set Targets: Include goals like '5km daily' when creating habits",
];

const frequencies = [
  { type: "Daily", bestFor: "Regular activities", examples: "Exercise, meditation, reading" },
  { type: "Weekly", bestFor: "Less frequent goals", examples: "Deep cleaning, meal prep" },
  { type: "Monthly", bestFor: "Long-term tracking", examples: "Budget reviews, goal check-ins" },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tally Help</h2>
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

        <div className="max-h-[70vh] overflow-y-auto space-y-6">
          {/* Commands Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Quick Commands</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                    <th className="px-4 py-2 text-left font-medium">How to Ask</th>
                    <th className="px-4 py-2 text-left font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((cmd, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 even:bg-muted/20"
                    >
                      <td className="px-4 py-2 font-medium">{cmd.action}</td>
                      <td className="px-4 py-2 text-muted-foreground">{cmd.how}</td>
                      <td className="px-4 py-2 text-muted-foreground italic">
                        "{cmd.example}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Tips for Best Results</h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Habit Frequencies */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Habit Types</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Frequency</th>
                    <th className="px-4 py-2 text-left font-medium">Best For</th>
                    <th className="px-4 py-2 text-left font-medium">Examples</th>
                  </tr>
                </thead>
                <tbody>
                  {frequencies.map((freq, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 even:bg-muted/20"
                    >
                      <td className="px-4 py-2 font-medium">{freq.type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{freq.bestFor}</td>
                      <td className="px-4 py-2 text-muted-foreground">{freq.examples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Keyboard Shortcuts</h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">
                  Enter
                </kbd>
                <span className="text-muted-foreground">Send message</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">
                  Shift + Enter
                </kbd>
                <span className="text-muted-foreground">New line</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Type <code className="rounded bg-muted px-1">/help</code> in the chat anytime
        </div>
      </div>
    </div>
  );
}
