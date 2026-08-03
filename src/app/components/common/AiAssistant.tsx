import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, ArrowUpRight, Info } from 'lucide-react';

/**
 * AI assistant, available from every screen in the app.
 *
 * UI only for now. The suggestions are drawn from the screen the estimator is
 * on, because a generic "how can I help?" makes the user do the work of framing
 * the question — the whole point of surfacing prompts is to show what the
 * assistant is good for *here*.
 *
 * It does not fabricate answers. Sending a prompt echoes it and says plainly
 * that the assistant is not connected yet, which is honest about the state of
 * the feature rather than demoing invented estimating advice.
 */

interface ScreenContext {
  /** What the assistant says it is looking at. */
  label: string;
  /** Prompts in the order they should be offered — most useful first. */
  prompts: string[];
}

const GENERAL: ScreenContext = {
  label: 'Brightpoint',
  prompts: [
    'Explain this page.',
    'Show project insights.',
    'Find an Assembly or Part.',
    'Help me build a bid.',
  ],
};

/**
 * Page id → context. Keyed on App's AppPage ids so a new screen only has to add
 * a row here to get relevant prompts.
 */
const SCREEN_CONTEXT: Record<string, ScreenContext> = {
  dashboard: {
    label: 'your dashboard',
    prompts: [
      'Show project insights.',
      'Which bids are due this week?',
      'How is my win rate trending?',
      'Which estimates need attention?',
    ],
  },
  projects: {
    label: 'the projects list',
    prompts: [
      'Which projects need attention?',
      'Show project insights.',
      'What is due in the next two weeks?',
      'Explain this page.',
    ],
  },
  'project-detail': {
    label: 'this project',
    prompts: [
      'Answer questions about this project.',
      'What is outstanding on this project?',
      'Summarise the scope of work.',
      'Explain this page.',
    ],
  },
  'create-project': {
    label: 'the new project wizard',
    prompts: [
      'Explain this page.',
      'What information do I need to start?',
      'Copy settings from a similar project.',
    ],
  },
  drawings: {
    label: 'the drawing set',
    prompts: [
      'Which sheets still need review?',
      'What did the AI detect on these sheets?',
      'Explain this page.',
      'Answer questions about this project.',
    ],
  },
  'takeoff-workspace': {
    label: 'the takeoff workspace',
    prompts: [
      'Find an Assembly or Part.',
      'How do I measure a conduit run?',
      'What have I counted on this sheet?',
      'Explain this page.',
    ],
  },
  libraries: {
    label: 'the libraries',
    prompts: [
      'Find an Assembly or Part.',
      'Build a new assembly.',
      'Which assemblies use this part?',
      'Explain this page.',
    ],
  },
  pricing: {
    label: 'the pricing sheet',
    prompts: [
      'Find pricing for a material.',
      'Which items are missing a price?',
      'What are NECA 1 hours?',
      'Explain this page.',
    ],
  },
  'bid-builder': {
    label: 'the bid',
    prompts: [
      'Help me build a bid.',
      'What is still blocking this bid?',
      'Why is my return where it is?',
      'Explain the cost categories.',
    ],
  },
  'proposal-center': {
    label: 'this proposal',
    prompts: [
      'Draft a scope of work.',
      'Does this proposal match the bid?',
      'Suggest value engineering options.',
      'Explain this page.',
    ],
  },
  settings: {
    label: 'settings',
    prompts: [
      'How do markup defaults work?',
      'Find a part in the library.',
      'Explain this page.',
    ],
  },
  reports: {
    label: 'reports',
    prompts: ['Show project insights.', 'How is my win rate trending?', 'Explain this page.'],
  },
  team: {
    label: 'team & access',
    prompts: ['What can a Field user do?', 'Explain the role permissions.', 'Explain this page.'],
  },
};

interface Message {
  id: string;
  from: 'user' | 'assistant';
  text: string;
}

