"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isClarification?: boolean;
};

// Parse markdown table into structured data.
// Returns a table with zero rows when only the header + separator have arrived
// (during streaming) so the table shell renders immediately.
function parseTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split("\n").filter(line => line.trim());
  if (lines.length < 2) return null;

  if (!lines[0].includes("|")) return null;

  const parseLine = (line: string) =>
    line.split("|").map(cell => cell.trim()).filter(Boolean);

  const headers = parseLine(lines[0]);
  if (headers.length === 0) return null;

  let dataStart = 1;
  if (lines[1] && lines[1].includes("---")) {
    dataStart = 2;
  }

  const rows = lines.slice(dataStart)
    .filter(line => line.includes("|"))
    .map(parseLine)
    .filter(row => row.length > 0);

  // Allow tables with zero data rows — they appear during streaming while
  // the first data row is still being typed.
  return { headers, rows };
}

// Simple markdown formatter for inline elements
function formatInlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-sm font-mono">$1</code>');
}

// Thinking dots — shown while waiting for the first token.
function ThinkingDots() {
  return (
    <span className="flex items-center gap-[3px] py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-[5px] h-[5px] rounded-full bg-current opacity-50"
          style={{ animation: `bounce 1.2s ease-in-out ${delay}ms infinite` }}
        />
      ))}
    </span>
  );
}

// Streaming-aware renderer.
//
// Splits content at the last newline:
//   completeLines  — everything up to and including the last \n
//   partialLine    — the token fragment currently being typed (no \n yet)
//
// completeLines is rendered with full markdown parsing so tables, bold, and
// bullet points appear as soon as each line is finished.
// partialLine is rendered as plain text + blinking cursor so no half-baked
// markdown syntax flashes on screen while a token is mid-way.
function StreamingContent({ content }: { content: string }) {
  if (!content) return <ThinkingDots />;

  const lastNL = content.lastIndexOf("\n");
  const completeLines = lastNL >= 0 ? content.slice(0, lastNL + 1) : "";
  const partialLine   = lastNL >= 0 ? content.slice(lastNL + 1) : content;

  return (
    <>
      {completeLines && <MarkdownContent content={completeLines} />}
      {partialLine && (
        <span className="whitespace-pre-wrap">{partialLine}</span>
      )}
      <span className="inline-flex items-center ml-0.5">
        <span className="w-[2px] h-4 bg-indigo-500 rounded-full animate-pulse opacity-60" />
      </span>
    </>
  );
}

// Render a markdown table
function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-indigo-50/40">
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-border/30 last:border-0",
                i % 2 === 1 && "bg-muted/10"
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-muted-foreground">
                  <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Render a code block
function CodeBlock({ content }: { content: string; language?: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-xl bg-zinc-900 p-4 text-zinc-100">
      <code className="text-sm font-mono">{content}</code>
    </pre>
  );
}

// Parse and render content
function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (isStreaming) {
    return <StreamingContent content={content} />;
  }

  const rendered = useMemo(() => {
    const elements: React.ReactElement[] = [];
    let remaining = content;
    let key = 0;

    // Process content section by section
    while (remaining.length > 0) {
      // Check for code block
      const codeMatch = remaining.match(/^```(\w*)\n?([\s\S]*?)```/);
      if (codeMatch) {
        elements.push(
          <CodeBlock key={key++} content={codeMatch[2].trim()} language={codeMatch[1]} />
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Check for table (multiple lines starting with |)
      const tableMatch = remaining.match(/^(\|[^\n]+\|\n?)+/m);
      if (tableMatch && tableMatch.index === 0) {
        const table = parseTable(tableMatch[0]);
        if (table) {
          elements.push(<MarkdownTable key={key++} {...table} />);
          remaining = remaining.slice(tableMatch[0].length);
          continue;
        }
      }

      // Find next special element
      const nextCode = remaining.indexOf("```");
      const nextTable = remaining.search(/^\|/m);

      let nextBreak = remaining.length;
      if (nextCode !== -1 && nextCode < nextBreak) nextBreak = nextCode;
      if (nextTable !== -1 && nextTable < nextBreak && nextTable > 0) nextBreak = nextTable;

      // Process text up to next special element
      const textSection = remaining.slice(0, nextBreak);
      if (textSection.trim()) {
        elements.push(
          <TextSection key={key++} content={textSection} />
        );
      }
      remaining = remaining.slice(nextBreak);
    }

    return elements;
  }, [content]);

  return <>{rendered}</>;
}

// Render text with markdown formatting
function TextSection({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold mt-4 mb-2 first:mt-0">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(4)) }} />
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-lg font-semibold mt-5 mb-2 first:mt-0">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(3)) }} />
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={key++} className="text-xl font-semibold mt-5 mb-3 first:mt-0">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(2)) }} />
        </h1>
      );
    }
    // List items
    else if (trimmed.startsWith("- ")) {
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-1">
          <span className="text-muted-foreground mt-1.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.slice(2)) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <div key={key++} className="flex items-start gap-2 my-1">
            <span className="text-muted-foreground min-w-[1.5rem]">{match[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(match[2]) }} />
          </div>
        );
      }
    }
    // Regular text
    else if (trimmed) {
      elements.push(
        <p key={key++} className="my-1 first:mt-0 last:mb-0">
          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
        </p>
      );
    }
    // Empty line = paragraph break
    else if (elements.length > 0) {
      elements.push(<div key={key++} className="h-2" />);
    }
  }

  return <>{elements}</>;
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
  isClarification,
}: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-muted text-foreground"
            : "text-foreground",
          !isUser && isClarification && "border-l-2 border-amber-400/70 pl-3"
        )}
      >
        <div className="text-[15px] leading-relaxed">
          <MarkdownContent content={content} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  );
}
