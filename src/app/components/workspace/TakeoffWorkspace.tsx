import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Zap, Undo2, Redo2, Share2, HelpCircle, ChevronLeft, ChevronRight,
  MousePointer2, Hand, ZoomIn, ZoomOut, Maximize2, ArrowLeftRight,
  Ruler, Hash, Pen, Highlighter, Type, MessageSquare,
  Palette, SlidersHorizontal, Magnet, Eye, EyeOff, Sparkles, MoreHorizontal,
  Cloud, CloudOff, Check, X, AlertTriangle, Lock, Unlock,
  Loader2, Search, Package, Edit2, Plus, Minimize2, Crop,
  Filter, Square, Layers as LayersIcon, Tag, RefreshCw as Swap,
} from 'lucide-react';
import { AssemblyPanel } from '../library/AssemblyPanel';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tool =
  | 'select' | 'hand' | 'zoom-in' | 'zoom-out' | 'fit' | 'fit-width'
  | 'calibrate' | 'measure' | 'count' | 'linear' | 'box-count'
  | 'highlight' | 'note' | 'callout';

type MarkerState =
  | 'default' | 'hover' | 'selected' | 'locked' | 'excluded'
  | 'ai-suggested' | 'ai-approved' | 'ai-rejected'
  | 'missing-assembly' | 'missing-price';

type Confidence = 'high' | 'medium' | 'low' | 'needs-review';

type WorkspaceDemo =
  | 'default' | 'count-active' | 'linear-active'
  | 'selected-count' | 'selected-linear' | 'collapsed-panels'
  | 'missing-scale' | 'offline' | 'save-failure' | 'loading' | 'corrupted';

interface CountMarker {
  id: string;
  x: number;
  y: number;
  assembly: string;
  assemblyId: string;
  discipline: string;
  color: string;
  markerState: MarkerState;
  number: number;
  designator?: string;
}

interface LinearPath {
  id: string;
  points: { x: number; y: number }[];
  assembly: string;
  color: string;
  totalLength: number;
  selected: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

interface Page {
  id: string; num: string; title: string; scale: string | null; discipline: string;
  excluded?: boolean; parentId?: string; isSubPage?: boolean;
}

const INITIAL_PAGES: Page[] = [
  { id: 'e101', num: 'E-101', title: 'Electrical Plan Level 1', scale: '1:100', discipline: 'electrical' },
  { id: 'e102', num: 'E-102', title: 'Electrical Plan Level 2', scale: '1:100', discipline: 'electrical' },
  { id: 'e201', num: 'E-201', title: 'Lighting Plan Level 1', scale: null,    discipline: 'lighting' },
  { id: 'e202', num: 'E-202', title: 'Lighting Plan Level 2', scale: '1:100', discipline: 'lighting' },
  { id: 'e301', num: 'E-301', title: 'Power Plan',            scale: '1:100', discipline: 'power' },
  { id: 'e401', num: 'E-401', title: 'Panel Schedule PA',     scale: 'NTS',  discipline: 'electrical' },
  { id: 'e501', num: 'E-501', title: 'Single Line Diagram',   scale: 'NTS',  discipline: 'electrical' },
];

const ARCH_SCALES = ['1:10','1:20','1:25','1:50','1:100','1:200','1:500','1/4"=1\'-0"','1/8"=1\'-0"','3/4"=1\'-0"','1"=1\'-0"','1 1/2"=1\'-0"','3"=1\'-0"'];
const ENG_SCALES  = ['1"=10\'','1"=20\'','1"=30\'','1"=40\'','1"=50\'','1"=60\'','1"=100\'','1"=200\'','1"=400\'','1"=500\'','1"=1000\''];

const DISC_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  electrical: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  lighting:   { bg: '#F5F3FF', border: '#C4B5FD', text: '#5B21B6' },
  power:      { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  'fire-alarm': { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' },
};

const CONF_CFG: Record<Confidence, { label: string; color: string; bg: string }> = {
  high:           { label: 'High',         color: '#16A34A', bg: '#F0FDF4' },
  medium:         { label: 'Medium',       color: '#D97706', bg: '#FFFBEB' },
  low:            { label: 'Low',          color: '#DC2626', bg: '#FEF2F2' },
  'needs-review': { label: 'Needs review', color: '#7C3AED', bg: '#F5F3FF' },
};

const SHORTCUTS = [
  {
    group: 'Tools',
    items: [
      { keys: ['V'], label: 'Select' },
      { keys: ['H'], label: 'Hand / pan' },
      { keys: ['C'], label: 'Count' },
      { keys: ['L'], label: 'Linear takeoff' },
      { keys: ['M'], label: 'Measure' },
      { keys: ['R'], label: 'Calibrate scale' },
    ],
  },
  {
    group: 'Canvas',
    items: [
      { keys: ['⌘+'], label: 'Zoom in' },
      { keys: ['⌘−'], label: 'Zoom out' },
      { keys: ['⌘0'], label: 'Fit page' },
      { keys: ['Space'], label: 'Temporary pan' },
      { keys: ['⌘Z'], label: 'Undo' },
      { keys: ['⌘⇧Z'], label: 'Redo' },
    ],
  },
  {
    group: 'Selection',
    items: [
      { keys: ['Esc'], label: 'Deselect / cancel' },
      { keys: ['Del'], label: 'Delete selected' },
      { keys: ['⌘D'], label: 'Duplicate' },
      { keys: ['⌘A'], label: 'Select all' },
      { keys: ['⇧+click'], label: 'Add to selection' },
    ],
  },
  {
    group: 'Takeoff',
    items: [
      { keys: ['Enter'], label: 'Complete linear path' },
      { keys: ['⇧'], label: 'Constrain direction' },
      { keys: ['⌘C'], label: 'Copy' },
      { keys: ['⌘V'], label: 'Paste' },
      { keys: ['?'], label: 'Show shortcuts' },
    ],
  },
];

const AI_ITEMS = [
  {
    id: 'ai1',
    title: '4 additional troffers detected',
    desc: 'AI found 4 more 2×4 LED Troffers in row 2 not yet counted.',
    confidence: 'medium' as Confidence,
    actions: ['Approve all', 'Review', 'Reject'],
  },
  {
    id: 'ai2',
    title: 'Scale 1:100 detected',
    desc: 'Title block on E-101 indicates 1:100. Auto-applied to this page.',
    confidence: 'high' as Confidence,
    actions: ['Use scale', 'Verify manually'],
  },
  {
    id: 'ai3',
    title: 'Missing exit light (rear)',
    desc: 'Rear exit door visible but no emergency exit light placed nearby.',
    confidence: 'low' as Confidence,
    actions: ['Mark placed', 'Dismiss'],
  },
  {
    id: 'ai4',
    title: 'Panel schedule mismatch',
    desc: 'Schedule references 24 circuits; 3 have no associated takeoff items.',
    confidence: 'needs-review' as Confidence,
    actions: ['Review', 'Dismiss'],
  },
];

// ─── Initial data ───────────────────────────────────────────────────────────────

function buildInitialMarkers(): CountMarker[] {
  const out: CountMarker[] = [];
  // Row 1 — confirmed (y=165, 12 fixtures)
  for (let i = 0; i < 12; i++) {
    out.push({
      id: `m${i + 1}`,
      x: 140 + i * 83,
      y: 165,
      assembly: '2×4 LED Troffer 40W',
      assemblyId: 'asm-led-troffer',
      discipline: 'lighting',
      color: '#7C3AED',
      markerState: 'default',
      number: i + 1,
    });
  }
  // Row 2 — confirmed first 8
  for (let i = 0; i < 8; i++) {
    out.push({
      id: `m${13 + i}`,
      x: 140 + i * 83,
      y: 300,
      assembly: '2×4 LED Troffer 40W',
      assemblyId: 'asm-led-troffer',
      discipline: 'lighting',
      color: '#7C3AED',
      markerState: 'default',
      number: 13 + i,
    });
  }
  // Row 2 — AI-suggested last 4
  for (let i = 0; i < 4; i++) {
    out.push({
      id: `m${21 + i}`,
      x: 140 + (8 + i) * 83,
      y: 300,
      assembly: '2×4 LED Troffer 40W',
      assemblyId: 'asm-led-troffer',
      discipline: 'lighting',
      color: '#7C3AED',
      markerState: 'ai-suggested',
      number: 21 + i,
    });
  }
  // Emergency exits
  out.push({ id: 'exit-1', x: 140, y: 440, assembly: 'Emergency Exit Combo', assemblyId: 'asm-exit', discipline: 'lighting', color: '#DC2626', markerState: 'default', number: 1 });
  out.push({ id: 'exit-2', x: 1050, y: 440, assembly: 'Emergency Exit Combo', assemblyId: 'asm-exit', discipline: 'lighting', color: '#DC2626', markerState: 'default', number: 2 });
  // Missing-assembly marker
  out.push({ id: 'missing-1', x: 300, y: 500, assembly: '', assemblyId: '', discipline: 'power', color: '#9CA3AF', markerState: 'missing-assembly', number: 1 });
  return out;
}

const INITIAL_PATHS: LinearPath[] = [
  {
    id: 'lp1',
    points: [{ x: 160, y: 550 }, { x: 1050, y: 550 }],
    assembly: '3/4" EMT Conduit',
    color: '#D97706',
    totalLength: 27.3,
    selected: false,
  },
];

// ─── Floor plan SVG ─────────────────────────────────────────────────────────────

function FloorPlan() {
  return (
    <g>
      {/* Page background */}
      <rect x={0} y={0} width={1200} height={780} fill="#E8E9EC" />
      {/* Store boundary */}
      <rect x={60} y={60} width={1080} height={660} fill="white" stroke="#374151" strokeWidth={2.5} />
      {/* Back room */}
      <rect x={60} y={580} width={1080} height={140} fill="#F9FAFB" />
      <line x1={60} y1={580} x2={1140} y2={580} stroke="#374151" strokeWidth={1.5} strokeDasharray="6 3" />
      <text x={90} y={616} fontSize={9} fill="#9CA3AF" fontFamily="sans-serif" letterSpacing={1}>BACK ROOM / SERVICE AREA</text>
      {/* Ceiling grid (sales floor) */}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`vg${i}`} x1={60 + (i + 1) * 90} y1={60} x2={60 + (i + 1) * 90} y2={580} stroke="#EBEBED" strokeWidth={0.6} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`hg${i}`} x1={60} y1={60 + (i + 1) * 87} x2={1140} y2={60 + (i + 1) * 87} stroke="#EBEBED" strokeWidth={0.6} />
      ))}
      {/* Shelving unit row 1 */}
      <rect x={180} y={200} width={760} height={20} rx={1} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.8} />
      {[280, 380, 480, 580, 680, 780, 880].map(x => (
        <line key={`d1${x}`} x1={x} y1={200} x2={x} y2={220} stroke="#D1D5DB" strokeWidth={0.5} />
      ))}
      {/* Shelving unit row 2 */}
      <rect x={180} y={345} width={760} height={20} rx={1} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.8} />
      {[280, 380, 480, 580, 680, 780, 880].map(x => (
        <line key={`d2${x}`} x1={x} y1={345} x2={x} y2={365} stroke="#D1D5DB" strokeWidth={0.5} />
      ))}
      {/* Checkout area */}
      <rect x={780} y={475} width={300} height={60} rx={2} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.8} />
      <text x={930} y={508} fontSize={8} fill="#9CA3AF" textAnchor="middle" fontFamily="sans-serif">CHECKOUT</text>
      {/* Electrical panel PA */}
      <rect x={76} y={598} width={30} height={38} fill="white" stroke="#2563EB" strokeWidth={1.5} rx={2} />
      <text x={91} y={611} fontSize={6.5} fill="#2563EB" fontFamily="monospace" textAnchor="middle">PANEL</text>
      <text x={91} y={623} fontSize={8} fill="#2563EB" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PA</text>
      <text x={91} y={633} fontSize={6} fill="#2563EB" fontFamily="monospace" textAnchor="middle">200A</text>
      {/* Exit indicators */}
      <rect x={60} y={438} width={4} height={40} fill="#FCA5A5" />
      <text x={72} y={454} fontSize={7.5} fill="#DC2626" fontFamily="sans-serif" fontWeight={600}>EXIT</text>
      <rect x={1136} y={438} width={4} height={40} fill="#FCA5A5" />
      <text x={1098} y={454} fontSize={7.5} fill="#DC2626" fontFamily="sans-serif" fontWeight={600}>EXIT</text>
      {/* Dimension line at bottom */}
      <line x1={60} y1={745} x2={1140} y2={745} stroke="#9CA3AF" strokeWidth={0.8} />
      <line x1={60} y1={740} x2={60} y2={750} stroke="#9CA3AF" strokeWidth={0.8} />
      <line x1={1140} y1={740} x2={1140} y2={750} stroke="#9CA3AF" strokeWidth={0.8} />
      <text x={600} y={757} fontSize={8.5} fill="#9CA3AF" fontFamily="monospace" textAnchor="middle">60 000</text>
      {/* Title block */}
      <rect x={870} y={690} width={270} height={85} fill="white" stroke="#D1D5DB" strokeWidth={0.8} />
      <line x1={870} y1={710} x2={1140} y2={710} stroke="#D1D5DB" strokeWidth={0.5} />
      <text x={880} y={704} fontSize={8.5} fill="#374151" fontFamily="monospace" fontWeight={600}>ELECTRICAL PLAN — LEVEL 1</text>
      <text x={880} y={725} fontSize={7.5} fill="#6B7280" fontFamily="monospace">Dollar Tree Retail · Store 1842</text>
      <text x={880} y={738} fontSize={7.5} fill="#6B7280" fontFamily="monospace">Sheet E-101   Scale 1:100</text>
      <text x={880} y={751} fontSize={7.5} fill="#6B7280" fontFamily="monospace">Revision A   April 2026</text>
      <text x={880} y={764} fontSize={6.5} fill="#9CA3AF" fontFamily="monospace">Brightpoint Electrical Estimating</text>
    </g>
  );
}

