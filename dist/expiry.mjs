const datePattern = /\b(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b|\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})\b/g;
const expiryLabel = /\b(?:EXPIRY(?:\s+DATE)?|EXPIRES(?:\s+ON)?|VERVALDATUM)\b\s*[:\-]?\s*/gi;

export function sastDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function parseDate(match) {
  const [year, month, day] = match[1] ? match.slice(1, 4) : [match[6], match[5], match[4]];
  const iso = [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function classify(text, today = sastDate()) {
  const candidates = new Set();
  for (const label of text.matchAll(expiryLabel)) {
    const start = label.index + label[0].length;
    const line = text.slice(start).split(/\r?\n/, 1)[0];
    const dates = [...line.matchAll(datePattern)];
    if (dates.length !== 1 || !parseDate(dates[0])) return { status: 'review' };
    candidates.add(parseDate(dates[0]));
  }
  if (candidates.size !== 1) return { status: 'review' };
  const [expiry] = candidates;
  const days = (Date.parse(expiry) - Date.parse(today)) / 86400000;
  return { expiry, days, status: days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'valid' };
}
