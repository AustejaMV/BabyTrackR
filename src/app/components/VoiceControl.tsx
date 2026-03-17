import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveData, syncDataToServer } from '../utils/dataSync';
import { toast } from 'sonner';
import type { ShoppingItem, FeedingRecord, FeedingSegment } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceCommand =
  | { type: 'START_SLEEP'; position: string }
  | { type: 'STOP_SLEEP' }
  | { type: 'START_FEEDING'; feedType: string }
  | { type: 'STOP_FEEDING' }
  | { type: 'PAUSE_FEEDING' }
  | { type: 'RESUME_FEEDING' }
  | { type: 'START_TUMMY' }
  | { type: 'STOP_TUMMY' }
  | { type: 'LOG_DIAPER'; diaperType: 'pee' | 'poop' | 'both' }
  | { type: 'LOG_PAINKILLER' }
  | { type: 'ADD_SHOPPING'; item: string };

// ─── Command parser ───────────────────────────────────────────────────────────

function parseCommand(raw: string): VoiceCommand | null {
  const text = raw
    .toLowerCase()
    .trim()
    // strip optional wake word prefix
    .replace(/^(hey\s+)?(baby\s*tracker[,.:!?\s]+)/, '')
    .trim();

  // SLEEP
  if (/\b(start|begin|track)\s+sleep\b/.test(text)) {
    let position = 'Back';
    if (/\bleft\b/.test(text)) position = 'Left Side';
    else if (/\bright\b/.test(text)) position = 'Right Side';
    return { type: 'START_SLEEP', position };
  }
  if (/\b(stop|end|wake\s*up)\s+(sleep|sleeping)\b/.test(text)) return { type: 'STOP_SLEEP' };

  // FEEDING
  if (/\b(start|begin)\s+(feeding|feed)\b/.test(text)) {
    let feedType = 'Left breast';
    if (/\bright\s*(breast|side|boob)?\b/.test(text)) feedType = 'Right breast';
    else if (/\bleft\s*(breast|side|boob)?\b/.test(text)) feedType = 'Left breast';
    else if (/\bformula\b/.test(text)) feedType = 'Formula';
    else if (/\bsolid/.test(text)) feedType = 'Solids';
    return { type: 'START_FEEDING', feedType };
  }
  if (/\b(stop|end|finish)\s+(feeding|feed)\b/.test(text)) return { type: 'STOP_FEEDING' };
  if (/\bpause\s+(feeding|feed)\b/.test(text)) return { type: 'PAUSE_FEEDING' };
  if (/\bresume\s+(feeding|feed)\b/.test(text)) return { type: 'RESUME_FEEDING' };

  // TUMMY TIME
  if (/\b(start|begin)\s+tummy/.test(text)) return { type: 'START_TUMMY' };
  if (/\b(stop|end|finish)\s+tummy/.test(text)) return { type: 'STOP_TUMMY' };

  // DIAPER
  if (/\b(diaper|nappy|diaper change)\b/.test(text)) {
    if (/\b(poop|poo|dirty)\b/.test(text)) return { type: 'LOG_DIAPER', diaperType: 'poop' };
    if (/\b(both|pee and poo|poo and pee)\b/.test(text)) return { type: 'LOG_DIAPER', diaperType: 'both' };
    return { type: 'LOG_DIAPER', diaperType: 'pee' };
  }
  if (/\b(peed|wet diaper)\b/.test(text)) return { type: 'LOG_DIAPER', diaperType: 'pee' };
  if (/\b(pooped|dirty diaper)\b/.test(text)) return { type: 'LOG_DIAPER', diaperType: 'poop' };

  // PAINKILLER
  if (/\b(painkiller|pain\s+killer|ibuprofen|acetaminophen|paracetamol|tylenol|advil|took\s+(a\s+)?(pill|medicine))\b/.test(text)) {
    return { type: 'LOG_PAINKILLER' };
  }

  // SHOPPING LIST
  const addMatch = text.match(/\badd\s+(.+?)\s+to\s+(the\s+)?(shopping\s+list|list|shopping)\b/);
  if (addMatch) return { type: 'ADD_SHOPPING', item: addMatch[1] };

  return null;
}

