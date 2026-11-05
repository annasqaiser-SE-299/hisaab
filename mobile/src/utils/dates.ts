const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// The date on the phone's calendar. toISOString() would give the UTC date, which is the
// previous day in Pakistan between midnight and 5 AM.
export function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function currentMonthISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthFull(monthStr: string): string {
  // YYYY-MM
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const mIdx = parseInt(parts[1], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTHS_FULL[mIdx]} ${parts[0]}`;
    }
  }
  return monthStr;
}

export function formatDate(dateStr: string): string {
  // Expects YYYY-MM-DD or ISO
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
    const day = parts[2].padStart(2, '0');
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

export function formatTime(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Takes a UTC created_at timestamp and groups it by the phone's local day.
export function getRelativeDayLabel(dateStr: string): string {
  const clean = toLocalISODate(new Date(dateStr));
  const today = todayISO();

  const dToday = new Date(today);
  const dTarget = new Date(clean);
  const diffDays = Math.round((dToday.getTime() - dTarget.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(clean);
}

