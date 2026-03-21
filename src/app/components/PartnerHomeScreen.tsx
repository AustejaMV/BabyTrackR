import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Navigation } from './Navigation';
import { useBaby } from '../contexts/BabyContext';
import { formatTimeAndAgo } from '../utils/dateUtils';
import type { SleepRecord, FeedingRecord, DiaperRecord } from '../types';

function loadArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface QuickLogButtonProps {
  icon: React.ReactNode;
  label: string;
  colour: string;
  onClick: () => void;
}

function QuickLogButton({ icon, label, colour, onClick }: QuickLogButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border min-h-[100px]"
      style={{ background: 'var(--card)', borderColor: 'var(--bd)', color: 'var(--tx)' }}
    >
      <span>{icon}</span>
      <span className="text-sm font-medium" style={{ color: colour }}>{label}</span>
    </button>
  );
}

export function PartnerHomeScreen() {
  const { activeBaby } = useBaby();
  const [sleeps, setSleeps] = useState<SleepRecord[]>([]);
  const [feeds, setFeeds] = useState<FeedingRecord[]>([]);
  const [diapers, setDiapers] = useState<DiaperRecord[]>([]);
  const [logAction, setLogAction] = useState<string | null>(null);

  useEffect(() => {
    setSleeps(loadArray<SleepRecord>('sleepHistory'));
    setFeeds(loadArray<FeedingRecord>('feedingHistory'));
    setDiapers(loadArray<DiaperRecord>('diaperHistory'));
  }, []);

  const currentSleep = useMemo(() => {
    return sleeps.find((s) => s.startTime && !s.endTime) ?? null;
  }, [sleeps]);

  const lastFeed = useMemo(() => {
    const sorted = [...feeds].sort((a, b) => (b.timestamp ?? b.startTime ?? 0) - (a.timestamp ?? a.startTime ?? 0));
    return sorted[0] ?? null;
  }, [feeds]);

  const lastDiaper = useMemo(() => {
    const sorted = [...diapers].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0] ?? null;
  }, [diapers]);

  const suggestion = useMemo(() => {
    if (currentSleep) return null;
    const now = Date.now();
    const feedAgo = lastFeed ? now - (lastFeed.timestamp ?? lastFeed.startTime ?? 0) : Infinity;
    const diaperAgo = lastDiaper ? now - lastDiaper.timestamp : Infinity;
    const sleepAgo = sleeps.length > 0
      ? now - Math.max(...sleeps.filter((s) => s.endTime).map((s) => s.endTime!))
      : Infinity;

    if (feedAgo > 3 * 60 * 60 * 1000) return { text: 'Feed might be due soon', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c05030" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6h12v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6z"/><path d="M8 2h8v4H8z"/><path d="M6 12h12"/></svg> };
    if (diaperAgo > 3 * 60 * 60 * 1000) return { text: 'Check nappy', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="1.6" strokeLinecap="round"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M9 6V4M15 6V4"/></svg> };
    if (sleepAgo > 2 * 60 * 60 * 1000) return { text: 'Watch for sleepy cues', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4080a0" strokeWidth="1.6" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg> };
    return { text: 'All good for now', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> };
  }, [currentSleep, lastFeed, lastDiaper, sleeps]);

  const handleQuickLog = (type: string) => {
    setLogAction(type);
    setTimeout(() => setLogAction(null), 2000);

    const now = Date.now();
    const id = crypto.randomUUID();

    if (type === 'feed') {
      const record: FeedingRecord = { id, timestamp: now, type: 'breast' };
      const updated = [record, ...feeds];
      setFeeds(updated);
      try { localStorage.setItem('feedingHistory', JSON.stringify(updated)); } catch {}
    } else if (type === 'sleep') {
      if (currentSleep) {
        const updated = sleeps.map((s) => s.id === currentSleep.id ? { ...s, endTime: now } : s);
        setSleeps(updated);
        try { localStorage.setItem('sleepHistory', JSON.stringify(updated)); } catch {}
      } else {
        const record: SleepRecord = { id, position: 'back', startTime: now };
        const updated = [record, ...sleeps];
        setSleeps(updated);
        try { localStorage.setItem('sleepHistory', JSON.stringify(updated)); } catch {}
      }
    } else if (type === 'diaper') {
      const record: DiaperRecord = { id, type: 'both', timestamp: now };
      const updated = [record, ...diapers];
      setDiapers(updated);
      try { localStorage.setItem('diaperHistory', JSON.stringify(updated)); } catch {}
    }
  };

  const babyName = activeBaby?.name ?? 'Baby';

  const cardClass = 'rounded-[16px] p-4 mb-3 border';
  const cardStyle: React.CSSProperties = { background: 'var(--card)', borderColor: 'var(--bd)' };
  const muStyle: React.CSSProperties = { color: 'var(--mu)' };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--tx)', fontFamily: 'Georgia, serif' }}>
          {babyName}
        </h1>
        <p className="text-[13px] mb-5" style={muStyle}>Partner view</p>

        {/* Right now */}
        <div className={cardClass} style={cardStyle}>
          <h2 className="text-[11px] uppercase tracking-wider mb-3 font-semibold" style={muStyle}>Right now</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px]" style={{ color: 'var(--tx)' }}>Last feed</span>
              <span className="text-[14px] font-medium" style={{ color: 'var(--feed-red)' }}>
                {lastFeed ? formatTimeAndAgo(lastFeed.timestamp ?? lastFeed.startTime ?? 0) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px]" style={{ color: 'var(--tx)' }}>Last nappy</span>
              <span className="text-[14px] font-medium" style={{ color: 'var(--grn)' }}>
                {lastDiaper ? formatTimeAndAgo(lastDiaper.timestamp) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px]" style={{ color: 'var(--tx)' }}>Sleep</span>
              <span className="text-[14px] font-medium" style={{ color: 'var(--sleep-blue)' }}>
                {currentSleep ? 'Sleeping now' : 'Awake'}
              </span>
            </div>
          </div>
        </div>

        {/* Do this next */}
        {suggestion && (
          <div className={cardClass} style={{ ...cardStyle, background: 'var(--hl-bg)' }}>
            <h2 className="text-[11px] uppercase tracking-wider mb-2 font-semibold" style={muStyle}>Do this next</h2>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{suggestion.icon}</span>
              <span className="text-[15px] font-medium" style={{ color: 'var(--tx)' }}>{suggestion.text}</span>
            </div>
          </div>
        )}

        {/* Quick log */}
        <h2 className="text-[11px] uppercase tracking-wider mb-2 font-semibold px-1" style={muStyle}>Quick log</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <QuickLogButton icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--feed-red)" strokeWidth="1.4" strokeLinecap="round"><path d="M6 6h12v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6z"/><path d="M8 2h8v4H8z"/><path d="M6 12h12"/></svg>} label={logAction === 'feed' ? 'Logged!' : 'Nurse'} colour="var(--feed-red)" onClick={() => handleQuickLog('feed')} />
          <QuickLogButton icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sleep-blue)" strokeWidth="1.4" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>} label={currentSleep ? (logAction === 'sleep' ? 'Ended!' : 'End sleep') : (logAction === 'sleep' ? 'Started!' : 'Sleep')} colour="var(--sleep-blue)" onClick={() => handleQuickLog('sleep')} />
          <QuickLogButton icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" strokeWidth="1.4" strokeLinecap="round"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M9 6V4M15 6V4"/></svg>} label={logAction === 'diaper' ? 'Logged!' : 'Nappy'} colour="var(--grn)" onClick={() => handleQuickLog('diaper')} />
          <QuickLogButton icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>} label="All good" colour="var(--grn)" onClick={() => { setLogAction('ok'); setTimeout(() => setLogAction(null), 2000); }} />
        </div>

        {/* Switch to full view */}
        <div className="text-center mt-6">
          <Link to="/settings" className="text-[14px] underline" style={{ color: 'var(--mu)' }}>
            Switch to full view
          </Link>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
