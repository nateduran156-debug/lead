import ms from 'ms';

export function parseDuration(str) {
  const parsed = ms(str);
  if (!parsed || isNaN(parsed)) return null;
  return parsed;
}

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function timestamp(ms, style = 'R') {
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

export function relativeTime(ms) {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}