// ─── Action executors ─────────────────────────────────────────────────────────

type Executor = (cmd: VoiceCommand, token: string) => string;

const execute: Executor = (cmd, token) => {
  try {
  const now = Date.now();
  const id = now.toString();

  switch (cmd.type) {
    case 'START_SLEEP': {
      const existing = localStorage.getItem('currentSleep');
      if (existing && existing !== 'null') {
        try {
          const pos = JSON.parse(existing)?.position ?? 'unknown';
          return `Sleep is already running (${pos}).`;
        } catch {
          return 'Sleep is already running.';
        }
      }
      const record = { id, position: cmd.position, startTime: now };
      saveData('currentSleep', record, token);
      return `Sleep started — ${cmd.position}.`;
    }

    case 'STOP_SLEEP': {
      const raw = localStorage.getItem('currentSleep');
      if (!raw || raw === 'null') return 'No sleep session is running.';
      const current = JSON.parse(raw);
      const completed = { ...current, endTime: now };
      const history = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
      history.push(completed);
      saveData('sleepHistory', history, token);
      saveData('currentSleep', null, token);
      const mins = Math.round((now - (current.startTime ?? now)) / 60000);
      return `Sleep stopped. Duration: ${mins} min.`;
    }

    case 'START_FEEDING': {
      const existingRaw = localStorage.getItem('feedingActiveSession');
      if (existingRaw && existingRaw !== 'null') {
        return `Feeding is already in progress.`;
      }
      const session = {
        sessionStartTime: now,
        segments: [{ type: cmd.feedType, startTime: now }],
      };
      const payload = { session, isPaused: false, totalPausedMs: 0, pausedAt: null };
      localStorage.setItem('feedingActiveSession', JSON.stringify(payload));
      syncDataToServer('feedingActiveSession', payload, token);
      return `Feeding started — ${cmd.feedType}.`;
    }

    case 'STOP_FEEDING': {
      const raw = localStorage.getItem('feedingActiveSession');
      if (!raw || raw === 'null') return 'No feeding session is running.';
      const { session, totalPausedMs = 0 } = JSON.parse(raw);
      if (!session) return 'No feeding session is running.';

      const segs = session.segments.map((s: { type: string; startTime: number; endTime?: number; amount?: number }) => ({
        ...s,
        endTime: s.endTime ?? now,
      }));
      segs[segs.length - 1] = { ...segs[segs.length - 1], endTime: now };

      const segments: FeedingSegment[] = segs.map((s: { type: string; startTime: number; endTime: number; amount?: number }) => ({
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMs: s.endTime - s.startTime,
        amount: s.amount,
      }));

      const totalDurationMs = now - session.sessionStartTime - totalPausedMs;
      const record: FeedingRecord = {
        id,
        timestamp: now,
        startTime: session.sessionStartTime,
        endTime: now,
        durationMs: totalDurationMs,
        segments,
      };

      const history: FeedingRecord[] = JSON.parse(localStorage.getItem('feedingHistory') || '[]');
      history.push(record);
      saveData('feedingHistory', history, token);
      syncDataToServer('feedingActiveSession', null, token);
      localStorage.removeItem('feedingActiveSession');

      const totalMins = Math.round(totalDurationMs / 60000);
      return `Feeding ended. ${totalMins} min total.`;
    }

    case 'PAUSE_FEEDING': {
      const raw = localStorage.getItem('feedingActiveSession');
      if (!raw || raw === 'null') return 'No feeding session is running.';
      const payload = JSON.parse(raw);
      if (payload.isPaused) return 'Feeding is already paused.';
      const updated = { ...payload, isPaused: true, pausedAt: now };
      localStorage.setItem('feedingActiveSession', JSON.stringify(updated));
      syncDataToServer('feedingActiveSession', updated, token);
      return 'Feeding paused.';
    }

    case 'RESUME_FEEDING': {
      const raw = localStorage.getItem('feedingActiveSession');
      if (!raw || raw === 'null') return 'No feeding session is running.';
      const payload = JSON.parse(raw);
      if (!payload.isPaused) return 'Feeding is not paused.';
      const extraPausedMs = payload.pausedAt != null ? now - payload.pausedAt : 0;
      const updated = {
        ...payload,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: (payload.totalPausedMs ?? 0) + extraPausedMs,
      };
      localStorage.setItem('feedingActiveSession', JSON.stringify(updated));
      syncDataToServer('feedingActiveSession', updated, token);
      return 'Feeding resumed.';
    }

    case 'START_TUMMY': {
      const existing = localStorage.getItem('currentTummyTime');
      if (existing && existing !== 'null') return 'Tummy time is already running.';
      const record = { id, startTime: now };
      saveData('currentTummyTime', record, token);
      return 'Tummy time started!';
    }

    case 'STOP_TUMMY': {
      const raw = localStorage.getItem('currentTummyTime');
      if (!raw || raw === 'null') return 'No tummy time session is running.';
      const current = JSON.parse(raw);
      const completed = { ...current, endTime: now };
      const history = JSON.parse(localStorage.getItem('tummyTimeHistory') || '[]');
      history.push(completed);
      saveData('tummyTimeHistory', history, token);
      saveData('currentTummyTime', null, token);
      const mins = Math.round((now - (current.startTime ?? now)) / 60000);
      return `Tummy time stopped. Duration: ${mins} min.`;
    }

    case 'LOG_DIAPER': {
      const record = { id, type: cmd.diaperType, timestamp: now };
      const history = JSON.parse(localStorage.getItem('diaperHistory') || '[]');
      history.push(record);
      saveData('diaperHistory', history, token);
      const label = cmd.diaperType === 'both' ? 'pee + poop' : cmd.diaperType;
      return `Diaper logged — ${label}.`;
    }

    case 'LOG_PAINKILLER': {
      const record = { id, timestamp: now };
      const history = JSON.parse(localStorage.getItem('painkillerHistory') || '[]');
      history.push(record);
      saveData('painkillerHistory', history, token);
      return 'Painkiller dose logged.';
    }

    case 'ADD_SHOPPING': {
      const item: ShoppingItem = { id, name: cmd.item, checked: false };
      const list: ShoppingItem[] = JSON.parse(localStorage.getItem('shoppingList') || '[]');
      list.push(item);
      saveData('shoppingList', list, token);
      return `"${cmd.item}" added to shopping list.`;
    }
  }
  } catch (e) {
    console.error('[Cradl] VoiceControl execute error:', e);
    return 'Something went wrong. Please try again.';
  }
};

