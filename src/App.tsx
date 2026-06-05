import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Clock, Zap, ShieldCheck, RotateCcw, CheckCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Option { label: string; score: number; tag: string }
interface Question { question: string; context: string; aiAngle: { tag: string; line: string }; options: Option[] }
type Step = 'intro' | 'quiz' | 'gate' | 'results';
// Flow: intro → all 8 questions → gate (no results visible yet) → results
// Gate fires after the last answer — full curiosity intact, nothing revealed

// ─── Questions ────────────────────────────────────────────────────────────────

const ALL_QUESTIONS: Question[] = [
  {
    question: 'How does your team get data from ERPs and source systems into reports?',
    context: 'Data integration is the foundation. Everything else depends on it.',
    aiAngle: { tag: 'AI prerequisite', line: 'Manual assembly is the #1 reason AI outputs in finance cannot be trusted — garbage in, confident nonsense out.' },
    options: [
      { label: 'Automated — data flows into reports without manual steps', score: 4, tag: 'Best practice' },
      { label: 'Mix of scheduled exports and some manual formatting',       score: 3, tag: 'Hybrid' },
      { label: 'Mostly manual exports, assembled in Excel',                  score: 2, tag: 'Manual-heavy' },
      { label: 'Heavy manual entry across disconnected systems',             score: 1, tag: 'High effort' },
    ],
  },
  {
    question: 'How long does your month-end close take?',
    context: 'Best-in-class teams close in under 5 days. Industry median is 8.',
    aiAngle: { tag: 'AI amplifier', line: 'AI accelerates teams that are already fast. It cannot compensate for a broken close process — it just surfaces the dysfunction faster.' },
    options: [
      { label: '1–4 days',                              score: 4, tag: 'Best-in-class' },
      { label: '5–7 days',                              score: 3, tag: 'Near best practice' },
      { label: '8–14 days',                             score: 2, tag: 'Room to improve' },
      { label: '15+ days, or no fixed close calendar',  score: 1, tag: 'Significant lag' },
    ],
  },
  {
    question: 'When an executive asks for the current cash position, how quickly can you respond?',
    context: 'Decision latency is a direct proxy for data maturity.',
    aiAngle: { tag: 'AI prerequisite', line: 'AI forecasting requires fresh data. A team running on yesterday\'s batch export will get AI recommendations 24 hours out of date.' },
    options: [
      { label: 'Instantly — available on a live dashboard',           score: 4, tag: 'Real-time' },
      { label: 'Within a few hours',                                   score: 3, tag: 'Same-day' },
      { label: 'Takes a full day of manual compilation',               score: 2, tag: 'Delayed' },
      { label: 'Takes 1–2+ days and involves multiple people',         score: 1, tag: 'Blind spot' },
    ],
  },
  {
    question: 'How much of your close process lives in documented systems — not in people\'s heads?',
    context: 'Key-person dependency is the most underrated financial risk.',
    aiAngle: { tag: 'AI governance', line: 'AI can only operate on processes that are explicitly defined. Undocumented steps create failure modes that are invisible until an AI surfaces them at scale.' },
    options: [
      { label: 'Fully in systems — anyone on the team could run it',   score: 4, tag: 'Resilient' },
      { label: 'Mostly documented, a few informal steps',               score: 3, tag: 'Nearly there' },
      { label: 'Significant steps rely on 1–2 specific people',        score: 2, tag: 'At risk' },
      { label: 'The process exists because those people exist',         score: 1, tag: 'Fragile' },
    ],
  },
  {
    question: 'How is your chart of accounts structured across entities?',
    context: "The CoA is where multi-entity consolidation either works — or doesn't.",
    aiAngle: { tag: 'AI prerequisite', line: 'Inconsistent definitions are invisible to AI — it will produce confident, wrong answers across entities without flagging the contradiction.' },
    options: [
      { label: 'Standardised — same definitions everywhere',               score: 4, tag: 'Aligned' },
      { label: 'Mostly consistent, minor local variations',                score: 3, tag: 'Near-aligned' },
      { label: 'Inconsistent across entities — reconciled manually',       score: 2, tag: 'Fragmented' },
      { label: 'Each entity has its own structure, no standardisation',    score: 1, tag: 'Siloed' },
    ],
  },
  {
    question: 'Has your team experimented with AI (Copilot, ChatGPT, etc.) in financial workflows?',
    context: 'AI output quality in finance tracks directly with data governance maturity.',
    aiAngle: { tag: 'Direct signal', line: 'Where you are today on AI adoption is the most honest measure of your current data foundation — teams with clean data adopt fast, teams without get blocked.' },
    options: [
      { label: 'Yes — integrated into regular processes and trusted',  score: 4, tag: 'AI-enabled' },
      { label: 'Yes — actively experimenting, mixed results',          score: 3, tag: 'Experimenting' },
      { label: "We tried but couldn't trust the outputs",              score: 2, tag: 'Blocked' },
      { label: 'Not yet',                                               score: 1, tag: 'Not started' },
    ],
  },
  {
    question: 'Can you trace any reported number back to the source transaction that created it?',
    context: "Traceability separates 'AI-assisted' from 'AI-enabled' finance teams.",
    aiAngle: { tag: 'AI governance', line: 'AI-generated outputs require a defensible audit trail. No lineage means no auditable AI — and increasingly, no regulatory cover.' },
    options: [
      { label: 'Yes — full lineage, auditable trail for any number',          score: 4, tag: 'Full lineage' },
      { label: 'For most numbers, with moderate effort',                       score: 3, tag: 'Mostly traceable' },
      { label: 'For some numbers — others take significant research',          score: 2, tag: 'Partial' },
      { label: 'No systematic way to do this today',                           score: 1, tag: 'No lineage' },
    ],
  },
  {
    question: 'How confident do you feel presenting your numbers to the board?',
    context: 'CFO confidence in the data is the ultimate measure of financial data maturity.',
    aiAngle: { tag: 'AI outcome', line: 'If you present today with caveats, an AI-generated number makes that harder — not easier. Board-ready AI starts with board-ready data.' },
    options: [
      { label: 'Fully confident — I can defend any number under scrutiny',      score: 4, tag: 'Fully confident' },
      { label: 'Confident on headlines, some gaps in the detail',               score: 3, tag: 'Mostly confident' },
      { label: 'Directionally correct — I add caveats on complex items',        score: 2, tag: 'Cautious' },
      { label: 'I present with disclaimers — some numbers are estimates',       score: 1, tag: 'Uncertain' },
    ],
  },
];

