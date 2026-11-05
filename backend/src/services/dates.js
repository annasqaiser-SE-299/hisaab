// en-CA formats dates as YYYY-MM-DD, the format we store.
const karachiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayKarachi() {
  return karachiDate.format(new Date());
}

function currentMonthKarachi() {
  return todayKarachi().slice(0, 7);
}

// YYYY-MM-DD strings sort in date order, so plain comparison is correct.
function isFutureDate(date) {
  return date > todayKarachi();
}

// Rejects impossible dates such as 2026-02-31, which Date would roll forward.
function isRealDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

module.exports = { todayKarachi, currentMonthKarachi, isFutureDate, isRealDate };