// ─── Routes to navigate to after a command ───────────────────────────────────

const routeForCommand: Partial<Record<VoiceCommand['type'], string>> = {
  START_SLEEP: '/sleep',
  STOP_SLEEP: '/sleep',
  START_FEEDING: '/feeding',
  STOP_FEEDING: '/feeding',
  PAUSE_FEEDING: '/feeding',
  RESUME_FEEDING: '/feeding',
  START_TUMMY: '/tummy-time',
  STOP_TUMMY: '/tummy-time',
};

// ─── Component ────────────────────────────────────────────────────────────────

type ListeningState = 'idle' | 'listening' | 'processing';

export function VoiceControl() {
  const [state, setState] = useState<ListeningState>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { session } = useAuth();
  const navigate = useNavigate();

  // Check browser support — must be a constructor (some environments expose a non-constructible value and throw "Illegal constructor")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecRaw = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  const SpeechRec = typeof SpeechRecRaw === 'function' ? SpeechRecRaw : undefined;
  const supported = !!SpeechRec;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRec || !session?.access_token) return;
    setState('listening');
    setLastTranscript('');

    let recognition: SpeechRecognition;
    try {
      recognition = new SpeechRec();
    } catch (err) {
      console.warn('[Cradl] Speech recognition not available:', err);
      setState('idle');
      toast.error('Voice not supported in this context');
      return;
    }
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      setState('processing');
      // Try each alternative until one parses
      let cmd: VoiceCommand | null = null;
      let matched = '';
      for (let i = 0; i < event.results[0].length; i++) {
        const transcript = event.results[0][i].transcript;
        cmd = parseCommand(transcript);
        if (cmd) { matched = transcript; break; }
        if (!matched) matched = transcript; // keep first for display
      }
      setLastTranscript(matched);

      if (!cmd) {
        toast.error(`Didn't understand: "${matched}"`);
        setState('idle');
        return;
      }

      const result = execute(cmd, session.access_token!);
      toast.success(`🎤 ${result}`);

      const route = routeForCommand[cmd.type];
      if (route) navigate(route);
      setState('idle');
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Mic error: ${event.error}`);
      }
      setState('idle');
    };

    recognition.onend = () => {
      // Only reset if we didn't already handle a result
      setState((s) => (s === 'listening' ? 'idle' : s));
    };

    try {
      recognition.start();
    } catch (e) {
      // InvalidStateError if already active, or other browser-specific errors
      console.warn('[Cradl] recognition.start() failed:', e);
      setState('idle');
      return;
    }
  }, [SpeechRec, session?.access_token, navigate]);

  // Cleanup on unmount
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  if (!supported) return null;

  return (
    <>
      {/* Floating mic button — sits above the nav bar */}
      <button
        type="button"
        onClick={state === 'listening' ? stopListening : startListening}
        disabled={state === 'processing' || !session?.access_token}
        aria-label={state === 'listening' ? 'Stop listening' : 'Voice command'}
        className={`
          fixed bottom-[76px] right-4 z-50
          w-12 h-12 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${state === 'listening'
            ? 'bg-red-500 text-white scale-110 shadow-red-300 dark:shadow-red-900'
            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}
        `}
      >
        {state === 'processing' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : state === 'listening' ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        {state === 'listening' && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
        )}
      </button>

      {/* Listening overlay banner */}
      {state === 'listening' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 dark:bg-gray-800/95 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Listening… say a command
        </div>
      )}

      {/* Brief transcript display while processing */}
      {state === 'processing' && lastTranscript && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 dark:bg-gray-800/95 text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          &ldquo;{lastTranscript}&rdquo;
        </div>
      )}
    </>
  );
}

// ─── Help text (exported for Settings) ───────────────────────────────────────

export const VOICE_COMMAND_EXAMPLES = [
  { cmd: 'Cradl, start sleep on left side', desc: 'Start sleep tracking' },
  { cmd: 'Cradl, stop sleep', desc: 'Stop sleep tracking' },
  { cmd: 'Cradl, start feeding right breast', desc: 'Start a feeding session' },
  { cmd: 'Cradl, stop feeding', desc: 'End and save the feeding session' },
  { cmd: 'Cradl, pause feeding', desc: 'Pause an active feeding' },
  { cmd: 'Cradl, resume feeding', desc: 'Resume a paused feeding' },
  { cmd: 'Cradl, start tummy time', desc: 'Start tummy time' },
  { cmd: 'Cradl, stop tummy time', desc: 'Stop tummy time' },
  { cmd: 'Cradl, log diaper pee', desc: 'Log a pee diaper' },
  { cmd: 'Cradl, log diaper poop', desc: 'Log a poop diaper' },
  { cmd: 'Cradl, log painkiller', desc: 'Log a painkiller dose' },
  { cmd: 'Cradl, add diapers to shopping list', desc: 'Add to shopping list' },
];