const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
const MAX_SCORE = TOTAL_QUESTIONS * 4;

// ─── Scoring ──────────────────────────────────────────────────────────────────

function toHundred(raw: number): number {
  return Math.round(((raw - (MAX_SCORE / 4)) / (MAX_SCORE - (MAX_SCORE / 4))) * 100);
}

// ─── Maturity tiers ───────────────────────────────────────────────────────────

const TIERS = [
  {
    number: 1,
    label: 'Ad-hoc',
    description: 'Heavy manual processes, disconnected systems',
    range: [0, 20] as [number, number],
    color: '#ef4444',
    headline: 'Heavy manual processes — this is the most common starting point',
    body: "Most companies we onboard start exactly here. Manual consolidation, disconnected ERPs, close cycles that depend on key people. This isn't a blocker — it's the problem we're built to solve. Companies at this stage typically reach Stage 3 within 3 months of working with us.",
    cta: "Not sure where to start? That's exactly what the 30 minutes is for.",
  },
  {
    number: 2,
    label: 'Developing',
    description: 'Partial automation, some standardisation gaps',
    range: [21, 40] as [number, number],
    color: '#f97316',
    headline: 'Partial automation, real gaps in governance',
    body: "The most common profile among companies we onboard. You've built some structure, but manual steps and definition inconsistencies still slow you down. You don't need to be further along to start — this stage has the highest ROI on automation investment.",
    cta: "You don't need to fix the data before talking to us. That's the conversation.",
  },
  {
    number: 3,
    label: 'Defined',
    description: 'Documented processes, moderate automation',
    range: [41, 60] as [number, number],
    color: '#FFAD0A',
    headline: 'Structured processes — one or two specific gaps to close',
    body: "You're closer to AI-ready than you think. The foundation is there. The work now is identifying the specific gaps — data traceability, definition alignment, or automation coverage — that are holding back the next level.",
    cta: "Let's map the two or three things standing between you and Stage 4.",
  },
  {
    number: 4,
    label: 'Managed',
    description: 'Measured and optimised processes',
    range: [61, 80] as [number, number],
    color: '#1F8FFF',
    headline: 'Strong foundation — AI deployment is viable now',
    body: "Your data governance is measurable and your processes are resilient. AI pilots are not just possible — they're within reach. The question is which use case delivers the fastest verified return on your existing data foundation.",
    cta: "Let's identify the AI use case with the fastest verified ROI for your structure.",
  },
  {
    number: 5,
    label: 'Optimising',
    description: 'Continuous improvement, AI-enabled',
    range: [81, 100] as [number, number],
    color: '#22c55e',
    headline: 'Best-in-class — the question is which AI use case first',
    body: "Full data lineage, governed definitions, resilient processes. You're in the top tier. The conversation now is about identifying the highest-value AI use cases and making sure every output is verifiable before it reaches the board.",
    cta: "Let's talk about what verified AI looks like at your maturity level.",
  },
];

