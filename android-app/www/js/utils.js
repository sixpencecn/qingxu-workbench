// 通用日期、数值与格式化工具
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  if (typeof d === 'string') return d;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayKey() { return dateKey(new Date()); }

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function diffDays(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

export function lastNDays(n, end = todayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

export function weekStart(key = todayKey()) {
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function monthMatrix(year, monthIndex) {
  const first = dateKey(new Date(year, monthIndex, 1));
  const offset = (fromKey(first).getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => {
    const key = addDays(start, i);
    const d = fromKey(key);
    return { key, day: d.getDate(), outside: d.getMonth() !== monthIndex };
  });
}

export function fmtDateCN(key, withWeek = true) {
  const d = fromKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日${withWeek ? ' 周' + WEEKDAYS[d.getDay()] : ''}`;
}

export function fmtTime(t) { return t ? String(t).slice(0, 5) : ''; }

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const sum = (arr, fn = (x) => x) => arr.reduce((acc, x) => acc + (Number(fn(x)) || 0), 0);
export const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

export function money(n, digits = 2) {
  return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtMinutes(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} 小时 ${r} 分` : `${h} 小时`;
}

export function parseTags(str) {
  return [...new Set(String(str || '').split(/[,，、\s]+/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 8);
}

export function byDateDesc(arr, key = 'date') {
  return [...arr].sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || '')));
}

export function streakInfo(keys) {
  const set = new Set(keys);
  let current = 0;
  let cursor = todayKey();
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  while (set.has(cursor)) { current += 1; cursor = addDays(cursor, -1); }
  const sorted = [...set].sort();
  let longest = 0; let run = 0; let prev = null;
  for (const key of sorted) {
    if (prev && diffDays(prev, key) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = key;
  }
  return { current, longest };
}

export function downloadFile(filename, content, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function prettyBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
