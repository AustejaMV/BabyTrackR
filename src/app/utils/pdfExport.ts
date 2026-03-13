import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { SleepRecord, FeedingRecord, DiaperRecord, TummyTimeRecord, Note, BabyProfile } from '../types';

/** Safely parse a localStorage value; returns `fallback` on any error. */
function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Safely format a timestamp with date-fns; returns `fallback` if invalid. */
function safeDate(ts: number | undefined | null, fmt: string, fallback = '—'): string {
  try {
    if (!ts || !Number.isFinite(ts)) return fallback;
    return format(new Date(ts), fmt);
  } catch {
    return fallback;
  }
}

export function generatePediatricReport() {
  try {
    const doc = new jsPDF();

    // Get data from localStorage
    const sleepHistory    = safeParse<SleepRecord[]>('sleepHistory', []);
    const feedingHistory  = safeParse<FeedingRecord[]>('feedingHistory', []);
    const diaperHistory   = safeParse<DiaperRecord[]>('diaperHistory', []);
    const tummyTimeHistory = safeParse<TummyTimeRecord[]>('tummyTimeHistory', []);
    const notes           = safeParse<Note[]>('notes', []);

    // Get last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentSleep      = sleepHistory.filter(s => s.startTime > sevenDaysAgo);
    const recentFeeding    = feedingHistory.filter(f => f.timestamp > sevenDaysAgo);
    const recentDiaper     = diaperHistory.filter(d => d.timestamp > sevenDaysAgo);
    const recentTummyTime  = tummyTimeHistory.filter(t => t.startTime > sevenDaysAgo);
    const recentNotes      = notes
      .filter(n => n.createdAt > sevenDaysAgo && n.isPublic === true)
      .sort((a, b) => b.createdAt - a.createdAt);

    // Title
    doc.setFontSize(20);
    doc.text('Baby Care Summary Report', 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'd MMMM yyyy')}`, 14, 28);
    doc.text('Report Period: Last 7 Days', 14, 34);

    let yPos = 40;
    if (babyProfile?.birthDate) {
      if (babyProfile.name) {
        doc.text(`Baby: ${babyProfile.name}`, 14, yPos);
        yPos += 6;
      }
      if (babyProfile.photoDataUrl && babyProfile.photoDataUrl.startsWith('data:image')) {
        try {
          doc.addImage(babyProfile.photoDataUrl, 'JPEG', 14, yPos, 24, 24);
          yPos += 28;
        } catch {
          yPos += 2;
        }
      } else {
        yPos += 2;
      }
    }
    yPos += 5;

    // Summary Statistics
    doc.setFontSize(14);
    doc.text('Summary', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(`Total Sleep Sessions: ${recentSleep.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Feedings: ${recentFeeding.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Diaper Changes: ${recentDiaper.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Tummy Time Sessions: ${recentTummyTime.filter(t => t.endTime).length}`, 14, yPos);
    yPos += 10;

    // Sleep Summary
    const sleepPositions = recentSleep.reduce((acc, s) => {
      acc[s.position] = (acc[s.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedSleep = recentSleep.filter(s => s.endTime && s.startTime);
    const avgSleepDuration = completedSleep.length > 0
      ? completedSleep.reduce((acc, s) => acc + (s.endTime! - s.startTime), 0) / completedSleep.length
      : 0;

    doc.setFontSize(14);
    doc.text('Sleep Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(`Average Sleep Duration: ${Math.round(avgSleepDuration / 60000)} minutes`, 14, yPos);
    yPos += 6;
    doc.text('Sleep Positions:', 14, yPos);
    yPos += 6;

    Object.entries(sleepPositions).forEach(([position, count]) => {
      doc.text(`  ${position}: ${count} times`, 14, yPos);
      yPos += 6;
    });

    yPos += 4;

    // Feeding Summary
    const feedingTypes = recentFeeding.reduce((acc, f) => {
      if (f.segments?.length) {
        f.segments.forEach((seg) => {
          acc[seg.type] = (acc[seg.type] || 0) + 1;
        });
      } else if (f.type) {
        acc[f.type] = (acc[f.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const feedingEndTime = (f: FeedingRecord) => f.endTime ?? f.timestamp;
    const avgFeedingInterval = recentFeeding.length > 1
      ? recentFeeding
          .slice(1)
          .reduce((acc, f, i) => acc + (feedingEndTime(f) - feedingEndTime(recentFeeding[i])), 0) /
        (recentFeeding.length - 1)
      : 0;

    doc.setFontSize(14);
    doc.text('Feeding Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(`Average Interval: ${Math.round(avgFeedingInterval / 3600000 * 10) / 10} hours`, 14, yPos);
    yPos += 6;
    doc.text('Feeding Types:', 14, yPos);
    yPos += 6;

    Object.entries(feedingTypes).forEach(([type, count]) => {
      doc.text(`  ${type}: ${count} times`, 14, yPos);
      yPos += 6;
    });

    yPos += 4;

    // Diaper Summary
    const peeCount  = recentDiaper.filter(d => d.type === 'pee'  || d.type === 'both').length;
    const poopCount = recentDiaper.filter(d => d.type === 'poop' || d.type === 'both').length;

    doc.setFontSize(14);
    doc.text('Diaper Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(`Wet Diapers: ${peeCount}`, 14, yPos);
    yPos += 6;
    doc.text(`Dirty Diapers: ${poopCount}`, 14, yPos);
    yPos += 6;
    doc.text(`Average per day: ${Math.round((recentDiaper.length / 7) * 10) / 10}`, 14, yPos);
    yPos += 10;

    // Tummy Time Summary
    const totalTummyTime = recentTummyTime
      .filter(t => t.endTime)
      .reduce((acc, t) => acc + (t.endTime! - t.startTime), 0);

    doc.setFontSize(14);
    doc.text('Tummy Time Analysis', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.text(`Total Time: ${Math.round(totalTummyTime / 60000)} minutes`, 14, yPos);
    yPos += 6;
    doc.text(`Average per day: ${Math.round(totalTummyTime / 60000 / 7)} minutes`, 14, yPos);
    yPos += 10;

    // Notes (public only)
    if (recentNotes.length > 0) {
      doc.setFontSize(14);
      doc.text('Notes (public)', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      recentNotes.slice(0, 12).forEach((note) => {
        const status  = note.done ? '[x]' : '[ ]';
        const dateStr = safeDate(note.createdAt, 'd MMM, HH:mm');
        const text    = `${status} ${dateStr} - ${note.text}`;
        doc.text(text, 14, yPos);
        yPos += 6;
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 4;
    }

    // Detailed logs page
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.text('Detailed Logs', 14, yPos);
    yPos += 10;

    // Recent Feedings Table
    if (recentFeeding.length > 0) {
      doc.setFontSize(12);
      doc.text('Recent Feedings', 14, yPos);
      yPos += 5;

      const feedingTableBody = recentFeeding.slice(-20).reverse().map((f) => {
        const et      = feedingEndTime(f);
        const typeStr = f.segments?.length
          ? f.segments.map((s) => `${s.type} ${Math.round((s.durationMs ?? 0) / 60000)}m`).join(', ')
          : (f.type ?? '-');
        const totalMl = f.segments
          ? f.segments.reduce((sum, s) => sum + (s.amount ?? 0), 0)
          : (f.amount ?? 0);
        return [
          safeDate(et, 'd MMM'),
          safeDate(et, 'HH:mm'),
          typeStr,
          totalMl ? `${totalMl} ml` : '-',
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Time', 'Type / Duration', 'Amount (ml)']],
        body: feedingTableBody,
        theme: 'grid',
        styles: { fontSize: 8 },
      });

      yPos = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yPos;
      yPos += 10;
    }

    // Recent Diapers Table
    if (recentDiaper.length > 0 && yPos < 250) {
      doc.setFontSize(12);
      doc.text('Recent Diaper Changes', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Time', 'Type']],
        body: recentDiaper.slice(-20).reverse().map(d => [
          safeDate(d.timestamp, 'd MMM'),
          safeDate(d.timestamp, 'HH:mm'),
          d.type.charAt(0).toUpperCase() + d.type.slice(1),
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
      });
    }

    doc.save(`baby-care-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (e) {
    console.error('[BabyTracker] generatePediatricReport failed:', e);
    throw e; // re-throw so the caller (Settings.tsx) can show a toast
  }
}