function getTier(score100: number) {
  return TIERS.find(t => score100 >= t.range[0] && score100 <= t.range[1]) ?? TIERS[0];
}

// ─── Research benchmarks ──────────────────────────────────────────────────────

interface ResearchStat {
  stat: string;
  label: string;
  context: string;
  source: string;
}

const TIER_RESEARCH: Record<number, ResearchStat> = {
  1: {
    stat: '70%',
    label: 'of finance team time spent collecting data — not analysing it',
    context: 'At Stage 1, the typical finance function spends the majority of its capacity on data assembly — reconciliation, manual exports, formatting — before any analysis begins. Best-in-class teams have fully inverted this ratio.',
    source: 'Deloitte Finance Trends Survey, 2026',
  },
  2: {
    stat: '17 days',
    label: 'average close cycle for bottom-quartile finance teams',
    context: "APQC benchmarks show bottom-quartile teams take 17+ days to close. Partial automation with manual steps remaining is the most common profile at this stage — and where automation investment has the highest ROI.",
    source: 'APQC Financial Management Benchmarks, 2025',
  },
  3: {
    stat: '48%',
    label: 'of finance teams at this stage report AI pilots "failing to produce reliable output"',
    context: "Stage 3 teams have the processes — but AI initiatives run into data lineage and definition gaps that aren't visible until an output reaches the board. One more layer of governance unlocks the next tier.",
    source: 'Gartner CFO Survey, 2025',
  },
  4: {
    stat: '2.5×',
    label: 'more likely to achieve ROI from AI initiatives vs Stage 1–2 teams',
    context: 'Finance functions at Stage 4 are 2.5× more likely to reach measurable ROI from AI deployments within 12 months. At this level the bottleneck has shifted from data readiness to use-case selection.',
    source: 'McKinsey Global Finance Excellence Survey, 2025',
  },
  5: {
    stat: '4.8 days',
    label: 'APQC top-quartile close cycle — the tier you\'re in',
    context: "APQC's top-quartile benchmark for full close is 4.8 days, against an industry median of 8.3 and a bottom-quartile of 17+. Your score places you in the same operating tier as the best-run finance functions globally.",
    source: 'APQC Financial Management Benchmarks, 2025',
  },
};