// ─── Count marker SVG element ───────────────────────────────────────────────────

function CountMarkerEl({
  marker, isSelected, isHovered,
  onMouseEnter, onMouseLeave, onClick, onContextMenu,
}: {
  marker: CountMarker;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const R = 11;

  const stroke = isSelected ? '#2563EB'
    : marker.markerState === 'ai-suggested' ? '#A855F7'
    : marker.markerState === 'ai-approved' ? '#16A34A'
    : marker.markerState === 'ai-rejected' ? '#DC2626'
    : marker.markerState === 'missing-assembly' ? '#9CA3AF'
    : marker.markerState === 'excluded' ? '#6B7280'
    : marker.markerState === 'locked' ? '#374151'
    : marker.color;

  const fill = isSelected ? '#EFF6FF'
    : isHovered ? 'rgba(37,99,235,0.06)'
    : marker.markerState === 'ai-suggested' ? 'rgba(168,85,247,0.12)'
    : marker.markerState === 'missing-assembly' ? 'rgba(156,163,175,0.15)'
    : marker.markerState === 'excluded' ? 'rgba(107,114,128,0.1)'
    : marker.markerState === 'ai-rejected' ? 'rgba(220,38,38,0.08)'
    : 'white';

  const dash = (marker.markerState === 'ai-suggested' || marker.markerState === 'missing-assembly') ? '3 2' : undefined;
  const opacity = marker.markerState === 'excluded' ? 0.5 : 1;
  const label = marker.markerState === 'missing-assembly' ? '?' : String(marker.number);
  const labelColor = isSelected ? '#2563EB' : stroke;

  return (
    <g style={{ cursor: 'pointer' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} onContextMenu={onContextMenu} opacity={opacity}>
      {/* Selection glow */}
      {isSelected && <circle cx={marker.x} cy={marker.y} r={R + 5} fill="rgba(37,99,235,0.1)" stroke="#BFDBFE" strokeWidth={1} />}
      {/* Hover glow */}
      {isHovered && !isSelected && <circle cx={marker.x} cy={marker.y} r={R + 4} fill="rgba(37,99,235,0.06)" />}
      {/* Main circle */}
      <circle cx={marker.x} cy={marker.y} r={R} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2.5 : 1.5} strokeDasharray={dash} />
      {/* Number */}
      <text x={marker.x} y={marker.y} fontSize={7.5} fontFamily="'IBM Plex Mono', monospace" fontWeight="600" fill={labelColor} textAnchor="middle" dominantBaseline="central">{label}</text>
      {/* Designator badge (A, B, C etc.) */}
      {marker.designator && (
        <g>
          <rect x={marker.x + R - 1} y={marker.y - R - 8} width={12} height={10} rx={2} fill={stroke} />
          <text x={marker.x + R + 5} y={marker.y - R - 1} fontSize={6.5} fontWeight="700" fill="white" textAnchor="middle" dominantBaseline="central">{marker.designator}</text>
        </g>
      )}
      {/* AI badge */}
      {marker.markerState === 'ai-suggested' && <circle cx={marker.x + R - 2} cy={marker.y - R + 2} r={4.5} fill="#A855F7" />}
      {/* Hover tooltip */}
      {isHovered && marker.assembly && (
        <g>
          <rect x={marker.x - 70} y={marker.y - R - 34} width={140} height={28} rx={3} fill="#111827" opacity={0.92} />
          <text x={marker.x} y={marker.y - R - 24} fontSize={8.5} fill="white" textAnchor="middle" fontFamily="sans-serif" fontWeight="600">
            {marker.assembly.length > 22 ? marker.assembly.slice(0, 21) + '…' : marker.assembly}
          </text>
          <text x={marker.x} y={marker.y - R - 12} fontSize={7.5} fill="#9CA3AF" textAnchor="middle" fontFamily="sans-serif">
            {marker.discipline} · BOM available · 0.8 hrs
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Linear path SVG element ────────────────────────────────────────────────────

function LinearPathEl({ path, isSelected, onClick }: { path: LinearPath; isSelected: boolean; onClick: (e: React.MouseEvent) => void }) {
  if (path.points.length < 2) return null;
  const pts = path.points.map(p => `${p.x},${p.y}`).join(' ');
  const color = isSelected ? '#2563EB' : path.color;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Wide invisible hit area */}
      <polyline points={pts} fill="none" stroke="transparent" strokeWidth={20} />
      {/* Glow when selected */}
      {isSelected && <polyline points={pts} fill="none" stroke="#2563EB" strokeWidth={8} strokeOpacity={0.15} />}
      {/* Main dashed line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={isSelected ? 2.5 : 2} strokeDasharray="7 3" />
      {/* Segment length labels */}
      {path.points.slice(0, -1).map((pt, i) => {
        const nx = path.points[i + 1];
        const mx = (pt.x + nx.x) / 2;
        const my = (pt.y + nx.y) / 2;
        const dx = nx.x - pt.x;
        const dy = nx.y - pt.y;
        const pixels = Math.sqrt(dx * dx + dy * dy);
        const metres = ((pixels * 54) / 1080).toFixed(1);
        return (
          <g key={i}>
            <rect x={mx - 20} y={my - 10} width={40} height={17} rx={3} fill="white" stroke={color} strokeWidth={0.8} />
            <text x={mx} y={my + 1} fontSize={8.5} fontFamily="'IBM Plex Mono', monospace" fill={color} textAnchor="middle" dominantBaseline="central">{metres}m</text>
          </g>
        );
      })}
      {/* Endpoint nodes */}
      {path.points.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={4.5} fill="white" stroke={color} strokeWidth={1.5} />
      ))}
    </g>
  );
}

// ─── In-progress linear path ────────────────────────────────────────────────────

function LinearInProgressEl({ points, mousePos }: { points: { x: number; y: number }[]; mousePos: { x: number; y: number } | null }) {
  if (points.length === 0) return null;
  const allPts = mousePos ? [...points, mousePos] : points;
  const pts = allPts.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <g>
      <polyline points={pts} fill="none" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3" />
      {points.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={5} fill="white" stroke="#2563EB" strokeWidth={2} />
      ))}
      {mousePos && <circle cx={mousePos.x} cy={mousePos.y} r={5} fill="rgba(37,99,235,0.15)" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="2 1" />}
    </g>
  );
}

// ─── Workspace top bar ──────────────────────────────────────────────────────────

function WorkspaceTopBar({
  autosaveState, demoState, onUndo, onRedo, onHelp, onExit,
}: {
  autosaveState: 'saved' | 'saving' | 'failed';
  demoState: WorkspaceDemo;
  onUndo: () => void;
  onRedo: () => void;
  onHelp: () => void;
  onExit: () => void;
}) {
  const isOffline = demoState === 'offline';
  return (
    <div style={{ height: 54, backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 0, padding: '0 12px', flexShrink: 0, zIndex: 10 }}>
      {/* Logo */}
      <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={15} color="white" fill="white" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Brightpoint</span>
      </button>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4, fontSize: 12, color: '#6B7280', flexShrink: 0 }}>
        <span style={{ color: '#9CA3AF' }}>/</span>
        <span>Dollar Tree Store 1842</span>
        <span style={{ color: '#9CA3AF' }}>/</span>
        <span>Electrical Estimate</span>
        <span style={{ color: '#9CA3AF' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 500 }}>Sheet E-101</span>
      </div>

      {/* Estimate status */}
      <div style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 4, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', fontWeight: 500, flexShrink: 0 }}>
        In progress
      </div>

      <div style={{ flex: 1 }} />

      {/* Autosave */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: autosaveState === 'failed' || isOffline ? '#DC2626' : autosaveState === 'saving' ? '#6B7280' : '#16A34A', marginRight: 10, flexShrink: 0 }}>
        {isOffline ? <CloudOff size={13} /> : autosaveState === 'failed' ? <CloudOff size={13} /> : autosaveState === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Cloud size={13} />}
        <span>{isOffline ? 'Offline' : autosaveState === 'failed' ? 'Save failed' : autosaveState === 'saving' ? 'Saving…' : 'Saved'}</span>
      </div>

      <div style={{ width: 1, height: 20, backgroundColor: '#E5E7EB', margin: '0 8px', flexShrink: 0 }} />

      {/* Undo / Redo */}
      <button onClick={onUndo} title="Undo (⌘Z)" style={iconBtn}><Undo2 size={15} /></button>
      <button onClick={onRedo} title="Redo (⌘⇧Z)" style={iconBtn}><Redo2 size={15} /></button>

      <div style={{ width: 1, height: 20, backgroundColor: '#E5E7EB', margin: '0 8px', flexShrink: 0 }} />

      {/* Share / Help / Avatar */}
      <button style={{ ...iconBtn, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', fontSize: 12, color: '#374151' }}>
        <Share2 size={13} />
        Share
      </button>
      <button onClick={onHelp} title="Keyboard shortcuts (?)" style={iconBtn}><HelpCircle size={15} /></button>
      <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#2563EB', marginLeft: 6, flexShrink: 0 }}>JM</div>
    </div>
  );
}

const iconBtn = {
  width: 30, height: 30, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  background: 'none', border: 'none', cursor: 'pointer' as const, borderRadius: 5, color: '#6B7280',
  flexShrink: 0,
};

// ─── Takeoff toolbar ────────────────────────────────────────────────────────────

