import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface SleepRecord {
  id: string;
  position: string;
  startTime: number;
  endTime?: number;
}

interface FeedingSegment {
  type: string;
  durationMs: number;
  amount?: number;
}

interface FeedingRecord {
  id: string;
  type?: string;
  timestamp: number;
  amount?: number;
  endTime?: number;
  durationMs?: number;
  segments?: FeedingSegment[];
}

interface DiaperRecord {
  id: string;
  type: 'pee' | 'poop' | 'both';
  timestamp: number;
}

interface TummyTimeRecord {
  id: string;
  startTime: number;
  endTime?: number;
}

interface Note {
  id: string;
  text: string;
  createdAt: number;
  done: boolean;
  isPublic?: boolean;
}

export function generatePediatricReport() {
  const doc = new jsPDF();
  
  // Get data from localStorage
  const sleepHistory: SleepRecord[] = JSON.parse(localStorage.getItem('sleepHistory') || '[]');
  const feedingHistory: FeedingRecord[] = JSON.parse(localStorage.getItem('feedingHistory') || '[]');
  const diaperHistory: DiaperRecord[] = JSON.parse(localStorage.getItem('diaperHistory') || '[]');
  const tummyTimeHistory: TummyTimeRecord[] = JSON.parse(localStorage.getItem('tummyTimeHistory') || '[]');
  const notes: Note[] = JSON.parse(localStorage.getItem('notes') || '[]');
  
  // Get last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const recentSleep = sleepHistory.filter(s => s.startTime > sevenDaysAgo);
  const recentFeeding = feedingHistory.filter(f => f.timestamp > sevenDaysAgo);
  const recentDiaper = diaperHistory.filter(d => d.timestamp > sevenDaysAgo);
  const recentTummyTime = tummyTimeHistory.filter(t => t.startTime > sevenDaysAgo);
  const recentNotes = notes
    .filter(n => n.createdAt > sevenDaysAgo && n.isPublic === true)
    .sort((a, b) => b.createdAt - a.createdAt);
  
  // Title
  doc.setFontSize(20);
  doc.text('Baby Care Summary Report', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 28);
  doc.text('Report Period: Last 7 Days', 14, 34);
  
  let yPos = 45;
  
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
  
  const avgSleepDuration = recentSleep
    .filter(s => s.endTime)
    .reduce((acc, s) => acc + (s.endTime! - s.startTime), 0) / (recentSleep.filter(s => s.endTime).length || 1);
  
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
  
  // Feeding Summary (count by segment type when present)
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
  const peeCount = recentDiaper.filter(d => d.type === 'pee' || d.type === 'both').length;
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
      const status = note.done ? '[x]' : '[ ]';
      const dateStr = format(new Date(note.createdAt), 'MMM d, h:mm a');
      const text = `${status} ${dateStr} - ${note.text}`;
      doc.text(text, 14, yPos);
      yPos += 6;
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
    });

    yPos += 4;
  }
  
  // Add new page for detailed logs
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
      const endTime = feedingEndTime(f);
      const typeStr = f.segments?.length
        ? f.segments.map((s) => `${s.type} ${Math.round(s.durationMs / 60000)}m`).join(', ')
        : (f.type ?? '-');
      const totalMl = f.segments
        ? f.segments.reduce((sum, s) => sum + (s.amount ?? 0), 0)
        : (f.amount ?? 0);
      return [
        format(new Date(endTime), 'MMM d'),
        format(new Date(endTime), 'h:mm a'),
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

    yPos = (doc as any).lastAutoTable.finalY + 10;
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
        format(new Date(d.timestamp), 'MMM d'),
        format(new Date(d.timestamp), 'h:mm a'),
        d.type.charAt(0).toUpperCase() + d.type.slice(1),
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
    });
  }
  
  // Save the PDF
  doc.save(`baby-care-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