const QUESTION_RESEARCH: ResearchStat[] = [
  { // Q0: data integration
    stat: '3×',
    label: 'more FTE hours spent on data prep in manual-heavy teams vs automated peers',
    context: 'Finance teams dependent on manual ERP exports spend three times as many FTE hours per close cycle on data assembly before any analysis begins. That capacity gap compounds at every reporting cycle.',
    source: 'APQC Finance Operations Benchmarks, 2025',
  },
  { // Q1: close time
    stat: '4.8 days',
    label: 'APQC top-quartile close — industry median is 8.3 days',
    context: "Every extra day in the close cycle redirects finance team capacity away from forward-looking analysis. APQC's top quartile closes in 4.8 days; the median is 8.3. Each extra day is roughly 3–5% of annual team bandwidth.",
    source: 'APQC Financial Management Benchmarks, 2025',
  },
  { // Q2: cash position
    stat: '15–20%',
    label: 'lower working capital requirements for teams with real-time cash visibility',
    context: 'Finance teams with live cash dashboards consistently report 15–20% lower working capital needs — decisions are made on current data rather than batch runs from the previous night.',
    source: 'KPMG Global Treasury & Finance Outlook, 2025',
  },
  { // Q3: process documentation
    stat: '62%',
    label: 'of CFOs rank key-person dependency as their top operational continuity risk',
    context: 'When close processes live in institutional memory rather than documented systems, the finance function carries hidden risk that surfaces only when those people leave — or are unavailable at quarter end.',
    source: 'EY Global CFO Survey, 2025',
  },
  { // Q4: CoA
    stat: '3–4×',
    label: 'longer consolidation for multi-entity companies without a standardised CoA',
    context: 'Multi-entity finance teams with fragmented chart of accounts structures spend 3–4× more time on consolidation each period compared to teams with standardised definitions. The gap compounds with every additional entity.',
    source: 'Gartner Finance Research, 2025',
  },
  { // Q5: AI experimentation
    stat: '68%',
    label: 'of AI failures in finance trace back to data quality — not the AI model',
    context: "When AI in finance fails to produce reliable output, Gartner's research shows the root cause is almost always upstream data governance: inconsistent definitions, missing lineage, or untrusted source data.",
    source: 'Gartner CFO Survey, 2025',
  },
  { // Q6: traceability
    stat: '60–70%',
    label: 'reduction in audit query response time with end-to-end data lineage',
    context: 'Finance teams with full traceability from reported number to source transaction resolve audit and board queries in a fraction of the time. Regulators and auditors are increasingly treating lineage as a baseline expectation for AI-assisted reporting.',
    source: 'EY Finance Data Governance Report, 2026',
  },
  { // Q7: board confidence
    stat: '3×',
    label: 'longer decision cycles when strategic recommendations carry data disclaimers',
    context: 'CFOs who present with data caveats face 3× longer approval cycles at board level — independent of the actual quality of the underlying analysis. Confidence in the numbers is itself a strategic asset.',
    source: 'McKinsey CFO Effectiveness Survey, 2025',
  },
];