export function AiAssistant({ page, screenLabel }: {
  /** App page id, used to pick the suggestions. */
  page: string;
  /** Overrides the context label — e.g. the project name on a project screen. */
  screenLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const seq = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx = SCREEN_CONTEXT[page] ?? GENERAL;
  const label = screenLabel ?? ctx.label;

  // Conversation resets when the estimator moves to another screen — the
  // suggestions are about where they are now, and a stale thread contradicts them.
  useEffect(() => { setMessages([]); setDraft(''); }, [page]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    seq.current += 2;
    setMessages((prev) => [
      ...prev,
      { id: `u-${seq.current}`, from: 'user', text: value },
      {
        id: `a-${seq.current}`,
        from: 'assistant',
        text: 'The assistant is not connected yet — this is the interface only. Once it is wired up it will answer from your takeoff, pricing and bid data.',
      },
    ]);
    setDraft('');
  }

  // ── Collapsed: the launcher ────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask the AI assistant"
        aria-label="Open the AI assistant"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 55,
          height: 48, padding: '0 16px 0 14px', borderRadius: 9999, border: 'none',
          background: '#2563EB', color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 6px 20px rgba(37,99,235,0.32)',
        }}
      >
        <Sparkles size={16} />
        Ask AI
      </button>
    );
  }

  // ── Open: the panel ────────────────────────────────────────────────────────
  return (
    <div
      className="bp-ai-panel"
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 55,
        width: 380, maxHeight: 'min(620px, calc(100vh - 120px))',
        display: 'flex', flexDirection: 'column',
        background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
        boxShadow: '0 16px 48px rgba(17,24,39,0.18)', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={14} color="#2563EB" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>AI assistant</div>
          <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Looking at {label}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close the AI assistant"
          style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <X size={13} color="#6B7280" />
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, minHeight: 200 }}>
        {/* Welcome — always present, so the panel never opens empty */}
        <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <Sparkles size={12} color="#2563EB" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>
              How can I help you?
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: '18px' }}>
              I can read your takeoff, pricing and bid. Pick a starting point below, or ask
              anything about {label}.
            </div>
          </div>
        </div>

        {/* Context-aware suggestions */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Suggested here
            </div>
            {ctx.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 11px', border: '1px solid #E5E7EB', borderRadius: 8,
                  background: 'white', cursor: 'pointer', fontSize: 12, color: '#374151',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FBFF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              >
                <span style={{ flex: 1 }}>{prompt}</span>
                <ArrowUpRight size={12} color="#9CA3AF" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}

        {/* Thread */}
        {messages.map((m) => (
          m.from === 'user' ? (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <span style={{ maxWidth: '84%', padding: '8px 11px', borderRadius: 10, background: '#2563EB', color: 'white', fontSize: 12, lineHeight: '18px' }}>
                {m.text}
              </span>
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Info size={12} color="#6B7280" />
              </span>
              <span style={{ flex: 1, padding: '8px 11px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6', fontSize: 12, color: '#6B7280', lineHeight: '18px' }}>
                {m.text}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Composer */}
      <div style={{ borderTop: '1px solid #E5E7EB', padding: 10, background: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); }
            }}
            rows={1}
            placeholder={`Ask about ${label}…`}
            style={{
              flex: 1, minHeight: 34, maxHeight: 96, padding: '8px 10px',
              border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12,
              fontFamily: 'inherit', lineHeight: '18px', resize: 'none',
              outline: 'none', boxSizing: 'border-box', background: 'white', color: '#111827',
            }}
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim()}
            aria-label="Send"
            style={{
              width: 34, height: 34, border: 'none', borderRadius: 8, flexShrink: 0,
              background: draft.trim() ? '#2563EB' : '#E5E7EB',
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={14} color={draft.trim() ? 'white' : '#9CA3AF'} />
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
          Interface preview — the assistant is not answering yet.
        </div>
      </div>
    </div>
  );
}
