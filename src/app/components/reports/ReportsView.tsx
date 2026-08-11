import React, { useState } from 'react';
import {
  Download, Filter, Calendar, TrendingUp, TrendingDown, BarChart2,
  FileText, Package, Clock, DollarSign, Users, Award, ChevronDown, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType =
  | 'bid-pipeline' | 'bom' | 'labour' | 'cost-summary'
  | 'win-loss' | 'margin-analysis' | 'material-spend' | 'labour-productivity'
  | 'project-cashflow' | 'supplier-performance' | 'team-workload'
  | 'estimate-accuracy' | 'quote-conversion' | 'tax-summary' | 'executive';

interface ReportDef {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

// ─── Report registry ──────────────────────────────────────────────────────────

const REPORTS: ReportDef[] = [
  { id: 'bid-pipeline',        label: 'Bid pipeline',          description: 'Active bids by stage with total value and win probability.', icon: <TrendingUp size={14} />, category: 'Sales' },
  { id: 'win-loss',            label: 'Win/Loss analysis',     description: 'Win rate, lost reasons, and competitor analysis.', icon: <Award size={14} />, category: 'Sales' },
  { id: 'quote-conversion',    label: 'Quote conversion',      description: 'Quote-to-win funnel with conversion rate over time.', icon: <TrendingUp size={14} />, category: 'Sales' },
  { id: 'executive',           label: 'Executive summary',     description: 'High-level KPIs: revenue, margin, pipeline.', icon: <BarChart2 size={14} />, category: 'Sales' },
  { id: 'bom',                 label: 'Bill of materials',     description: 'Full BOM for a project or estimate with quantities and unit prices.', icon: <Package size={14} />, category: 'Estimating' },
  { id: 'cost-summary',        label: 'Cost summary',          description: 'Material, labour, direct costs, and margin breakdown per project.', icon: <DollarSign size={14} />, category: 'Estimating' },
  { id: 'margin-analysis',     label: 'Margin analysis',       description: 'Gross and net margin by project, client, or discipline.', icon: <TrendingDown size={14} />, category: 'Estimating' },
  { id: 'estimate-accuracy',   label: 'Estimate accuracy',     description: 'Estimated vs. actual cost variance across completed projects.', icon: <BarChart2 size={14} />, category: 'Estimating' },
  { id: 'labour',              label: 'Labor report',          description: 'Hours by crew type, project, and task with productivity ratios.', icon: <Clock size={14} />, category: 'Labor' },
  { id: 'labour-productivity', label: 'Labor productivity',    description: 'Hours per unit vs. standard rates by assembly type.', icon: <TrendingUp size={14} />, category: 'Labor' },
  { id: 'team-workload',       label: 'Team workload',         description: 'Estimated vs. scheduled hours by team member.', icon: <Users size={14} />, category: 'Labor' },
  { id: 'material-spend',      label: 'Material spend',        description: 'Material purchases by supplier, category, and period.', icon: <Package size={14} />, category: 'Procurement' },
  { id: 'supplier-performance',label: 'Supplier performance',  description: 'Supplier pricing accuracy, lead times, and quote turnaround.', icon: <BarChart2 size={14} />, category: 'Procurement' },
  { id: 'project-cashflow',    label: 'Project cashflow',      description: 'Invoiced, received, and outstanding amounts over project timeline.', icon: <DollarSign size={14} />, category: 'Finance' },
  { id: 'tax-summary',         label: 'Tax summary',           description: 'Sales tax collected and payable per period.', icon: <FileText size={14} />, category: 'Finance' },
];

// ─── Chart data ───────────────────────────────────────────────────────────────

const PIPELINE_DATA = [
  { month: 'Feb', won: 142000, lost: 68000, pending: 95000 },
  { month: 'Mar', won: 178000, lost: 55000, pending: 120000 },
  { month: 'Apr', won: 195000, lost: 72000, pending: 88000 },
  { month: 'May', won: 163000, lost: 91000, pending: 142000 },
  { month: 'Jun', won: 221000, lost: 48000, pending: 165000 },
  { month: 'Jul', won: 84000,  lost: 32000, pending: 298000 },
];

const MARGIN_DATA = [
  { name: 'Dollar Tree', material: 44, labour: 31, overhead: 12, profit: 13 },
  { name: 'Shopify HQ', material: 38, labour: 35, overhead: 12, profit: 15 },
  { name: 'RBC Branch', material: 51, labour: 26, overhead: 12, profit: 11 },
  { name: 'IKEA TI',    material: 42, labour: 32, overhead: 12, profit: 14 },
  { name: 'Desjardins', material: 35, labour: 38, overhead: 12, profit: 15 },
];

const WIN_LOSS_DATA = [
  { name: 'Won', value: 62, color: '#16A34A' },
  { name: 'Lost — price', value: 18, color: '#DC2626' },
  { name: 'Lost — scope', value: 9, color: '#F87171' },
  { name: 'No decision', value: 11, color: '#E5E7EB' },
];

const CASHFLOW_DATA = [
  { month: 'May', invoiced: 88000, received: 72000, outstanding: 16000 },
  { month: 'Jun', invoiced: 142000, received: 130000, outstanding: 28000 },
  { month: 'Jul', invoiced: 54000, received: 38000, outstanding: 70000 },
];

const LABOUR_DATA = [
  { week: 'W25', estimated: 180, actual: 188 },
  { week: 'W26', estimated: 240, actual: 228 },
  { week: 'W27', estimated: 195, actual: 210 },
  { week: 'W28', estimated: 310, actual: 296 },
  { week: 'W29', estimated: 260, actual: 0 },
];

function money(v: number, compact = false) {
  if (compact) return v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
  return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, change, changeDir, sub }: { label: string; value: string; change?: string; changeDir?: 'up' | 'down'; sub?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>{value}</div>
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: 11, color: changeDir === 'up' ? '#16A34A' : '#DC2626' }}>
          {changeDir === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change} vs last period
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Report content renderers ─────────────────────────────────────────────────

function BidPipelineReport() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total pipeline" value="$983K" change="+18%" changeDir="up" />
        <KpiCard label="Active bids" value="14" sub="5 due this week" />
        <KpiCard label="Win rate (YTD)" value="62%" change="+4pp" changeDir="up" />
        <KpiCard label="Avg bid size" value="$70K" change="+12%" changeDir="up" />
      </div>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Bid activity — last 6 months</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={PIPELINE_DATA} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, true)} />
            <Tooltip formatter={(v: number) => [money(v), '']} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar key="won"     dataKey="won"     name="Won"     fill="#16A34A" radius={[3, 3, 0, 0]} />
            <Bar key="lost"    dataKey="lost"    name="Lost"    fill="#FECACA" radius={[3, 3, 0, 0]} />
            <Bar key="pending" dataKey="pending" name="Pending" fill="#BFDBFE" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Pipeline table */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#374151' }}>Active bids</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Project', 'Client', 'Value', 'Stage', 'Due', 'Win prob.'].map((h) => (
                <th key={h} style={{ padding: '7px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { project: 'Dollar Tree #1842', client: 'Dollar Tree', value: 11840, stage: 'Quoting', due: '2026-07-20', prob: 70 },
              { project: 'Shopify HQ Phase 2', client: 'Shopify', value: 84200, stage: 'Estimate', due: '2026-07-28', prob: 55 },
              { project: 'RBC Westmount Branch', client: 'RBC', value: 52300, stage: 'Bid', due: '2026-08-05', prob: 40 },
              { project: 'Desjardins Laval', client: 'Desjardins', value: 37600, stage: 'Takeoff', due: '2026-08-12', prob: 60 },
              { project: 'IKEA Boucherville', client: 'IKEA', value: 147000, stage: 'RFQ Review', due: '2026-07-31', prob: 30 },
            ].map((row) => (
              <tr key={row.project} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#111827' }}>{row.project}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280' }}>{row.client}</td>
                <td style={{ padding: '9px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#111827' }}>{money(row.value)}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 9999, background: '#EFF6FF', color: '#1D4ED8' }}>{row.stage}</span>
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#6B7280', fontFamily: 'IBM Plex Mono, monospace' }}>{row.due}</td>
                <td style={{ padding: '9px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: '#E5E7EB', borderRadius: 9999 }}>
                      <div style={{ height: '100%', borderRadius: 9999, width: `${row.prob}%`, background: row.prob >= 60 ? '#16A34A' : row.prob >= 40 ? '#D97706' : '#DC2626' }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', width: 32, textAlign: 'right', color: '#374151' }}>{row.prob}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WinLossReport() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Win rate" value="62%" change="+4pp" changeDir="up" />
        <KpiCard label="Quotes sent (YTD)" value="34" sub="21 won, 13 lost" />
        <KpiCard label="Avg time to decision" value="18 days" change="-3d" changeDir="up" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Outcome breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie key="pie" data={WIN_LOSS_DATA} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {WIN_LOSS_DATA.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, '']} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {WIN_LOSS_DATA.map(({ name, value, color }) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ color: '#374151' }}>{name}</span>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#111827' }}>{value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Loss reasons</div>
          {[
            { reason: 'Price too high', count: 7, pct: 54 },
            { reason: 'Scope mismatch', count: 3, pct: 23 },
            { reason: 'Timeline',       count: 2, pct: 15 },
            { reason: 'Other',          count: 1, pct: 8 },
          ].map(({ reason, count, pct }) => (
            <div key={reason} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                <span style={{ color: '#374151' }}>{reason}</span>
                <span style={{ color: '#6B7280' }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 5, background: '#F3F4F6', borderRadius: 9999 }}>
                <div style={{ height: '100%', borderRadius: 9999, width: `${pct}%`, background: '#DC2626' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabourReport() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total hrs (YTD)" value="1,842 h" change="+12%" changeDir="up" />
        <KpiCard label="Productivity index" value="1.03×" change="+0.04" changeDir="up" sub="vs. 1.0× standard" />
        <KpiCard label="Avg hourly rate" value="$85.40" change="+2%" changeDir="up" />
        <KpiCard label="Overtime %" value="4.2%" change="-1.1pp" changeDir="up" />
      </div>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Estimated vs. actual hours (weekly)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={LABOUR_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line key="est" type="monotone" dataKey="estimated" name="Estimated" stroke="#BFDBFE" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            <Line key="act" type="monotone" dataKey="actual" name="Actual" stroke="#2563EB" strokeWidth={2} dot={{ r: 4, fill: '#2563EB' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MarginReport() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Avg gross margin" value="13.4%" change="+1.2pp" changeDir="up" />
        <KpiCard label="Best project" value="15.4%" sub="Shopify HQ Phase 2" />
        <KpiCard label="Below target (<10%)" value="2 projects" sub="Requires review" />
      </div>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Cost composition by project (%)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MARGIN_DATA} layout="vertical" barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={100} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar key="material" dataKey="material" name="Material" fill="#BFDBFE" stackId="a" />
            <Bar key="labour"   dataKey="labour"   name="Labor"    fill="#BBF7D0" stackId="a" />
            <Bar key="overhead" dataKey="overhead" name="Overhead" fill="#FDE68A" stackId="a" />
            <Bar key="profit"   dataKey="profit"   name="Profit"   fill="#16A34A" stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GenericReport({ report }: { report: ReportDef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12, color: '#9CA3AF' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {React.cloneElement(report.icon as React.ReactElement, { size: 20, color: '#6B7280' })}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{report.label}</div>
      <div style={{ fontSize: 12, color: '#9CA3AF', maxWidth: 280, textAlign: 'center' }}>{report.description}</div>
      <button style={{ height: 32, padding: '0 16px', border: 'none', background: '#2563EB', borderRadius: 7, fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer' }}>
        Generate report
      </button>
    </div>
  );
}

// ─── Main ReportsView ─────────────────────────────────────────────────────────

export function ReportsView() {
  const [activeReport, setActiveReport] = useState<ReportType>('bid-pipeline');
  const [dateRange, setDateRange] = useState('ytd');

  const report = REPORTS.find((r) => r.id === activeReport)!;
  const categories = Array.from(new Set(REPORTS.map((r) => r.category)));

  function renderReport() {
    switch (activeReport) {
      case 'bid-pipeline': return <BidPipelineReport />;
      case 'win-loss':     return <WinLossReport />;
      case 'labour':       return <LabourReport />;
      case 'margin-analysis': return <MarginReport />;
      default: return <GenericReport report={report} />;
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#F6F7F9' }}>
      {/* Left sidebar: report list */}
      <div style={{ width: 220, minWidth: 220, background: 'white', borderRight: '1px solid #E5E7EB', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reports</div>
        {categories.map((cat) => (
          <div key={cat}>
            <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</div>
            {REPORTS.filter((r) => r.category === cat).map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: activeReport === r.id ? '#EFF6FF' : 'transparent',
                  color: activeReport === r.id ? '#1D4ED8' : '#374151',
                  borderRight: activeReport === r.id ? '2px solid #2563EB' : '2px solid transparent',
                }}
              >
                <span style={{ color: activeReport === r.id ? '#2563EB' : '#9CA3AF' }}>{r.icon}</span>
                <span style={{ fontSize: 12, fontWeight: activeReport === r.id ? 600 : 400 }}>{r.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Right: report content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Report toolbar */}
        <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{report.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{report.description}</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Date range */}
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ height: 30, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: 'white', outline: 'none' }}>
            <option value="mtd">Month to date</option>
            <option value="qtd">Quarter to date</option>
            <option value="ytd">Year to date</option>
            <option value="custom">Custom range</option>
          </select>
          <button style={{ height: 30, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} /> Filters
          </button>
          <button style={{ height: 30, width: 30, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={12} color="#6B7280" />
          </button>
          <button style={{ height: 30, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> Export
          </button>
        </div>

        {/* Report body */}
        <div style={{ flex: 1, padding: 20 }}>
          {renderReport()}
        </div>
      </div>
    </div>
  );
}
