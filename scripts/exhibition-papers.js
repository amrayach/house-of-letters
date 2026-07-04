/**
 * Exhibition paper metadata — single source of truth.
 *
 * Maps listener IDs (1–12, used in QR URLs and audio filenames) to archive
 * paper numbers, Arabic archival names, and diary entry date spans.
 *
 * Imported by: scripts/generate-qr-codes.js
 * Synced copy:  public/listen/index.html (inline PAPERS object)
 *
 * When editing, update BOTH locations.
 */

export const EXHIBITION_PAPERS = {
  1:  { archiveNum: 1,  ar: 'الورقة الأولى',              dates: '11/10/1988 – 1/1/1990' },
  2:  { archiveNum: 2,  ar: 'الورقة الثانية',             dates: '12/1/1990 – 17/1/1990' },
  3:  { archiveNum: 16, ar: 'الورقة السادسة عشر',         dates: '22/12/1991 – 24/12/1991' },
  4:  { archiveNum: 17, ar: 'الورقة السابعة عشر',         dates: '25/12/1991 – 27/12/1991' },
  5:  { archiveNum: 23, ar: 'الورقة الثالثة والعشرون',     dates: '15/1/1992 – 16/1/1992' },
  6:  { archiveNum: 33, ar: 'الورقة الثالثة والثلاثون',    dates: '5/3/1992 – 8/3/1992' },
  7:  { archiveNum: 34, ar: 'الورقة الرابعة والثلاثون',    dates: '8/3/1992 – 11/3/1992' },
  8:  { archiveNum: 43, ar: 'الورقة الثالثة والأربعون',    dates: '19/5/1992 – 27/5/1992' },
  9:  { archiveNum: 44, ar: 'الورقة الرابعة والأربعون',    dates: '27/5/1992 – 15/6/1992' },
  10: { archiveNum: 45, ar: 'الورقة الخامسة والأربعون',    dates: '15/6/1992 – 23/6/1992' },
  11: { archiveNum: 46, ar: 'الورقة السادسة والأربعون',    dates: '11/7/1992 – 14/7/1992' },
  12: { archiveNum: 6,  ar: 'الورقة السادسة',              dates: '12/2/1991 – 7/4/1991' },
  13: { archiveNum: 3,  ar: 'الورقة الثالثة',              dates: '19/7/1990 – 8/9/1990' },
};

export const EXHIBITION_PAPER_COUNT = Object.keys(EXHIBITION_PAPERS).length;

/**
 * Chronological order of listener IDs by diary start date.
 * Synced copy: public/listen/index.html (inline CHRONO_ORDER array).
 * When editing, update BOTH locations.
 */
export const EXHIBITION_CHRONO_ORDER = [1, 2, 13, 12, 3, 4, 5, 6, 7, 8, 9, 10, 11];