const TOOL_GROUPS: { tools: { id: Tool; icon: React.ElementType; label: string; shortcut?: string; showLabel?: boolean }[] }[] = [
  { tools: [{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' }, { id: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' }] },
  { tools: [{ id: 'zoom-in', icon: ZoomIn, label: 'Zoom in', shortcut: '⌘+' }, { id: 'zoom-out', icon: ZoomOut, label: 'Zoom out', shortcut: '⌘−' }, { id: 'fit', icon: Maximize2, label: 'Fit page', shortcut: '⌘0' }, { id: 'fit-width', icon: ArrowLeftRight, label: 'Fit width' }] },
  { tools: [{ id: 'calibrate', icon: Ruler, label: 'Calibrate', shortcut: 'R', showLabel: true }, { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M', showLabel: true }] },
  { tools: [{ id: 'count', icon: Hash, label: 'Count', shortcut: 'C', showLabel: true }, { id: 'linear', icon: Pen, label: 'Linear', shortcut: 'L', showLabel: true }] },
  { tools: [{ id: 'highlight', icon: Highlighter, label: 'Highlight' }, { id: 'note', icon: Type, label: 'Note' }, { id: 'callout', icon: MessageSquare, label: 'Callout' }] },
  { tools: [{ id: 'count', icon: Palette, label: 'Color' } as any, { id: 'count', icon: SlidersHorizontal, label: 'Line weight' } as any] },
];

function TakeoffToolbar({ activeTool, onToolChange, snapEnabled, onSnapToggle, onAICount, showSymbols, onToggleSymbols, dimBackground, onToggleDim }: {
  activeTool: Tool;
  onToolChange: (t: Tool) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  onAICount: () => void;
  showSymbols: boolean;
  onToggleSymbols: () => void;
  dimBackground: boolean;
  onToggleDim: () => void;
}) {
  return (
    <div style={{ height: 46, backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 0, flexShrink: 0, overflowX: 'auto' }}>
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {gi > 0 && <div style={{ width: 1, height: 22, backgroundColor: '#E5E7EB', margin: '0 6px', flexShrink: 0 }} />}
          {group.tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = tool.id === activeTool && tool.showLabel !== undefined;
            const realActive = tool.id === activeTool && !['highlight', 'note', 'callout'].includes(tool.id) && gi < 5;
            return (
              <button
                key={`${gi}-${tool.label}`}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                onClick={() => { if (tool.id !== 'count' || gi < 5) onToolChange(tool.id as Tool); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  height: 30, padding: tool.showLabel ? '0 8px' : '0 7px',
                  border: realActive ? '1px solid #BFDBFE' : '1px solid transparent',
                  borderRadius: 5,
                  backgroundColor: realActive ? '#EFF6FF' : 'transparent',
                  cursor: 'pointer',
                  color: realActive ? '#2563EB' : '#6B7280',
                  fontSize: 11, fontWeight: 500,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <Icon size={14} />
                {tool.showLabel && <span>{tool.label}</span>}
              </button>
            );
          })}
        </div>
      ))}

      {/* Snap / Count Vis / AI Count */}
      <div style={{ width: 1, height: 22, backgroundColor: '#E5E7EB', margin: '0 6px', flexShrink: 0 }} />
      <button
        title={snapEnabled ? 'Snap ON' : 'Snap OFF'}
        onClick={onSnapToggle}
        style={{ ...toolBtn, backgroundColor: snapEnabled ? '#F0FDF4' : 'transparent', border: snapEnabled ? '1px solid #BBF7D0' : '1px solid transparent', color: snapEnabled ? '#16A34A' : '#6B7280', gap: 4 }}
      >
        <Magnet size={14} />
        <span style={{ fontSize: 11 }}>Snap</span>
      </button>
      <button
        title="Box to count — draw a box to count symbols inside"
        onClick={() => onToolChange('box-count')}
        style={{ ...toolBtn, gap: 4, backgroundColor: activeTool === 'box-count' ? '#EFF6FF' : 'transparent', border: activeTool === 'box-count' ? '1px solid #BFDBFE' : '1px solid transparent', color: activeTool === 'box-count' ? '#2563EB' : '#6B7280' }}>
        <Square size={13} />
        <span style={{ fontSize: 11 }}>Box count</span>
      </button>
      <button
        title={showSymbols ? 'Hide counted symbols' : 'Show counted symbols'}
        onClick={onToggleSymbols}
        style={{ ...toolBtn, gap: 4, color: showSymbols ? '#374151' : '#9CA3AF' }}>
        {showSymbols ? <Eye size={14} /> : <EyeOff size={14} />}
        <span style={{ fontSize: 11 }}>Symbols</span>
      </button>
      <button
        title={dimBackground ? 'Undim background' : 'Dim background'}
        onClick={onToggleDim}
        style={{ ...toolBtn, gap: 4, color: dimBackground ? '#7C3AED' : '#6B7280', backgroundColor: dimBackground ? '#F5F3FF' : 'transparent', border: dimBackground ? '1px solid #DDD6FE' : '1px solid transparent' }}>
        <Filter size={13} />
        <span style={{ fontSize: 11 }}>Isolate</span>
      </button>
      <button
        title="AI Count"
        onClick={onAICount}
        style={{ ...toolBtn, gap: 4, color: '#7C3AED', backgroundColor: '#F5F3FF', border: '1px solid #C4B5FD' }}
      >
        <Sparkles size={13} />
        <span style={{ fontSize: 11 }}>AI Count</span>
      </button>
      <div style={{ width: 1, height: 22, backgroundColor: '#E5E7EB', margin: '0 6px', flexShrink: 0 }} />
      <button style={{ ...toolBtn }}><MoreHorizontal size={14} /></button>
    </div>
  );
}

const toolBtn = {
  display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  height: 30, padding: '0 8px', border: '1px solid transparent',
  borderRadius: 5, backgroundColor: 'transparent', cursor: 'pointer' as const,
  color: '#6B7280', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' as const, flexShrink: 0,
};

// ─── Left panel ─────────────────────────────────────────────────────────────────

// ─── Assemblies + Parts tab data ──────────────────────────────────────────────────────

const SIDEBAR_ASSEMBLIES = [
  { id: 'sa-1', name: 'LED Troffer 2×4',             code: 'BPA-FX-201', cat: 'Fixtures',   source: 'System',  tool: 'Count',  status: 'recommended', fav: true,  locked: true  },
  { id: 'sa-2', name: 'LED Troffer 2×2',             code: 'BPA-FX-202', cat: 'Fixtures',   source: 'System',  tool: 'Count',  status: 'compatible',  fav: false, locked: true  },
  { id: 'sa-3', name: 'LED Emergency Troffer',       code: 'BPA-FX-203', cat: 'Fixtures',   source: 'Company', tool: 'Count',  status: 'recommended', fav: true,  locked: false },
  { id: 'sa-4', name: 'Duplex Receptacle – 20A',     code: 'BPA-DV-101', cat: 'Devices',    source: 'System',  tool: 'Count',  status: 'compatible',  fav: false, locked: true  },
  { id: 'sa-5', name: 'Hospital-Grade Recept. 20A',  code: 'BPA-DV-103', cat: 'Devices',    source: 'Customer',tool: 'Count',  status: 'compatible',  fav: false, locked: false },
  { id: 'sa-6', name: 'EMT ¾" Conduit Run',          code: 'BPA-RC-301', cat: 'Raceway',    source: 'System',  tool: 'Linear', status: 'compatible',  fav: false, locked: true  },
  { id: 'sa-7', name: '100A Panel Feeder',           code: 'BPA-FD-401', cat: 'Feeders',    source: 'System',  tool: 'Linear', status: 'recommended', fav: false, locked: true  },
];

const SIDEBAR_BOM_PREVIEW = [
  { group: 'Fixture',   name: 'LED Troffer 2×4 40W 5000K',  code: 'LT-240-40W',  qty: 1,   unit: 'EA', calc: '' },
  { group: 'Mounting',  name: 'T-Bar Mounting Clip Set',     code: 'MTC-TBAR-01', qty: 2,   unit: 'EA', calc: '' },
  { group: 'Mounting',  name: 'Safety Cable 1/8"',           code: 'SC-125-6LF',  qty: 1,   unit: 'EA', calc: 'Optional' },
  { group: 'Wiring',    name: 'MC-PCS 12/3',                 code: 'MC-PCS-123',  qty: 8.4, unit: 'LF', calc: '8 LF + 5% waste = 8.4 LF' },
  { group: 'Wiring',    name: 'MC Connector ½"',             code: 'MCC-50',      qty: 2,   unit: 'EA', calc: '' },
  { group: 'Wiring',    name: 'Wire Connector (Marr)',        code: 'WC-MARR-L',   qty: 3,   unit: 'EA', calc: '' },
  { group: 'Grounding', name: 'Equipment Ground #12 Green',  code: 'EGC-12-GRN',  qty: 1,   unit: 'EA', calc: '' },
];

const SIDEBAR_PARTS = [
  { id: 'si-1', code: 'LT-240-40W',   desc: 'LED Troffer 2×4 40W 5000K',     mfr: 'Lithonia',    cat: 'Fixtures',   unit: 'EA', price: 48.50 },
  { id: 'si-2', code: 'MTC-TBAR-01',  desc: 'T-Bar Mounting Clip Set',        mfr: 'Caddy',       cat: 'Mounting',   unit: 'EA', price: 3.20  },
  { id: 'si-3', code: 'MC-PCS-123',   desc: 'MC-PCS Cable 12/3',              mfr: 'Southwire',   cat: 'Wire',       unit: 'LF', price: 1.85  },
  { id: 'si-4', code: 'EMT-075-10',   desc: '¾" EMT Conduit 10ft stick',      mfr: 'Allied',      cat: 'Conduit',    unit: 'EA', price: 9.40  },
  { id: 'si-5', code: 'MCC-50',       desc: 'MC Cable Connector ½"',          mfr: 'Thomas & B',  cat: 'Fittings',   unit: 'EA', price: 1.10  },
  { id: 'si-6', code: 'EGC-12-GRN',   desc: 'Equip. Ground #12 Green',        mfr: 'Southwire',   cat: 'Wire',       unit: 'EA', price: 0.45  },
  { id: 'si-7', code: 'WC-MARR-L',    desc: 'Wire Connector Large (Marr)',     mfr: 'Ideal',       cat: 'Connectors', unit: 'EA', price: 0.18  },
  { id: 'si-8', code: 'DR-20A-SP',    desc: 'Duplex Receptacle 20A Spec.',     mfr: 'Hubbell',     cat: 'Devices',    unit: 'EA', price: 8.75  },
];

function PartsTabContent() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const cats = ['All', ...Array.from(new Set(SIDEBAR_PARTS.map(i => i.cat)))];
  const filtered = SIDEBAR_PARTS.filter(item => {
    if (catFilter !== 'All' && item.cat !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return item.desc.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.mfr.toLowerCase().includes(q);
  });
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, backgroundColor: '#F9FAFB' }}>
          <Search size={11} color="#9CA3AF" />
          <input placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'none', fontSize: 11, color: '#374151', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '2px 8px', borderRadius: 10, border: catFilter === c ? '1px solid #BFDBFE' : '1px solid #E5E7EB', backgroundColor: catFilter === c ? '#EFF6FF' : 'white', color: catFilter === c ? '#2563EB' : '#6B7280', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
              <div style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', color: '#9CA3AF', marginTop: 1 }}>{item.code} · {item.mfr}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', fontWeight: 600 }}>${item.price.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: '#9CA3AF' }}>{item.unit}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 11 }}>No parts match "{search}"</div>
        )}
      </div>
    </div>
  );
}