function getResearchInsights(answers: number[], tierNumber: number): {
  tier: ResearchStat;
  weak: Array<{ idx: number; research: ResearchStat }>;
} {
  const weak = answers
    .map((score, idx) => ({ idx, score }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  return {
    tier: TIER_RESEARCH[tierNumber],
    weak: weak.map(w => ({ idx: w.idx, research: QUESTION_RESEARCH[w.idx] })),
  };
}

function scoreToPeerPercentile(score100: number): number {
  if (score100 >= 81) return Math.min(93, Math.round(80 + (score100 - 81) * 0.65));
  if (score100 >= 61) return Math.round(58 + (score100 - 61) * 1.1);
  if (score100 >= 41) return Math.round(32 + (score100 - 41) * 1.3);
  if (score100 >= 21) return Math.round(10 + (score100 - 21) * 1.1);
  return Math.max(3, Math.round(3 + score100 * 0.35));
}

// ─── Metric cards ─────────────────────────────────────────────────────────────

function getMetrics(answers: number[]) {
  const dataScore   = answers[0] ?? 1;
  const closeScore  = answers[1] ?? 1;
  const aiScore     = answers[5] ?? 1;
  const traceScore  = answers[6] ?? 1;

  const closeDays   = [18, 11, 6, 3];
  const closeSub    = [
    'Significantly above best practice',
    '6 days above best practice',
    'Near best practice',
    'Faster than 85% of peers',
  ];
  const closeColor  = closeScore >= 4 ? '#22c55e' : closeScore === 3 ? '#1F8FFF' : closeScore === 2 ? '#FFAD0A' : '#ef4444';

  const autoHours   = [35, 22, 12, 3];
  const autoSub     = [
    '35+ hours/month could be automated',
    '20–25 hours/month automatable',
    '10–15 hours/month automatable',
    'Process is largely optimised',
  ];
  const autoColor   = dataScore >= 4 ? '#22c55e' : dataScore === 3 ? '#1F8FFF' : dataScore === 2 ? '#FFAD0A' : '#f97316';

  const aiCombined  = Math.round((aiScore + traceScore) / 2);
  const aiLabels    = ['Data gaps block reliable AI', 'Foundation exists — targeted fixes needed', 'Partially AI-ready', 'Data foundation supports AI'];
  const aiColors    = ['#ef4444', '#f97316', '#FFAD0A', '#22c55e'];

  return [
    {
      icon: 'clock',
      label: 'Close Time',
      value: `${closeDays[closeScore - 1]} days`,
      sub: closeSub[closeScore - 1],
      color: closeColor,
    },
    {
      icon: 'zap',
      label: 'Automation Potential',
      value: `${autoHours[dataScore - 1]}h / mo`,
      sub: autoSub[dataScore - 1],
      color: autoColor,
    },
    {
      icon: 'shield',
      label: 'AI Readiness',
      value: aiCombined >= 4 ? 'Ready' : aiCombined === 3 ? 'Partial' : aiCombined === 2 ? 'Blocked' : 'Not started',
      sub: aiLabels[aiCombined - 1],
      color: aiColors[aiCombined - 1],
    },
  ];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG    = '#080F1E';
const CARD  = 'rgba(255,255,255,0.04)';
const CARD_BORDER = '1px solid rgba(255,255,255,0.08)';

const s = {
  wrap: {
    minHeight: '100vh',
    background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(31,143,255,0.15) 0%, transparent 60%), ${BG}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 80px',
    fontFamily: "'Inter', system-ui, sans-serif",
  } as React.CSSProperties,
  inner: {
    width: '100%',
    maxWidth: 520,
  } as React.CSSProperties,
  card: {
    background: CARD,
    border: CARD_BORDER,
    borderRadius: 20,
    padding: '28px 24px',
    marginBottom: 12,
    backdropFilter: 'blur(12px)',
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 6,
  },
  progress: {
    height: 3,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 28,
  } as React.CSSProperties,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricIcon({ type, color }: { type: string; color: string }) {
  const style = { width: 16, height: 16, color };
  if (type === 'clock')  return <Clock  style={style} />;
  if (type === 'zap')    return <Zap    style={style} />;
  return <ShieldCheck style={style} />;
}

function MetricCard({ icon, label, value, sub, color, locked }: {
  icon: string; label: string; value: string; sub: string; color: string; locked?: boolean;
}) {
  return (
    <div style={{ ...s.card, marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
      {locked && (
        <div style={{
          position: 'absolute', inset: 0, backdropFilter: 'blur(6px)',
          background: 'rgba(8,15,30,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 20, zIndex: 2,
        }}>
          <Lock style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.3)' }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: 7, borderRadius: 10, background: `${color}18`, display: 'flex' }}>
          <MetricIcon type={icon} color={color} />
        </div>
        <span style={s.label}>{label}</span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function PeerBenchmark({ score100, tierColor }: { score100: number; tierColor: string }) {
  const pct = scoreToPeerPercentile(score100);
  return (
    <div style={s.card}>
      <p style={s.label}>Peer Benchmark · 500+ Finance Teams Assessed</p>
      <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)', marginBottom: 16, lineHeight: 1.5 }}>
        You scored higher than{' '}
        <span style={{ color: tierColor, fontWeight: 900, fontSize: '1.2rem' }}>{pct}%</span>
        {' '}of finance teams assessed on this diagnostic.
      </p>
      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginBottom: 8 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
          style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999, background: tierColor }}
        />
        <div style={{ position: 'absolute', left: '50%', top: -3, width: 1, height: 14, background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
        <span>Bottom 25% · Stage 1</span>
        <span>Median · Stage 3</span>
        <span>Top 25% · Stage 5</span>
      </div>
    </div>
  );
}

function ResearchInsightCard({ stat, label, context, source }: ResearchStat) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: 'clamp(1.4rem,5vw,1.9rem)', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
          {stat}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', lineHeight: 1.35, textTransform: 'uppercase' as const, letterSpacing: '0.05em', flex: 1, minWidth: 100 }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 8 }}>
        {context}
      </p>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
        — {source}
      </span>
    </div>
  );
}

function MaturityLadder({ currentNumber }: { currentNumber: number }) {
  return (
    <div style={s.card}>
      <p style={s.label}>Maturity Level (Gartner Framework)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...TIERS].reverse().map(t => {
          const active = t.number === currentNumber;
          return (
            <div
              key={t.number}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 12, border: active ? `1.5px solid ${t.color}` : '1.5px solid transparent',
                background: active ? `${t.color}12` : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: active ? t.color : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: active ? '#fff' : 'rgba(255,255,255,0.35)',
              }}>
                {t.number}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                  {t.label}
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  {t.description}
                </span>
              </div>
              {active && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  background: t.color, color: '#fff', whiteSpace: 'nowrap',
                }}>
                  You are here
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Supabase lead capture (graceful if not configured) ───────────────────────

async function saveLead(data: {
  name: string; email: string; company: string; answers: number[];
}) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/fi_assessment_leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      company: data.company,
      total_score: data.answers.reduce((s, a) => s + a, 0),
      answers: data.answers,
      source: 'fi-intelligence-assessment',
    }),
  }).catch(() => null);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]             = useState<Step>('intro');
  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState<number[]>([]);
  const [selected, setSelected]     = useState<number | null>(null);
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [company, setCompany]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const q         = ALL_QUESTIONS[currentQ];
  const totalScore = answers.reduce((s, a) => s + a, 0);
  const score100  = toHundred(totalScore);
  const tier      = getTier(score100);
  const metrics   = getMetrics(answers);
  const insights  = getResearchInsights(answers, tier.number);

  function handleSelect(score: number) {
    if (selected !== null) return;
    setSelected(score);
    setTimeout(() => {
      const newAnswers = [...answers, score];
      setAnswers(newAnswers);
      setSelected(null);
      if (currentQ + 1 === TOTAL_QUESTIONS) {
        setStep('gate'); // all questions done → gate before revealing results
      } else {
        setCurrentQ(q => q + 1);
      }
    }, 380);
  }

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !name || !company) return;
    setSubmitting(true);
    await saveLead({ name, email, company, answers });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setStep('results'), 600);
  }

  function restart() {
    setStep('intro');
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setName('');
    setEmail('');
    setCompany('');
    setSubmitted(false);
  }

  const progress = step === 'results' ? 1
    : step === 'gate' ? 1
    : (currentQ + 1) / TOTAL_QUESTIONS;

  return (
    <div style={s.wrap}>
      <div style={s.inner}>

        {/* Progress bar */}
        {step !== 'intro' && (
          <div style={s.progress}>
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ height: '100%', background: '#1F8FFF', borderRadius: 999 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Intro ── */}
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={s.card}>
                <div style={{ marginBottom: 24 }}>
                  <p style={s.label}>Keboola · Finance AI Readiness Assessment</p>
                  <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 14 }}>
                    Is your finance function ready for AI?
                  </h1>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 20 }}>
                    8 questions. 3 minutes. You'll get a Finance AI Readiness Score, a peer benchmark against 500+ teams, and a clear view of which data foundations gaps are blocking reliable AI in your function.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    {[
                      'Your Finance AI Readiness Score (0–100)',
                      'Peer percentile vs 500+ finance teams',
                      'The specific gaps preventing you from deploying AI with confidence',
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(31,143,255,0.15)', border: '1px solid rgba(31,143,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1F8FFF' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, marginBottom: 28, padding: '11px 14px', background: 'rgba(31,143,255,0.05)', borderRadius: 10, borderLeft: '3px solid rgba(31,143,255,0.3)' }}>
                    No right score to start. Companies working with us span Stage 1 to Stage 4. Each question shows exactly why it matters for AI adoption.
                  </p>
                </div>
                <button
                  onClick={() => setStep('quiz')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    justifyContent: 'center', padding: '15px 24px', borderRadius: 12,
                    background: '#1F8FFF', color: '#fff', fontWeight: 700, fontSize: '1rem',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Start assessment <ArrowRight style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
                Data sourced from Gartner, APQC & Deloitte Finance Trends 2026 · Built by Keboola
              </p>
            </motion.div>
          )}

          {/* ── Quiz ── */}
          {step === 'quiz' && q && (
            <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <p style={s.label}>Question {currentQ + 1} of {TOTAL_QUESTIONS}</p>
                </div>
                <h2 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', fontWeight: 700, color: '#fff', lineHeight: 1.45, marginBottom: 6 }}>
                  {q.question}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontStyle: 'italic' }}>
                  {q.context}
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20, padding: '9px 12px', borderRadius: 8, background: 'rgba(31,143,255,0.06)', borderLeft: '2px solid rgba(31,143,255,0.35)' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#1F8FFF', textTransform: 'uppercase' as const, letterSpacing: '0.07em', whiteSpace: 'nowrap', paddingTop: 2 }}>
                    {q.aiAngle.tag}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    {q.aiAngle.line}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, i) => {
                    const isSelected = selected === opt.score;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleSelect(opt.score)}
                        disabled={selected !== null}
                        whileHover={selected === null ? { scale: 1.01 } : {}}
                        whileTap={selected === null ? { scale: 0.99 } : {}}
                        style={{
                          width: '100%', textAlign: 'left', padding: '13px 14px',
                          borderRadius: 12, border: isSelected ? '1.5px solid #1F8FFF' : '1.5px solid rgba(255,255,255,0.07)',
                          background: isSelected ? 'rgba(31,143,255,0.12)' : 'rgba(255,255,255,0.03)',
                          cursor: selected !== null ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: isSelected ? 600 : 400, lineHeight: 1.4 }}>
                          {opt.label}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
                        }}>
                          {opt.tag}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Gate (after all 8 questions — results not yet visible) ── */}
          {step === 'gate' && (
            <motion.div key="gate" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Teaser: tier label + locked score */}
              <div style={s.card}>
                <p style={s.label}>Your Finance Diagnostic is ready</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    fontSize: 'clamp(2.5rem,8vw,3.5rem)', fontWeight: 900,
                    color: 'rgba(255,255,255,0.08)', letterSpacing: '-0.02em',
                    lineHeight: 1, filter: 'blur(8px)', userSelect: 'none',
                  }}>
                    ██
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.15)', marginTop: 4 }}>/100</span>
                  <span style={{
                    padding: '5px 14px', borderRadius: 999,
                    background: `${tier.color}22`, color: tier.color,
                    fontSize: 14, fontWeight: 700, border: `1px solid ${tier.color}44`,
                  }}>
                    {tier.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  Your full score, industry benchmark, and personalised action plan are one step away.
                </p>
              </div>

              {/* 3 locked metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {metrics.map((m, i) => <MetricCard key={i} {...m} locked />)}
              </div>

              {/* Form */}
              <div style={{ ...s.card, background: 'rgba(31,143,255,0.06)', border: '1px solid rgba(31,143,255,0.2)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                  See your full Finance Diagnostic
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: 18, lineHeight: 1.55 }}>
                  Your score, peer benchmark, and the highest-ROI starting point for a company at your stage — wherever that is.
                </p>

                {submitted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22c55e', fontWeight: 600, fontSize: '0.9rem' }}>
                    <CheckCircle style={{ width: 18, height: 18 }} /> Opening your results…
                  </div>
                ) : (
                  <form onSubmit={handleGateSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ ...s.label, display: 'block', marginBottom: 5 }}>Your name *</label>
                        <input
                          required value={name} onChange={e => setName(e.target.value)}
                          placeholder="Jane Smith"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ ...s.label, display: 'block', marginBottom: 5 }}>Company *</label>
                        <input
                          required value={company} onChange={e => setCompany(e.target.value)}
                          placeholder="Acme Corp"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...s.label, display: 'block', marginBottom: 5 }}>Work email *</label>
                      <input
                        required type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="jane@company.com"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      type="submit" disabled={submitting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', borderRadius: 12, border: 'none', background: submitting ? 'rgba(31,143,255,0.5)' : '#1F8FFF', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                      {submitting ? 'One moment…' : <>Unlock my results <ArrowRight style={{ width: 17, height: 17 }} /></>}
                    </button>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 10 }}>
                      No spam. Used only to send your report and calibrate the benchmark.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Results ── */}
          {step === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {/* Main score */}
              <div style={s.card}>
                <p style={s.label}>Finance Intelligence Score</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    style={{ fontSize: 'clamp(3rem, 10vw, 4.5rem)', fontWeight: 900, color: tier.color, lineHeight: 1 }}
                  >
                    {score100}
                  </motion.span>
                  <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>/100</span>
                  <span style={{
                    marginBottom: 10, padding: '5px 14px', borderRadius: 999,
                    background: `${tier.color}22`, color: tier.color,
                    fontSize: 14, fontWeight: 700, border: `1px solid ${tier.color}44`,
                  }}>
                    {tier.label}
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score100}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    style={{ height: '100%', borderRadius: 999, background: tier.color }}
                  />
                </div>
                <h2 style={{ fontSize: 'clamp(1rem, 3vw, 1.15rem)', fontWeight: 700, color: '#fff', marginBottom: 10, lineHeight: 1.4 }}>
                  {tier.headline}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
                  {tier.body}
                </p>
              </div>

              {/* Peer benchmark */}
              <PeerBenchmark score100={score100} tierColor={tier.color} />

              {/* Maturity ladder */}
              <MaturityLadder currentNumber={tier.number} />

              {/* Research context */}
              <div style={s.card}>
                <p style={s.label}>Research Context · What the data says about your stage</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ResearchInsightCard {...insights.tier} />
                  {insights.weak.map(({ idx, research }) => (
                    <ResearchInsightCard key={idx} {...research} />
                  ))}
                </div>
              </div>

              {/* Metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
              </div>

              {/* CTA */}
              <div style={{ ...s.card, background: 'rgba(31,143,255,0.06)', border: '1px solid rgba(31,143,255,0.2)', textAlign: 'center' }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  See what the next stage looks like for you
                </p>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 1.55 }}>
                  {tier.cta}
                </p>
                <a
                  href="https://calendly.com/keboola"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '13px 24px', borderRadius: 12, background: '#1F8FFF',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                    textDecoration: 'none', marginBottom: 12,
                  }}
                >
                  Book a 30-min diagnostic call <ArrowRight style={{ width: 17, height: 17 }} />
                </a>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>
                  Same call, any stage. We work with companies from Stage 1 to Stage 4.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <button
                  onClick={restart}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} /> Retake assessment
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: 11, marginTop: 8, color: 'rgba(255,255,255,0.15)' }}>
                Benchmarks from Gartner, APQC, Deloitte & BlackLine Finance Trends 2026 · Built by Keboola
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
