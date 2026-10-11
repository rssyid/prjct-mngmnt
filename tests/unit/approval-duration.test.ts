import { describe, it, expect } from 'vitest';
import { calculateLevelDurationDays } from '@/domain/approval/approval-decision-service';

describe('Approval Level Calendar Duration Calculation (AC-22)', () => {
  it('AC-22 menghitung durasi level 1 dari tanggal email approval', () => {
    const emailDate = new Date('2026-10-10');
    const decisionSameDay = new Date('2026-10-10');
    const decisionAfter3Days = new Date('2026-10-13');

    // Hari yang sama = 0 hari kalender
    expect(calculateLevelDurationDays(1, decisionSameDay, emailDate)).toBe(0);

    // 3 hari sesudahnya = 3 hari kalender
    expect(calculateLevelDurationDays(1, decisionAfter3Days, emailDate)).toBe(3);
  });

  it('AC-22 menghitung durasi level N (> 1) dari tanggal keputusan level sebelumnya', () => {
    const prevDecisionDate = new Date('2026-10-13');
    const currentDecisionDate = new Date('2026-10-17');

    // 17 Okt - 13 Okt = 4 hari kalender
    expect(calculateLevelDurationDays(2, currentDecisionDate, prevDecisionDate)).toBe(4);
  });
});