function AssembliesTabContent({ onNavigateToLibrary }: { onNavigateToLibrary?: () => void }) {
  const [activeAsm, setActiveAsm]       = useState(SIDEBAR_ASSEMBLIES[0]);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('All');
  const [menuId, setMenuId]             = useState<string | null>(null);
  const [showBOM, setShowBOM]           = useState(false);
  const [bomAsm, setBomAsm]             = useState(SIDEBAR_ASSEMBLIES[0]);
  const [showReplace, setShowReplace]   = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(SIDEBAR_ASSEMBLIES[0]);
  const [showLinearConfirm, setShowLinearConfirm] = useState(false);
  const [pendingAsm, setPendingAsm]     = useState<typeof SIDEBAR_ASSEMBLIES[0] | null>(null);

  const FILTERS = ['All', 'Recent', 'Favorites', 'Recommended', 'Count', 'Linear', 'Job Library', 'Company', 'Missing Price'];

  const filtered = SIDEBAR_ASSEMBLIES.filter(a => {
    if (filter === 'Favorites')    return a.fav;
    if (filter === 'Recommended')  return a.status === 'recommended';
    if (filter === 'Count')        return a.tool === 'Count';
    if (filter === 'Linear')       return a.tool === 'Linear';
    if (filter === 'Company')      return a.source === 'Company';
    if (filter === 'Job Library')  return a.source === 'Job';
    const q = search.toLowerCase();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q);
  }).filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q);
  });

  function activateAssembly(asm: typeof SIDEBAR_ASSEMBLIES[0]) {
    // If switching from Count→Linear or vice-versa, confirm first
    if (activeAsm.tool !== asm.tool) {
      setPendingAsm(asm);
      setShowLinearConfirm(true);
      return;
    }
    doActivate(asm);
  }

  function doActivate(asm: typeof SIDEBAR_ASSEMBLIES[0]) {
    setActiveAsm(asm);
    toast.success(`${asm.name} activated`, { description: `${asm.tool} tool active · Drawing context preserved.` });
  }

  const statusColor = (s: string) => s === 'recommended' ? '#16A34A' : '#1D4ED8';
  const statusBg    = (s: string) => s === 'recommended' ? '#F0FDF4' : '#EFF6FF';
  const statusLabel = (s: string) => s === 'recommended' ? '★ Recommended' : '✓ Compatible';

  const SECTIONS = [
    { label: 'Recently Used',       items: SIDEBAR_ASSEMBLIES.slice(0, 2) },
    { label: 'Favorites',           items: SIDEBAR_ASSEMBLIES.filter(a => a.fav) },
    { label: 'Compatible Assemblies', items: filtered },
  ];

  const showSearch = search.trim().length > 0 || filter !== 'All';

  // ── BOM Preview overlay ───────────────────────────────────────────────────
  const BOMPreview = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', pointerEvents: 'none' }}>
      <div style={{ width: 320, maxHeight: '70vh', background: 'white', borderRadius: '10px 10px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', pointerEvents: 'all', marginLeft: 280 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{bomAsm.name}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{bomAsm.code} · v1.2</div>
          </div>
          <button onClick={() => setShowBOM(false)} style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={11} color="#6B7280" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {Object.entries(SIDEBAR_BOM_PREVIEW.reduce((acc, r) => { (acc[r.group] = acc[r.group] || []).push(r); return acc; }, {} as Record<string, typeof SIDEBAR_BOM_PREVIEW>)).map(([grp, rows]) => (
            <div key={grp}>
              <div style={{ padding: '5px 12px 2px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{grp}</div>
              {rows.map(r => (
                <div key={r.code} style={{ padding: '4px 12px', display: 'flex', gap: 6, alignItems: 'flex-start', borderBottom: '1px solid #F9FAFB' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    {r.calc && <div style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic', marginTop: 1 }}>{r.calc}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#111827', fontWeight: 600, flexShrink: 0 }}>{r.qty} {r.unit}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 6 }}>
          <button onClick={() => { setShowBOM(false); onNavigateToLibrary?.(); }} style={{ flex: 1, height: 28, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}>Open Full Assembly</button>
          <button onClick={() => { setShowBOM(false); setReplaceTarget(bomAsm); setShowReplace(true); }} style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 6, background: '#2563EB', fontSize: 11, color: 'white', cursor: 'pointer' }}>Replace</button>
        </div>
      </div>
    </div>
  );

  // ── Replace Assembly dialog ───────────────────────────────────────────────
  const ReplaceDialog = () => {
    const [scope, setScope] = useState('selected');
    const [confirming, setConfirming] = useState(false);
    const replacement = SIDEBAR_ASSEMBLIES.find(a => a.id !== replaceTarget.id && a.tool === replaceTarget.tool) || SIDEBAR_ASSEMBLIES[1];

    function apply() {
      setConfirming(true);
      setTimeout(() => {
        toast.success('Assembly replaced', { description: `${replaceTarget.name} → ${replacement.name}` });
        setShowReplace(false);
        setConfirming(false);
      }, 1200);
    }

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
        <div style={{ width: 400, background: 'white', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>Replace Assembly</span>
            <button onClick={() => setShowReplace(false)} style={{ width: 24, height: 24, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} color="#6B7280" /></button>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ padding: '8px 10px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FCA5A5' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replaceTarget.name}</div>
                <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 }}>{replaceTarget.code}</div>
              </div>
              <span style={{ fontSize: 16, color: '#9CA3AF' }}>→</span>
              <div style={{ padding: '8px 10px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #86EFAC' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replacement.name}</div>
                <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 }}>{replacement.code}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: '8px 10px', background: '#F9FAFB', borderRadius: 6, fontSize: 11, color: '#6B7280' }}>
              <div style={{ flex: 1 }}>Material diff: <strong style={{ color: '#16A34A' }}>−$4.20</strong></div>
              <div style={{ flex: 1 }}>Labor diff: <strong style={{ color: '#6B7280' }}>+0.1 hrs</strong></div>
              <div>Affected: <strong style={{ color: '#374151' }}>1</strong></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Apply to:</div>
              {[
                { val: 'selected',  label: 'Selected object only' },
                { val: 'page',      label: 'All matching objects on this page' },
                { val: 'estimate',  label: 'All matching objects in the estimate' },
              ].map(opt => (
                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, cursor: 'pointer' }}>
                  <input type="radio" name="replace-scope" value={opt.val} checked={scope === opt.val} onChange={() => setScope(opt.val)} style={{ accentColor: '#2563EB' }} />
                  <span style={{ fontSize: 11, color: '#374151' }}>{opt.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReplace(false)} style={{ height: 30, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>Cancel</button>
              <button onClick={apply} disabled={confirming} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 6, background: confirming ? '#9CA3AF' : '#2563EB', fontSize: 12, fontWeight: 500, color: 'white', cursor: confirming ? 'wait' : 'pointer' }}>{confirming ? 'Applying…' : 'Replace'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Linear tool confirm ───────────────────────────────────────────────────
  const LinearConfirm = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
      <div style={{ width: 320, background: 'white', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Switch to {pendingAsm?.tool} tool?</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: '18px' }}>Activating <strong>{pendingAsm?.name}</strong> will switch the active tool from {activeAsm.tool} to {pendingAsm?.tool}. The canvas, zoom, and selected objects will remain unchanged.</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => { setShowLinearConfirm(false); setPendingAsm(null); }} style={{ height: 30, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { if (pendingAsm) doActivate(pendingAsm); setShowLinearConfirm(false); setPendingAsm(null); }} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 6, background: '#2563EB', fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer' }}>Confirm</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Active assembly card */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Active Assembly</div>
        <div style={{ padding: '8px 10px', background: '#EFF6FF', borderRadius: 6, border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeAsm.name}</div>
              <div style={{ fontSize: 9, color: '#6B7280', fontFamily: 'monospace', marginTop: 1 }}>{activeAsm.code}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#DBEAFE', color: '#1D4ED8' }}>{activeAsm.cat}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#DBEAFE', color: '#1D4ED8' }}>{activeAsm.source}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: statusBg(activeAsm.status), color: statusColor(activeAsm.status) }}>{statusLabel(activeAsm.status)}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: activeAsm.tool === 'Count' ? '#F5F3FF' : '#FFFBEB', color: activeAsm.tool === 'Count' ? '#7C3AED' : '#92400E' }}>{activeAsm.tool}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            <button onClick={() => { setBomAsm(activeAsm); setShowBOM(true); }} style={{ flex: 1, height: 22, border: '1px solid #BFDBFE', borderRadius: 4, background: 'white', fontSize: 10, color: '#1D4ED8', cursor: 'pointer' }}>Preview BOM</button>
            <button onClick={() => { setReplaceTarget(activeAsm); setShowReplace(true); }} style={{ flex: 1, height: 22, border: '1px solid #BFDBFE', borderRadius: 4, background: 'white', fontSize: 10, color: '#1D4ED8', cursor: 'pointer' }}>Change</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, backgroundColor: '#F9FAFB' }}>
          <Search size={11} color="#9CA3AF" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search project-compatible assemblies…" style={{ flex: 1, border: 'none', background: 'none', fontSize: 11, color: '#374151', outline: 'none' }} />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}><X size={10} color="#9CA3AF" /></button>}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '5px 10px 6px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f === filter ? 'All' : f)}
            style={{ height: 20, padding: '0 7px', border: `1px solid ${filter === f ? '#2563EB' : '#E5E7EB'}`, borderRadius: 10, fontSize: 10, background: filter === f ? '#EFF6FF' : 'white', color: filter === f ? '#1D4ED8' : '#6B7280', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: filter === f ? 600 : 400 }}>
            {f}
          </button>
        ))}
      </div>

      {/* Assembly sections or search results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {showSearch ? (
          <>
            <div style={{ padding: '6px 10px 3px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Results ({filtered.length})</div>
            {filtered.length === 0 && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>No assemblies match your search.</div>
            )}
            {filtered.map(a => <AssemblyRow key={a.id} asm={a} isActive={a.id === activeAsm.id} onActivate={activateAssembly} onPreviewBOM={bom => { setBomAsm(bom); setShowBOM(true); }} onReplace={tgt => { setReplaceTarget(tgt); setShowReplace(true); }} menuId={menuId} setMenuId={setMenuId} statusColor={statusColor} statusBg={statusBg} statusLabel={statusLabel} />)}
          </>
        ) : (
          SECTIONS.map(sec => sec.items.length > 0 && (
            <div key={sec.label}>
              <div style={{ padding: '7px 10px 3px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #F9FAFB' }}>{sec.label}</div>
              {sec.items.map(a => <AssemblyRow key={a.id} asm={a} isActive={a.id === activeAsm.id} onActivate={activateAssembly} onPreviewBOM={bom => { setBomAsm(bom); setShowBOM(true); }} onReplace={tgt => { setReplaceTarget(tgt); setShowReplace(true); }} menuId={menuId} setMenuId={setMenuId} statusColor={statusColor} statusBg={statusBg} statusLabel={statusLabel} />)}
            </div>
          ))
        )}
      </div>

      {/* Open full library link */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #F3F4F6', flexShrink: 0, textAlign: 'center' }}>
        <button onClick={() => onNavigateToLibrary?.()} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Open Full Library →</button>
      </div>

      {showBOM && <BOMPreview />}
      {showReplace && <ReplaceDialog />}
      {showLinearConfirm && <LinearConfirm />}
    </div>
  );
}

function AssemblyRow({ asm, isActive, onActivate, onPreviewBOM, onReplace, menuId, setMenuId, statusColor, statusBg, statusLabel }: {
  asm: typeof SIDEBAR_ASSEMBLIES[0];
  isActive: boolean;
  onActivate: (a: typeof SIDEBAR_ASSEMBLIES[0]) => void;
  onPreviewBOM: (a: typeof SIDEBAR_ASSEMBLIES[0]) => void;
  onReplace: (a: typeof SIDEBAR_ASSEMBLIES[0]) => void;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  statusColor: (s: string) => string;
  statusBg: (s: string) => string;
  statusLabel: (s: string) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid #F9FAFB', background: isActive ? '#EFF6FF' : 'white', borderLeft: `2px solid ${isActive ? '#2563EB' : 'transparent'}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? '#1D4ED8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{asm.name}</span>
          {asm.locked && <Lock size={9} color="#9CA3AF" />}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#9CA3AF' }}>{asm.code}</span>
          <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: asm.tool === 'Count' ? '#F5F3FF' : '#FFFBEB', color: asm.tool === 'Count' ? '#7C3AED' : '#92400E' }}>{asm.tool}</span>
          <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: statusBg(asm.status), color: statusColor(asm.status) }}>{statusLabel(asm.status)}</span>
        </div>
      </div>
      <button onClick={() => onActivate(asm)}
        style={{ height: 22, padding: '0 7px', border: `1px solid ${isActive ? '#2563EB' : '#E5E7EB'}`, borderRadius: 4, background: isActive ? '#2563EB' : 'white', fontSize: 10, color: isActive ? 'white' : '#374151', cursor: 'pointer', flexShrink: 0, fontWeight: isActive ? 600 : 400 }}>
        {isActive ? 'Active' : 'Activate'}
      </button>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setMenuId(menuId === asm.id ? null : asm.id)}
          style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}>
          <MoreHorizontal size={12} color="#6B7280" />
        </button>
        {menuId === asm.id && (
          <>
            <div onClick={() => setMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 51, background: 'white', border: '1px solid #E5E7EB', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden' }}>
              {[
                { label: 'Preview BOM',              action: () => { onPreviewBOM(asm); setMenuId(null); } },
                { label: 'Open Details',             action: () => { toast.info('Opening assembly details…'); setMenuId(null); } },
                { label: 'Edit',                     action: () => { toast.info('Edit: Open Full Configurator to modify'); setMenuId(null); } },
                { label: 'Duplicate',                action: () => { toast.success('Assembly duplicated'); setMenuId(null); } },
                { label: 'Replace Selected Takeoff', action: () => { onReplace(asm); setMenuId(null); } },
                { label: 'Apply to Selected Objects',action: () => { toast.success('Applied to selected objects'); setMenuId(null); } },
                { label: 'Open Full Configurator',   action: () => { toast.info('Opening full configurator…'); setMenuId(null); } },
                { label: asm.fav ? 'Remove from Favorites' : 'Add to Favorites', action: () => { toast.success(asm.fav ? 'Removed from favorites' : 'Added to favorites'); setMenuId(null); } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 12px', border: 'none', background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Left panel ─────────────────────────────────────────────────────────────────

// ─── Page preview modal ────────────────────────────────────────────────────────

function PagePreviewModal({ page, onClose }: { page: Page; onClose: () => void }) {
  const cfg = DISC_COLORS[page.discipline] || { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 520, background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#111827' }}>{page.num}</span>
          <span style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>{page.title}</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF' }}>{page.scale ?? 'Scale not set'}</span>
          <button onClick={onClose} style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="#6B7280" /></button>
        </div>
        <div style={{ padding: 16 }}>
          <svg width="100%" viewBox="0 0 480 360" style={{ borderRadius: 6, border: '1px solid #E5E7EB', display: 'block', background: cfg.bg }}>
            <rect width={480} height={360} fill={cfg.bg} />
            {[30,50,70,90,110,130,150,170,190,210,230,250,270,290,310].map(y => (
              <line key={y} x1={20} y1={y} x2={460} y2={y} stroke={cfg.border} strokeWidth={0.7} />
            ))}
            <rect y={290} width={480} height={70} fill="white" opacity={0.9} />
            <line x1={0} y1={290} x2={480} y2={290} stroke={cfg.border} strokeWidth={1} />
            <line x1={160} y1={290} x2={160} y2={360} stroke={cfg.border} strokeWidth={0.7} />
            <line x1={320} y1={290} x2={320} y2={360} stroke={cfg.border} strokeWidth={0.7} />
            <text x={12} y={310} style={{ fontSize: 11, fill: cfg.text, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{page.num}</text>
            <text x={170} y={310} style={{ fontSize: 9, fill: '#374151', fontFamily: 'sans-serif' }}>Dollar Tree Retail · Store 1842</text>
            <text x={330} y={310} style={{ fontSize: 9, fill: '#374151', fontFamily: 'sans-serif' }}>Brightpoint Electrical</text>
            <text x={12} y={330} style={{ fontSize: 9, fill: '#6B7280', fontFamily: 'sans-serif' }}>{page.title}</text>
            {page.scale && <text x={330} y={330} style={{ fontSize: 9, fill: '#6B7280', fontFamily: 'monospace' }}>Scale {page.scale}</text>}
          </svg>
        </div>
      </div>
    </div>
  );
}

function LeftPanel({
  collapsed, onToggle, tab, onTabChange, activePage, onPageChange,
  pages, onRenameSheet, onAddDrawings, onReenableSheet, onCreateSubPage, markers,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tab: 'pages' | 'takeoff' | 'layers' | 'assemblies' | 'items';
  onTabChange: (t: 'pages' | 'takeoff' | 'layers' | 'assemblies' | 'items') => void;
  activePage: number;
  onPageChange: (i: number) => void;
  pages: Page[];
  onRenameSheet: (id: string, newName: string) => void;
  onAddDrawings: () => void;
  onReenableSheet: (id: string) => void;
  onCreateSubPage: (parentId: string) => void;
  markers: CountMarker[];
}) {
  const [layerVis, setLayerVis] = useState({ drawing: true, markup: true, count: true, linear: true, ai: true, notes: false });
  const [layerLock, setLayerLock] = useState({ drawing: false, markup: false, count: false, linear: false, ai: false, notes: false });
  const [pageMenuId, setPageMenuId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<Page | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const discColor = (d: string) => DISC_COLORS[d] || { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };

  const visiblePages = pages.filter(p => !p.excluded);
  const excludedPages = pages.filter(p => p.excluded);

  return (
    <div style={{ width: collapsed ? 0 : 280, minWidth: collapsed ? 0 : 280, borderRight: '1px solid #E5E7EB', backgroundColor: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 200ms ease, min-width 200ms ease', position: 'relative', flexShrink: 0 }}>
      {!collapsed && (
        <>
          {/* Tab strip */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {(['pages', 'takeoff', 'layers', 'assemblies', 'items'] as const).map(t => (
              <button key={t} onClick={() => onTabChange(t)} style={{ flex: 1, height: 38, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: t === 'assemblies' || t === 'items' ? 10 : 11, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#2563EB' : '#6B7280', borderBottom: tab === t ? '2px solid #2563EB' : '2px solid transparent', textTransform: 'capitalize' }}>
                {t === 'pages' ? 'Pages' : t === 'takeoff' ? 'Takeoff' : t === 'layers' ? 'Layers' : t === 'assemblies' ? 'Assemblies' : 'Parts'}
              </button>
            ))}
          </div>

          {/* Pages tab */}
          {tab === 'pages' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, display: 'flex', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, backgroundColor: '#F9FAFB', flex: 1 }}>
                  <Search size={11} color="#9CA3AF" />
                  <input placeholder="Search sheets…" style={{ flex: 1, border: 'none', background: 'none', fontSize: 11, color: '#374151', outline: 'none' }} />
                </div>
                <button onClick={onAddDrawings} title="Add more drawings" style={{ width: 28, height: 28, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={12} color="#374151" />
                </button>
              </div>
              {visiblePages.map((page, i) => {
                const dc = discColor(page.discipline);
                const isActive = i === activePage;
                const isSubPage = page.isSubPage;
                return (
                  <div key={page.id} style={{ position: 'relative' }}>
                    {renamingId === page.id ? (
                      <div style={{ padding: '6px 10px', display: 'flex', gap: 5, borderBottom: '1px solid #F3F4F6' }}>
                        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { onRenameSheet(page.id, renameValue); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                          style={{ flex: 1, height: 26, padding: '0 6px', border: '1px solid #2563EB', borderRadius: 4, fontSize: 11, outline: 'none' }} />
                        <button onClick={() => { onRenameSheet(page.id, renameValue); setRenamingId(null); }} style={{ width: 26, height: 26, border: 'none', borderRadius: 4, background: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color="white" /></button>
                        <button onClick={() => setRenamingId(null)} style={{ width: 26, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} color="#6B7280" /></button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onPageChange(i)}
                        onDoubleClick={() => setPreviewPage(page)}
                        onKeyDown={e => {
                          // Only act on the row itself — let the overflow button handle its own keys.
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPageChange(i); }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isSubPage ? '5px 10px 5px 22px' : '7px 10px', border: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: isActive ? '#EFF6FF' : 'transparent', cursor: 'pointer', textAlign: 'left', userSelect: 'none', borderLeft: isActive ? '2px solid #2563EB' : '2px solid transparent', position: 'relative' }}
                      >
                        {isSubPage && <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 1, background: '#E5E7EB' }} />}
                        <div style={{ width: 32, height: 24, borderRadius: 3, backgroundColor: dc.bg, border: `1px solid ${dc.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 6.5, fontFamily: 'monospace', color: dc.text, fontWeight: 600 }}>{page.num}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: isActive ? '#2563EB' : '#374151' }}>{page.num}</div>
                          <div style={{ fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</div>
                        </div>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: page.scale ? '#9CA3AF' : '#FCD34D', flexShrink: 0 }}>
                          {page.scale ?? '!scale'}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); setPageMenuId(pageMenuId === page.id ? null : page.id); }}
                          style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, flexShrink: 0, opacity: 0.6 }}
                        >
                          <MoreHorizontal size={11} color="#6B7280" />
                        </button>
                      </div>
                    )}
                    {pageMenuId === page.id && (
                      <>
                        <div onClick={() => setPageMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                        <div style={{ position: 'absolute', right: 8, top: 30, zIndex: 51, background: 'white', border: '1px solid #E5E7EB', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden' }}>
                          {[
                            { label: 'Preview sheet', action: () => { setPreviewPage(page); setPageMenuId(null); } },
                            { label: 'Rename sheet', action: () => { setRenamingId(page.id); setRenameValue(page.title); setPageMenuId(null); } },
                            { label: 'Create sub-page', action: () => { onCreateSubPage(page.id); setPageMenuId(null); } },
                            { label: 'Add more drawings', action: () => { onAddDrawings(); setPageMenuId(null); } },
                            { label: 'Exclude from workspace', action: () => { toast.info(`${page.num} excluded. Re-enable from the excluded list.`); setPageMenuId(null); } },
                          ].map(item => (
                            <button key={item.label} onClick={item.action} style={{ display: 'block', width: '100%', padding: '7px 14px', fontSize: 12, color: '#111827', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {excludedPages.length > 0 && (
                <div style={{ marginTop: 6, borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ padding: '5px 10px 3px', fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Excluded ({excludedPages.length})</div>
                  {excludedPages.map(page => {
                    const dc = discColor(page.discipline);
                    return (
                      <div key={page.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', opacity: 0.5 }}>
                        <div style={{ width: 28, height: 20, borderRadius: 3, backgroundColor: dc.bg, border: `1px solid ${dc.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 6, fontFamily: 'monospace', color: dc.text, fontWeight: 600 }}>{page.num}</span>
                        </div>
                        <span style={{ flex: 1, fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.num}</span>
                        <button onClick={() => onReenableSheet(page.id)} title="Re-enable" style={{ height: 20, padding: '0 7px', border: '1px solid #E5E7EB', borderRadius: 3, background: 'white', cursor: 'pointer', fontSize: 9, color: '#374151' }}>Re-enable</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Takeoff tab */}
          {tab === 'takeoff' && (() => {
            // Compute tally by assembly from live markers
            const tallyMap: Record<string, { name: string; color: string; discipline: string; confirmed: number; ai: number; missing: boolean }> = {};
            markers.forEach(m => {
              const key = m.assemblyId || m.id;
              if (!tallyMap[key]) tallyMap[key] = { name: m.assembly || 'Unassigned', color: m.color, discipline: m.discipline, confirmed: 0, ai: 0, missing: !m.assembly };
              if (m.markerState === 'ai-suggested') tallyMap[key].ai += 1;
              else if (m.markerState !== 'excluded') tallyMap[key].confirmed += 1;
            });
            const byDisc: Record<string, typeof tallyMap[string][]> = {};
            Object.values(tallyMap).forEach(entry => {
              if (!byDisc[entry.discipline]) byDisc[entry.discipline] = [];
              byDisc[entry.discipline].push(entry);
            });
            return (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 5, backgroundColor: '#F9FAFB' }}>
                    <Search size={11} color="#9CA3AF" />
                    <input placeholder="Search assemblies…" style={{ flex: 1, border: 'none', background: 'none', fontSize: 11, color: '#374151', outline: 'none' }} />
                  </div>
                </div>
                {Object.entries(byDisc).map(([disc, entries]) => (
                  <div key={disc}>
                    <div style={{ padding: '6px 10px 3px', fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>{disc}</div>
                    {entries.map(entry => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                        {entry.missing
                          ? <AlertTriangle size={8} color="#D97706" />
                          : <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />}
                        <span style={{ flex: 1, fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                        {entry.missing
                          ? <span style={{ fontSize: 10, color: '#D97706' }}>No assembly</span>
                          : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#374151', backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: 10 }}>{entry.confirmed}</span>
                              {entry.ai > 0 && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#A855F7', backgroundColor: '#F5F3FF', padding: '1px 5px', borderRadius: 10 }}>+{entry.ai} AI</span>}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Legend */}
                <div style={{ padding: '10px 10px 6px', marginTop: 'auto', borderTop: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Legend</div>
                  {[{ color: '#7C3AED', label: 'Lighting takeoff' }, { color: '#DC2626', label: 'Emergency' }, { color: '#D97706', label: 'Conduit / power' }, { color: '#9CA3AF', label: 'Unassigned' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6B7280' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: l.color, flexShrink: 0 }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Layers tab */}
          {tab === 'layers' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(Object.keys(layerVis) as (keyof typeof layerVis)[]).map(key => {
                const labels: Record<string, string> = { drawing: 'Drawing', markup: 'Manual Markup', count: 'Count Takeoff', linear: 'Linear Takeoff', ai: 'AI Suggestions', notes: 'Notes' };
                const colors: Record<string, string> = { drawing: '#374151', markup: '#6B7280', count: '#7C3AED', linear: '#D97706', ai: '#A855F7', notes: '#16A34A' };
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid #F9FAFB' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors[key], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: '#374151' }}>{labels[key]}</span>
                    <button onClick={() => setLayerLock(v => ({ ...v, [key]: !v[key] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: layerLock[key] ? '#374151' : '#D1D5DB', padding: 2 }}>
                      {layerLock[key] ? <Lock size={11} /> : <Unlock size={11} />}
                    </button>
                    <button onClick={() => setLayerVis(v => ({ ...v, [key]: !v[key] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: layerVis[key] ? '#374151' : '#D1D5DB', padding: 2 }}>
                      {layerVis[key] ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assemblies tab */}
          {tab === 'assemblies' && <AssembliesTabContent />}

          {/* Items tab */}
          {tab === 'items' && <PartsTabContent />}
        </>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{ position: 'absolute', right: collapsed ? -16 : -14, top: 60, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: '#6B7280' }}
      >
        {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
      </button>

      {/* Page preview modal (portal-like, rendered inside panel but fixed positioned) */}
      {previewPage && <PagePreviewModal page={previewPage} onClose={() => setPreviewPage(null)} />}
    </div>
  );
}

// ─── Right inspector ────────────────────────────────────────────────────────────

function RightInspector({
  collapsed, onToggle, tab, onTabChange, selectedMarker, selectedPath, markers, onMarkerUpdate, onChangeAssembly,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tab: 'properties' | 'assembly' | 'pricing' | 'ai-review';
  onTabChange: (t: 'properties' | 'assembly' | 'pricing' | 'ai-review') => void;
  selectedMarker: CountMarker | null;
  selectedPath: LinearPath | null;
  markers: CountMarker[];
  onMarkerUpdate: (id: string, patch: Partial<CountMarker>) => void;
  onChangeAssembly: () => void;
}) {
  const [aiItemStates, setAIItemStates] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});
  const [waste, setWaste] = useState('5');
  const [multiplier, setMultiplier] = useState('1');

  const led16 = markers.filter(m => m.assemblyId === 'asm-led-troffer' && m.markerState !== 'ai-suggested').length;

  const aiBadge = (c: Confidence) => {
    const cfg = CONF_CFG[c];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 10, backgroundColor: cfg.bg, fontSize: 9, fontWeight: 600, color: cfg.color, flexShrink: 0 }}>
        <Sparkles size={8} />
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ width: collapsed ? 0 : 340, minWidth: collapsed ? 0 : 340, borderLeft: '1px solid #E5E7EB', backgroundColor: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 200ms ease, min-width 200ms ease', position: 'relative', flexShrink: 0 }}>
      {!collapsed && (
        <>
          {/* Tab strip */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {(['properties', 'assembly', 'pricing', 'ai-review'] as const).map(t => (
              <button key={t} onClick={() => onTabChange(t)} style={{ flex: 1, height: 38, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: t === 'ai-review' ? 9.5 : 10.5, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#2563EB' : '#6B7280', borderBottom: tab === t ? '2px solid #2563EB' : '2px solid transparent', textTransform: 'capitalize' }}>
                {t === 'ai-review' ? 'AI Review' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* ── Properties ── */}
            {tab === 'properties' && !selectedMarker && !selectedPath && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9CA3AF', gap: 8, padding: 24 }}>
                <MousePointer2 size={22} />
                <p style={{ fontSize: 12, textAlign: 'center', lineHeight: '16px' }}>Select an object on the canvas to view its properties</p>
              </div>
            )}
            {tab === 'properties' && selectedMarker && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMarker.assembly || 'No assembly assigned'}</div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#9CA3AF', marginTop: 2 }}>{selectedMarker.assemblyId || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(() => { const dc = DISC_COLORS[selectedMarker.discipline]; return dc ? <span style={{ padding: '2px 7px', borderRadius: 4, border: `1px solid ${dc.border}`, backgroundColor: dc.bg, fontSize: 10, color: dc.text, fontWeight: 500 }}>{selectedMarker.discipline}</span> : null; })()}
                  <span style={{ padding: '2px 7px', borderRadius: 4, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 10, color: '#6B7280' }}>Count marker</span>
                </div>
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
                  <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>Quantity (this page)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => onMarkerUpdate(selectedMarker.id, { number: Math.max(1, selectedMarker.number - 1) })} style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" value={led16} readOnly style={{ width: 52, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: '#111827', background: 'white' }} />
                    <button style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>ea</span>
                  </div>
                </div>
                {selectedMarker.markerState === 'ai-suggested' && (
                  <div style={{ padding: '8px 10px', borderRadius: 6, backgroundColor: '#F5F3FF', border: '1px solid #C4B5FD', fontSize: 11, color: '#5B21B6', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <Sparkles size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>AI suggested — verify before including in estimate</span>
                  </div>
                )}
                {selectedMarker.markerState === 'missing-assembly' && (
                  <div style={{ padding: '8px 10px', borderRadius: 6, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>No assembly assigned. Assign an assembly to include in pricing.</span>
                  </div>
                )}
                {/* Fixture designator + discipline */}
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>Designator</label>
                    <input
                      placeholder="A, B, C…"
                      value={selectedMarker.designator || ''}
                      onChange={e => onMarkerUpdate(selectedMarker.id, { designator: e.target.value.toUpperCase().slice(0, 2) || undefined })}
                      style={{ width: '100%', height: 28, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#374151', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>Discipline</label>
                    <select
                      value={selectedMarker.discipline}
                      onChange={e => onMarkerUpdate(selectedMarker.id, { discipline: e.target.value as CountMarker['discipline'] })}
                      style={{ width: '100%', height: 28, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 6px', fontSize: 11, color: '#374151', outline: 'none', background: 'white', cursor: 'pointer' }}
                    >
                      <option value="lighting">Lighting</option>
                      <option value="power">Power</option>
                      <option value="fire-alarm">Fire Alarm</option>
                      <option value="data">Data / Low Voltage</option>
                      <option value="hvac">HVAC</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
                  <label style={{ fontSize: 10, color: '#6B7280', display: 'block', marginBottom: 4 }}>Notes</label>
                  <textarea rows={2} placeholder="Add notes…" style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 4, padding: '5px 8px', fontSize: 11, color: '#374151', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={onChangeAssembly} style={{ flex: 1, height: 30, border: '1px solid #D1D5DB', borderRadius: 5, background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Package size={11} /> Change assembly
                  </button>
                  <button onClick={onChangeAssembly} style={{ flex: 1, height: 30, border: '1px solid #BFDBFE', borderRadius: 5, background: '#EFF6FF', cursor: 'pointer', fontSize: 11, color: '#2563EB' }}>View assembly</button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 12, height: 12, cursor: 'pointer' }} />
                  Exclude from estimate
                </label>
              </div>
            )}
            {tab === 'properties' && selectedPath && !selectedMarker && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedPath.assembly}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Linear takeoff</div>
                </div>
                {[
                  { label: 'Assembly', value: selectedPath.assembly, editable: false },
                  { label: 'Horizontal length', value: `${selectedPath.totalLength} m`, mono: true, calc: true },
                  { label: 'Vertical drop', value: '0.0 m', mono: true, editable: true },
                  { label: 'Total length', value: `${selectedPath.totalLength} m`, mono: true, bold: true, calc: true },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 10, color: '#6B7280' }}>{f.label}</span>
                    <span style={{ fontSize: 11, fontFamily: f.mono ? 'IBM Plex Mono, monospace' : undefined, fontWeight: f.bold ? 600 : 400, color: '#374151', backgroundColor: f.calc ? '#F9FAFB' : 'transparent', padding: f.calc ? '2px 6px' : undefined, borderRadius: f.calc ? 3 : undefined }}>{f.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 10, color: '#6B7280' }}>Waste %</span>
                  <input value={waste} onChange={e => setWaste(e.target.value)} style={{ width: 52, height: 24, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', textAlign: 'right', outline: 'none' }} />
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 10, color: '#6B7280' }}>Qty multiplier</span>
                  <input value={multiplier} onChange={e => setMultiplier(e.target.value)} style={{ width: 52, height: 24, border: '1px solid #E5E7EB', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', textAlign: 'right', outline: 'none' }} />
                </div>
                {[
                  { label: 'Material cost', value: '$842.40', calc: true },
                  { label: 'Labor hours', value: '4.2 hrs', calc: true },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 10, color: '#6B7280' }}>{f.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#374151', backgroundColor: '#F9FAFB', padding: '2px 6px', borderRadius: 3 }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Assembly ── */}
            {tab === 'assembly' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedMarker || selectedPath ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMarker ? '2×4 LED Troffer 40W' : '3/4" EMT Conduit'}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedMarker ? 'ASM-LED-TROFFER' : 'ASM-EMT-075'}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <th style={{ textAlign: 'left', padding: '4px 0', color: '#9CA3AF', fontWeight: 500 }}>Description</th>
                          <th style={{ textAlign: 'right', padding: '4px 4px', color: '#9CA3AF', fontWeight: 500 }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '4px 0', color: '#9CA3AF', fontWeight: 500 }}>Unit</th>
                          <th style={{ textAlign: 'right', padding: '4px 0', color: '#9CA3AF', fontWeight: 500 }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedMarker ? [
                          { desc: 'Troffer fixture 2×4 40W LED', qty: 16, unit: 'ea', cost: '$776.00' },
                          { desc: '12/3 NM-B wire', qty: 32, unit: 'm', cost: '$67.20' },
                          { desc: 'Conduit connector', qty: 32, unit: 'ea', cost: '$38.40' },
                        ] : [
                          { desc: '3/4" EMT Conduit', qty: 27.3, unit: 'm', cost: '$572.70' },
                          { desc: 'Coupling 3/4"', qty: 12, unit: 'ea', cost: '$43.20' },
                          { desc: 'Connector 3/4"', qty: 8, unit: 'ea', cost: '$22.40' },
                        ]).map(row => (
                          <tr key={row.desc} style={{ borderBottom: '1px solid #F9FAFB' }}>
                            <td style={{ padding: '4px 0', color: '#374151' }}>{row.desc}</td>
                            <td style={{ padding: '4px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: '#374151' }}>{row.qty}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', color: '#6B7280' }}>{row.unit}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: '#374151' }}>{row.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: 8, fontSize: 11 }}>
                      <span style={{ color: '#6B7280' }}>Labor: {selectedMarker ? '12.8 hrs @ $85/hr' : '4.2 hrs @ $85/hr'}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#111827' }}>{selectedMarker ? '$1,088' : '$357'}</span>
                    </div>
                    <button style={{ width: '100%', height: 32, border: '1px solid #D1D5DB', borderRadius: 5, background: 'white', cursor: 'pointer', fontSize: 12, color: '#374151', marginTop: 4 }}>Edit assembly</button>
                  </>
                ) : (
                  <div style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>Select an object to view its assembly</div>
                )}
              </div>
            )}

            {/* ── Pricing ── */}
            {tab === 'pricing' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{selectedMarker || selectedPath ? 'Selection' : 'Full estimate'}</div>
                {[
                  { label: 'Material', value: selectedMarker ? '$881.60' : selectedPath ? '$638.30' : '$2,430.80', sub: true },
                  { label: 'Labor', value: selectedMarker ? '$1,088.00' : selectedPath ? '$357.00' : '$3,218.50', sub: true },
                  { label: 'Subtotal', value: selectedMarker ? '$1,969.60' : selectedPath ? '$995.30' : '$5,649.30', bold: true },
                  { label: 'Overhead (15%)', value: selectedMarker ? '$295.44' : selectedPath ? '$149.30' : '$847.40' },
                  { label: 'Margin (12%)', value: selectedMarker ? '$236.35' : selectedPath ? '$119.44' : '$677.92' },
                  { label: 'Total sell', value: selectedMarker ? '$2,501.39' : selectedPath ? '$1,264.04' : '$7,174.62', bold: true, accent: true },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 11, color: row.bold ? '#111827' : '#6B7280', fontWeight: row.bold ? 600 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', fontWeight: row.bold ? 600 : 400, color: row.accent ? '#2563EB' : '#374151', backgroundColor: row.sub ? '#F9FAFB' : undefined, padding: row.sub ? '1px 5px' : undefined, borderRadius: row.sub ? 3 : undefined }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── AI Review ── */}
            {tab === 'ai-review' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Sparkles size={13} color="#7C3AED" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>4 items need review</span>
                </div>
                {AI_ITEMS.map(item => {
                  const state = aiItemStates[item.id];
                  const cfg = CONF_CFG[item.confidence];
                  return (
                    <div key={item.id} style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', opacity: state ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#111827', flex: 1 }}>{item.title}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 10, backgroundColor: cfg.bg, fontSize: 8.5, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                          <Sparkles size={7} />{cfg.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: '#6B7280', lineHeight: '14px', marginBottom: 8 }}>{item.desc}</p>
                      {!state && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => setAIItemStates(v => ({ ...v, [item.id]: 'approved' }))} style={{ flex: 1, height: 26, border: '1px solid #BBF7D0', borderRadius: 4, backgroundColor: '#F0FDF4', cursor: 'pointer', fontSize: 10, color: '#16A34A', fontWeight: 500 }}>
                            <Check size={9} style={{ display: 'inline', marginRight: 3 }} />{item.actions[0]}
                          </button>
                          <button onClick={() => setAIItemStates(v => ({ ...v, [item.id]: 'rejected' }))} style={{ flex: 1, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, backgroundColor: 'white', cursor: 'pointer', fontSize: 10, color: '#6B7280' }}>
                            {item.actions[1] || 'Dismiss'}
                          </button>
                        </div>
                      )}
                      {state === 'approved' && <span style={{ fontSize: 10, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={10} />Approved</span>}
                      {state === 'rejected' && <span style={{ fontSize: 10, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}><X size={10} />Dismissed</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{ position: 'absolute', left: collapsed ? -16 : -14, top: 60, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: '#6B7280' }}
      >
        {collapsed ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
      </button>
    </div>
  );
}

// ─── Status bar ─────────────────────────────────────────────────────────────────

function StatusBar({ activePage, zoom, selectedCount, snapEnabled, demoState, pages }: {
  activePage: number;
  zoom: number;
  selectedCount: number;
  snapEnabled: boolean;
  demoState: WorkspaceDemo;
  pages: Page[];
}) {
  const page = pages[activePage];
  const isOffline = demoState === 'offline' || demoState === 'save-failure';
  return (
    <div style={{ height: 30, backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 0, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', flexShrink: 0 }}>
      <span style={{ color: '#374151', fontWeight: 600 }}>{page?.num}</span>
      <span style={{ margin: '0 8px', color: '#D1D5DB' }}>·</span>
      <span>{activePage + 1} of {pages.filter(p => !p.excluded).length}</span>
      <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
      <span>Scale {page?.scale ?? 'not set'}</span>
      <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
      <span>{Math.round(zoom * 100)}%</span>
      {selectedCount > 0 && (
        <>
          <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
          <span style={{ color: '#2563EB', fontWeight: 600 }}>{selectedCount} selected</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <Magnet size={10} style={{ marginRight: 4, color: snapEnabled ? '#16A34A' : '#D1D5DB' }} />
      <span style={{ color: snapEnabled ? '#16A34A' : '#9CA3AF', marginRight: 12 }}>Snap {snapEnabled ? 'ON' : 'OFF'}</span>
      {isOffline ? <CloudOff size={10} style={{ marginRight: 4, color: '#DC2626' }} /> : <Cloud size={10} style={{ marginRight: 4, color: '#16A34A' }} />}
      <span style={{ color: isOffline ? '#DC2626' : '#16A34A', marginRight: 12 }}>{isOffline ? 'Offline' : 'Online'}</span>
      {demoState === 'loading' ? (
        <><Loader2 size={10} className="animate-spin" style={{ marginRight: 4 }} /><span>Loading…</span></>
      ) : (
        <span style={{ color: '#9CA3AF' }}>Ready</span>
      )}
    </div>
  );
}

// ─── Keyboard shortcuts modal ───────────────────────────────────────────────────

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid #E5E7EB', width: 560, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Keyboard shortcuts</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 4 }}><X size={16} /></button>
        </div>
        <div style={{ overflow: 'auto', padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {SHORTCUTS.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#374151' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {item.keys.map(k => (
                        <kbd key={k} style={{ padding: '1px 6px', borderRadius: 4, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#374151' }}>{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scale calibration modal ────────────────────────────────────────────────────

function ScaleCalibrationModal({
  onClose, onConfirm, pageNum, isRequired = false, forSubPage = false,
}: {
  onClose: () => void;
  onConfirm: (scale: string, applyAll: boolean, isSubPageScale: boolean) => void;
  pageNum: string;
  isRequired?: boolean;
  forSubPage?: boolean;
}) {
  const [screen, setScreen] = useState<'preset' | 'manual'>('preset');
  const [scaleType, setScaleType] = useState<'architectural' | 'engineering'>('architectural');
  const [selectedPreset, setSelectedPreset] = useState('1:100');
  const [customDist, setCustomDist] = useState('');
  const [unit, setUnit] = useState('ft');
  const [applyAll, setApplyAll] = useState(false);
  const [subPageScale, setSubPageScale] = useState(forSubPage);

  const presets = scaleType === 'architectural' ? ARCH_SCALES : ENG_SCALES;

  function handleConfirm() {
    const scale = screen === 'preset' ? selectedPreset : customDist ? `1"=${customDist}${unit}` : '';
    if (!scale) return;
    onConfirm(scale, applyAll, subPageScale);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid #E5E7EB', width: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Set sheet scale — {pageNum}</h3>
            {isRequired && <p style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>Scale is required before measuring or taking off dimensions.</p>}
          </div>
          {!isRequired && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 4 }}><X size={16} /></button>}
        </div>
        <div style={{ padding: 20 }}>
          {/* Screen toggle */}
          <div style={{ display: 'flex', gap: 0, border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden', marginBottom: 16, width: 'fit-content' }}>
            {(['preset', 'manual'] as const).map(s => (
              <button key={s} onClick={() => setScreen(s)} style={{ height: 30, padding: '0 16px', border: 'none', fontSize: 12, cursor: 'pointer', background: screen === s ? '#EFF6FF' : 'white', color: screen === s ? '#1D4ED8' : '#6B7280', fontWeight: screen === s ? 600 : 400 }}>
                {s === 'preset' ? 'Select scale' : 'Calibrate manually'}
              </button>
            ))}
          </div>

          {screen === 'preset' ? (
            <>
              {/* Scale type toggle */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {(['architectural', 'engineering'] as const).map(t => (
                  <button key={t} onClick={() => { setScaleType(t); setSelectedPreset(t === 'architectural' ? '1:100' : '1"=20\''); }} style={{ height: 26, padding: '0 12px', border: `1px solid ${scaleType === t ? '#2563EB' : '#E5E7EB'}`, borderRadius: 5, fontSize: 11, cursor: 'pointer', background: scaleType === t ? '#EFF6FF' : 'white', color: scaleType === t ? '#1D4ED8' : '#6B7280', fontWeight: scaleType === t ? 600 : 400, textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
                {presets.map(s => (
                  <button key={s} onClick={() => setSelectedPreset(s)} style={{ height: 32, border: `1px solid ${selectedPreset === s ? '#2563EB' : '#E5E7EB'}`, borderRadius: 5, fontSize: 11, cursor: 'pointer', background: selectedPreset === s ? '#EFF6FF' : 'white', color: selectedPreset === s ? '#1D4ED8' : '#374151', fontWeight: selectedPreset === s ? 600 : 400, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: '17px', marginBottom: 12 }}>Click two known points on the drawing, then enter the real-world distance between them.</p>
              <div style={{ height: 72, borderRadius: 6, border: '2px dashed #BFDBFE', backgroundColor: '#EFF6FF', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#2563EB' }}>Click on the drawing to place calibration points</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="number" placeholder="Known distance" value={customDist} onChange={e => setCustomDist(e.target.value)} style={{ flex: 1, height: 32, border: '1px solid #E5E7EB', borderRadius: 5, padding: '0 10px', fontSize: 12, outline: 'none' }} />
                <select value={unit} onChange={e => setUnit(e.target.value)} style={{ height: 32, border: '1px solid #E5E7EB', borderRadius: 5, padding: '0 8px', fontSize: 12, color: '#374151', outline: 'none' }}>
                  <option value="ft">ft</option><option value="in">in</option><option value="m">m</option><option value="mm">mm</option>
                </select>
              </div>
            </>
          )}

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} style={{ width: 12, height: 12, accentColor: '#2563EB' }} />
              Apply this scale to all pages in this drawing set
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={subPageScale} onChange={e => setSubPageScale(e.target.checked)} style={{ width: 12, height: 12, accentColor: '#2563EB' }} />
              {forSubPage ? 'Override parent page scale for this sub-page' : 'Set as independent scale for a sub-page area'}
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isRequired && <button onClick={onClose} style={{ height: 34, padding: '0 14px', border: '1px solid #D1D5DB', borderRadius: 6, backgroundColor: 'white', cursor: 'pointer', fontSize: 12, color: '#374151' }}>Cancel</button>}
            <button
              onClick={handleConfirm}
              disabled={screen === 'manual' && !customDist}
              style={{ flex: 1, height: 34, border: 'none', borderRadius: 6, backgroundColor: (screen === 'manual' && !customDist) ? '#D1D5DB' : '#2563EB', cursor: (screen === 'manual' && !customDist) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500, color: 'white' }}
            >
              Confirm scale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main workspace ─────────────────────────────────────────────────────────────

interface TakeoffWorkspaceProps {
  onExit: () => void;
}

export function TakeoffWorkspace({ onExit }: TakeoffWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.85);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [leftTab, setLeftTab] = useState<'pages' | 'takeoff' | 'layers' | 'assemblies' | 'items'>('pages');
  const [rightTab, setRightTab] = useState<'properties' | 'assembly' | 'pricing' | 'ai-review'>('properties');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [showSymbols, setShowSymbols] = useState(true);
  const [dimBackground, setDimBackground] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; markerId: string } | null>(null);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [pendingTool, setPendingTool] = useState<Tool | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [demoState, setDemoState] = useState<WorkspaceDemo>('default');
  const [markers, setMarkers] = useState<CountMarker[]>(buildInitialMarkers);
  const [paths, setPaths] = useState<LinearPath[]>(INITIAL_PATHS);
  const [linearInProgress, setLinearInProgress] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showAssemblyPanel, setShowAssemblyPanel] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerNextNum = useRef(markers.length + 1);

  // Apply demo state changes
  useEffect(() => {
    switch (demoState) {
      case 'default':
        setActiveTool('select');
        setSelectedIds([]);
        setLeftCollapsed(false);
        setRightCollapsed(false);
        setLinearInProgress([]);
        setAutosaveState('saved');
        setPanOffset({ x: 0, y: 0 });
        break;
      case 'count-active':
        setActiveTool('count');
        setSelectedIds([]);
        break;
      case 'linear-active':
        setActiveTool('linear');
        setSelectedIds([]);
        setLinearInProgress([{ x: 200, y: 410 }, { x: 620, y: 410 }, { x: 620, y: 490 }]);
        break;
      case 'selected-count':
        setActiveTool('select');
        setSelectedIds(['m1']);
        setRightTab('properties');
        break;
      case 'selected-linear':
        setActiveTool('select');
        setSelectedIds(['lp1']);
        setRightTab('properties');
        break;
      case 'collapsed-panels':
        setLeftCollapsed(true);
        setRightCollapsed(true);
        setSelectedIds([]);
        break;
      case 'save-failure':
        setAutosaveState('failed');
        break;
      case 'offline':
        setAutosaveState('failed');
        break;
      default:
        break;
    }
  }, [demoState]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case 'v': case 'V': setActiveTool('select'); break;
        case 'h': case 'H': setActiveTool('hand'); break;
        case 'c': case 'C': setActiveTool('count'); break;
        case 'l': case 'L': setActiveTool('linear'); break;
        case 'm': case 'M': setActiveTool('measure'); break;
        case 'r': case 'R': setActiveTool('calibrate'); setShowCalibration(true); break;
        case '?': setShowShortcuts(true); break;
        case 'Escape':
          setSelectedIds([]);
          setLinearInProgress([]);
          setShowShortcuts(false);
          setShowCalibration(false);
          setShowAssemblyPanel(false);
          break;
        case 'Enter':
          if (activeTool === 'linear' && linearInProgress.length > 1) finishLinearPath();
          break;
        case '+': case '=': setZoom(z => Math.min(z + 0.25, 4)); break;
        case '-': setZoom(z => Math.max(z - 0.25, 0.25)); break;
        case '0': if (e.metaKey || e.ctrlKey) { e.preventDefault(); setZoom(0.85); setPanOffset({ x: 0, y: 0 }); } break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activeTool, linearInProgress]);

  function getSVGCoords(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1200,
      y: ((e.clientY - rect.top) / rect.height) * 780,
    };
  }

  function finishLinearPath() {
    if (linearInProgress.length < 2) return;
    const dx = linearInProgress[linearInProgress.length - 1].x - linearInProgress[0].x;
    const dy = linearInProgress[linearInProgress.length - 1].y - linearInProgress[0].y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    const metres = (pixels * 54) / 1080;
    const newPath: LinearPath = {
      id: `lp${Date.now()}`,
      points: [...linearInProgress],
      assembly: '3/4" EMT Conduit',
      color: '#D97706',
      totalLength: Math.round(metres * 10) / 10,
      selected: false,
    };
    setPaths(p => [...p, newPath]);
    setLinearInProgress([]);
    setMousePos(null);
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const coords = getSVGCoords(e);

    if (activeTool === 'count') {
      const num = markerNextNum.current++;
      setMarkers(ms => [...ms, {
        id: `m-new-${num}`,
        x: coords.x, y: coords.y,
        assembly: '2×4 LED Troffer 40W',
        assemblyId: 'asm-led-troffer',
        discipline: 'lighting',
        color: '#7C3AED',
        markerState: 'default',
        number: num,
      }]);
    } else if (activeTool === 'linear') {
      setLinearInProgress(pts => [...pts, coords]);
    } else if (activeTool === 'select') {
      // Click on canvas background deselects
      setSelectedIds([]);
    }
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (activeTool === 'linear' && linearInProgress.length > 0) {
      setMousePos(getSVGCoords(e));
    }
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (activeTool === 'hand') {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (isPanning && activeTool === 'hand') {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  }

  function handleCanvasMouseUp() { setIsPanning(false); }

  function handleMarkerClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    if (e.shiftKey) {
      setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    } else {
      setSelectedIds([id]);
    }
    setRightTab('properties');
  }

  function handlePathClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    setSelectedIds([id]);
    setRightTab('properties');
  }

  const getCursor = () => {
    if (activeTool === 'hand') return isPanning ? 'grabbing' : 'grab';
    if (activeTool === 'count') return 'crosshair';
    if (activeTool === 'linear') return 'crosshair';
    if (activeTool === 'zoom-in') return 'zoom-in';
    if (activeTool === 'zoom-out') return 'zoom-out';
    if (activeTool === 'measure') return 'crosshair';
    return 'default';
  };

  const selectedMarker = markers.find(m => selectedIds.includes(m.id)) ?? null;
  const selectedPath = paths.find(p => selectedIds.includes(p.id)) ?? null;
  const showMissingScaleBanner = demoState === 'missing-scale';
  const showSaveFailBanner = demoState === 'save-failure';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 50, backgroundColor: '#F6F7F9', fontFamily: 'Inter, sans-serif' }}>
      <WorkspaceTopBar
        autosaveState={autosaveState}
        demoState={demoState}
        onUndo={() => {}}
        onRedo={() => {}}
        onHelp={() => setShowShortcuts(true)}
        onExit={onExit}
      />

      <TakeoffToolbar
        activeTool={activeTool}
        onToolChange={t => {
          if ((t === 'measure' || t === 'linear') && !pages[activePageIdx]?.scale) {
            setPendingTool(t);
            setShowCalibration(true);
            return;
          }
          setActiveTool(t);
          if (t === 'calibrate') setShowCalibration(true);
        }}
        snapEnabled={snapEnabled}
        onSnapToggle={() => setSnapEnabled(v => !v)}
        onAICount={() => setRightTab('ai-review')}
        showSymbols={showSymbols}
        onToggleSymbols={() => setShowSymbols(v => !v)}
        dimBackground={dimBackground}
        onToggleDim={() => setDimBackground(v => !v)}
      />

      {/* Banners */}
      {showMissingScaleBanner && (
        <div style={{ backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E', flexShrink: 0 }}>
          <AlertTriangle size={13} color="#D97706" />
          <span><strong>Scale not set</strong> for Sheet E-101. Calibrate the scale before taking off dimensions.</span>
          <button onClick={() => setShowCalibration(true)} style={{ marginLeft: 4, padding: '2px 10px', borderRadius: 4, border: '1px solid #FDE68A', backgroundColor: '#FEF3C7', cursor: 'pointer', fontSize: 11, color: '#92400E' }}>Calibrate now</button>
          <button onClick={() => setDemoState('default')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#D97706' }}><X size={12} /></button>
        </div>
      )}
      {showSaveFailBanner && (
        <div style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#991B1B', flexShrink: 0 }}>
          <AlertTriangle size={13} color="#DC2626" />
          <span><strong>Save failed.</strong> Changes may be lost. Check your connection and try again.</span>
          <button style={{ marginLeft: 4, padding: '2px 10px', borderRadius: 4, border: '1px solid #FCA5A5', backgroundColor: '#FEE2E2', cursor: 'pointer', fontSize: 11, color: '#991B1B' }}>Retry</button>
          <button onClick={() => setDemoState('default')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={12} /></button>
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <LeftPanel
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(v => !v)}
          tab={leftTab}
          onTabChange={t => setLeftTab(t)}
          activePage={activePageIdx}
          onPageChange={setActivePageIdx}
          pages={pages}
          markers={markers}
          onRenameSheet={(id, newTitle) => {
            setPages(ps => ps.map(p => p.id === id ? { ...p, title: newTitle } : p));
            toast.success('Sheet renamed');
          }}
          onAddDrawings={() => toast.info('Upload additional drawings via the Drawings screen.')}
          onReenableSheet={id => {
            setPages(ps => ps.map(p => p.id === id ? { ...p, excluded: false } : p));
            toast.success('Sheet re-enabled');
          }}
          onCreateSubPage={parentId => {
            const parent = pages.find(p => p.id === parentId);
            if (!parent) return;
            const subId = `sub-${parentId}-${Date.now()}`;
            const newSub: Page = {
              id: subId,
              num: `${parent.num}-S1`,
              title: `${parent.title} (Sub-page)`,
              scale: null,
              discipline: parent.discipline,
              parentId,
              isSubPage: true,
            };
            setPages(ps => {
              const idx = ps.findIndex(p => p.id === parentId);
              const next = [...ps];
              next.splice(idx + 1, 0, newSub);
              return next;
            });
            toast.success('Sub-page created — set its scale independently.');
          }}
        />

        {/* Canvas */}
        <div
          style={{ flex: 1, overflow: 'hidden', backgroundColor: '#DDDFE3', position: 'relative', cursor: activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'all' }}
            >
              <svg
                ref={svgRef}
                width={1200}
                height={780}
                style={{ display: 'block', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', cursor: getCursor() }}
                onClick={handleSvgClick}
                onMouseMove={handleSvgMouseMove}
                onDoubleClick={() => { if (activeTool === 'linear' && linearInProgress.length > 1) finishLinearPath(); }}
              >
                <FloorPlan />

                {/* Linear paths */}
                {paths.map(path => (
                  <LinearPathEl
                    key={path.id}
                    path={path}
                    isSelected={selectedIds.includes(path.id)}
                    onClick={e => handlePathClick(e, path.id)}
                  />
                ))}

                {/* In-progress linear */}
                {linearInProgress.length > 0 && (
                  <LinearInProgressEl points={linearInProgress} mousePos={mousePos} />
                )}

                {/* Count markers */}
                {showSymbols && markers.map(m => (
                  <CountMarkerEl
                    key={m.id}
                    marker={m}
                    isSelected={selectedIds.includes(m.id)}
                    isHovered={hoveredId === m.id}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={e => handleMarkerClick(e, m.id)}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, markerId: m.id });
                    }}
                  />
                ))}
                {/* Dim overlay */}
                {dimBackground && <rect x={0} y={0} width={1200} height={780} fill="rgba(0,0,0,0.45)" pointerEvents="none" />}
              </svg>
            </div>
          </div>

          {/* Canvas overlays */}
          {demoState === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(246,247,249,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Loader2 size={26} color="#2563EB" className="animate-spin" />
                <span style={{ fontSize: 13, color: '#374151' }}>Loading E-201…</span>
              </div>
            </div>
          )}
          {demoState === 'corrupted' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7F9', zIndex: 10 }}>
              <div style={{ textAlign: 'center', maxWidth: 320, padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <AlertTriangle size={24} color="#DC2626" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Could not load this drawing</h3>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: '17px', marginBottom: 18 }}>The file may be corrupted or temporarily unavailable. Try re-uploading from the Drawings screen.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setDemoState('default')} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, color: '#374151' }}>View another sheet</button>
                  <button style={{ padding: '8px 16px', border: 'none', borderRadius: 6, backgroundColor: '#2563EB', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'white' }}>Re-upload drawings</button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen button (top right) */}
          <button
            onClick={() => setShowFullscreen(true)}
            title="Full-screen viewer"
            style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: 5, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 5 }}
          >
            <Maximize2 size={13} color="#374151" />
          </button>

          {/* Current sheet scale badge (top left) */}
          {pages[activePageIdx] && (
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: 5, padding: '4px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 5 }}>
              <span style={{ color: '#9CA3AF' }}>Scale</span>
              {pages[activePageIdx].scale
                ? <span style={{ color: '#111827', fontWeight: 600 }}>{pages[activePageIdx].scale}</span>
                : <button onClick={() => { setPendingTool(null); setShowCalibration(true); }} style={{ color: '#D97706', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>Not set — click to calibrate</button>
              }
            </div>
          )}

          {/* Zoom controls (bottom right) */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 4, backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 38, justifyContent: 'center', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#374151' }}>{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))} style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            <div style={{ width: 1, height: 18, backgroundColor: '#E5E7EB', alignSelf: 'center', margin: '0 2px' }} />
            <button onClick={() => { setZoom(0.85); setPanOffset({ x: 0, y: 0 }); }} title="Fit page (⌘0)" style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Maximize2 size={12} /></button>
          </div>

          {/* Right-click context menu */}
          {contextMenu && (
            <>
              <div onClick={() => setContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
              <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 201, backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: 190, overflow: 'hidden' }}>
                {[
                  { label: 'Preview BOM', action: () => { setRightTab('assembly'); setContextMenu(null); } },
                  { label: 'Replace assembly', action: () => { setShowAssemblyPanel(true); setContextMenu(null); } },
                  { label: 'Isolate symbol', action: () => { setDimBackground(true); setContextMenu(null); toast.info('Background dimmed — other symbols hidden.'); } },
                  { label: 'Continue counting', action: () => { setActiveTool('count'); setContextMenu(null); } },
                  { label: 'Swap assembly across group', action: () => { setShowAssemblyPanel(true); setContextMenu(null); toast.info('Select replacement assembly to swap across group.'); } },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    style={{ display: 'block', width: '100%', padding: '8px 14px', fontSize: 12, color: '#111827', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Active tool indicator */}
          {(activeTool === 'count' || activeTool === 'linear' || activeTool === 'box-count') && (
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111827', color: 'white', borderRadius: 6, padding: '5px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              {activeTool === 'count' ? <><Hash size={12} /> Click to place count marker</> : activeTool === 'box-count' ? <><Square size={12} /> Drag a box to count symbols inside</> : <><Pen size={12} /> Click to add points · Double-click or Enter to finish</>}
              <button onClick={() => setActiveTool('select')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 3, padding: '1px 6px', cursor: 'pointer', color: 'white', fontSize: 10, marginLeft: 4 }}>Esc</button>
            </div>
          )}

          {/* Linear in-progress info */}
          {linearInProgress.length > 0 && activeTool === 'linear' && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', fontSize: 11, color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{linearInProgress.length} pts</span>
              <span style={{ color: '#9CA3AF' }}>·</span>
              <span>Enter to finish</span>
              <button onClick={() => setLinearInProgress(pts => pts.slice(0, -1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, fontSize: 10 }}>Undo last point</button>
            </div>
          )}
        </div>

        <RightInspector
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(v => !v)}
          tab={rightTab}
          onTabChange={setRightTab}
          selectedMarker={selectedMarker}
          selectedPath={(!selectedMarker && selectedPath) ? selectedPath : null}
          markers={markers}
          onMarkerUpdate={(id, patch) => setMarkers(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m))}
          onChangeAssembly={() => setShowAssemblyPanel(true)}
        />
      </div>

      <StatusBar
        activePage={activePageIdx}
        zoom={zoom}
        selectedCount={selectedIds.length}
        snapEnabled={snapEnabled}
        demoState={demoState}
        pages={pages}
      />

      {/* Demo state switcher */}
      <div style={{ position: 'fixed', bottom: 42, left: 16, backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 60 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Demo state</span>
        <select
          value={demoState}
          onChange={e => setDemoState(e.target.value as WorkspaceDemo)}
          style={{ border: '1px solid #E5E7EB', borderRadius: 4, padding: '2px 4px', fontSize: 10, color: '#374151', cursor: 'pointer', outline: 'none', maxWidth: 140 }}
        >
          <option value="default">Default</option>
          <option value="count-active">Count tool active</option>
          <option value="linear-active">Linear tool active</option>
          <option value="selected-count">Count marker selected</option>
          <option value="selected-linear">Linear path selected</option>
          <option value="collapsed-panels">Collapsed panels</option>
          <option value="missing-scale">Missing scale warning</option>
          <option value="offline">Offline state</option>
          <option value="save-failure">Save failure</option>
          <option value="loading">Loading drawing</option>
          <option value="corrupted">Corrupted drawing</option>
        </select>
      </div>

      {/* Assembly panel overlay */}
      <AssemblyPanel
        isOpen={showAssemblyPanel}
        onClose={() => setShowAssemblyPanel(false)}
        onSelectAssembly={(name, id) => {
          if (selectedMarker) {
            setMarkers(ms => ms.map(m => m.id === selectedMarker.id ? { ...m, assembly: name, assemblyId: id } : m));
          }
          setShowAssemblyPanel(false);
        }}
      />

      {/* Modals */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showCalibration && (
        <ScaleCalibrationModal
          pageNum={pages[activePageIdx]?.num ?? 'E-101'}
          isRequired={pendingTool !== null}
          onClose={() => { setShowCalibration(false); setPendingTool(null); }}
          onConfirm={(scale, applyAll, isSubPageScale) => {
            setPages(ps => ps.map((p, i) => {
              if (isSubPageScale && pages[activePageIdx] && p.id === pages[activePageIdx].id) return { ...p, scale };
              if (applyAll && !p.isSubPage) return { ...p, scale };
              if (i === activePageIdx) return { ...p, scale };
              return p;
            }));
            if (pendingTool) {
              setActiveTool(pendingTool);
              setPendingTool(null);
            }
            setShowCalibration(false);
            toast.success(`Scale set to ${scale}${applyAll ? ' for all sheets' : ''}`);
          }}
        />
      )}

      {/* Fullscreen viewer */}
      {showFullscreen && pages[activePageIdx] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'white' }}>{pages[activePageIdx].num}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{pages[activePageIdx].title}</span>
            {pages[activePageIdx].scale && <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>Scale {pages[activePageIdx].scale}</span>}
            <button onClick={() => setShowFullscreen(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              <Minimize2 size={11} /> Exit fullscreen
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <FloorPlan />
          </div>
        </div>
      )}
    </div>
  );
}
