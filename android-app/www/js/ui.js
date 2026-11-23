// 通用 UI 组件与轻量 SVG 图表（无外部依赖，可离线运行）
import { esc, addDays, weekStart, todayKey, fromKey, num } from './utils.js';

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-7h5v7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  todo: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 2.8 2.8L16.5 9"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6M12 5V2M19 6l1.2-1.2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/><path d="m4 8 6-5 6 4 6-4"/>',
  dumbbell: '<path d="M4 9v6M8 6v12M16 6v12M20 9v6M8 12h8M2 10v4M22 10v4"/>',
  book: '<path d="M4 4.5h6a3 3 0 0 1 3 3V20a3 3 0 0 0-3-3H4z"/><path d="M20 4.5h-3a3 3 0 0 0-3 3V20a3 3 0 0 1 3-3h3z"/>',
  droplet: '<path d="M12 2.8s6 6.4 6 10.7a6 6 0 0 1-12 0C6 9.2 12 2.8 12 2.8z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16.5 14.5h1.5M6 6V4.5A1.5 1.5 0 0 1 7.5 3H18"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1.1 2.1h4.8c.1-.9.5-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8M10 12h4"/>',
  flag: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
  download: '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16"/>',
  upload: '<path d="M12 17V5m0 0L7.5 9.5M12 5l4.5 4.5M4 19h16"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  up: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
  down: '<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  coffee: '<path d="M4 8h14v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM18 9h1.5a2.5 2.5 0 0 1 0 5H18M7 3v2M11 3v2M15 3v2"/>',
  leaf: '<path d="M20 4C10 4 4 8 4 15a5 5 0 0 0 5 5c7 0 11-6 11-16z"/><path d="M4 20c3-5 7-8 12-10"/>',
  camera: '<path d="M4 8h3l1.6-2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9" r="1.4"/><path d="m4 18 5-5 4 4 3-3 4 4"/>'
};

export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;
}

export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
}

export function go(name) { location.hash = `#/${name}`; }
export function refresh() { window.dispatchEvent(new Event('app:refresh')); }
export function redraw() { window.dispatchEvent(new Event('app:redraw')); }

export function toast(message, type = '') {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .25s';
    setTimeout(() => node.remove(), 250);
  }, 2600);
}

export function openModal({ title, body = '', confirmText = '保存', cancelText = '取消', danger = false, onConfirm, onOpen }) {
  const root = document.getElementById('modalRoot');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <form class="modal" novalidate>
      <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn btn-sm" data-close aria-label="关闭">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>${esc(cancelText)}</button>
        <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmText)}</button>
      </div>
    </form>`;
  root.appendChild(backdrop);
  const form = backdrop.querySelector('form');
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = onConfirm ? onConfirm(new FormData(form), backdrop, close) : undefined;
    if (result !== false) close();
  });
  if (onOpen) onOpen(backdrop, close);
  const first = form.querySelector('input:not([type=hidden]), select, textarea');
  if (first) setTimeout(() => first.focus(), 60);
  return { form, close };
}

export function confirmDialog({ title = '确认操作', message = '', confirmText = '确认删除', onConfirm }) {
  openModal({
    title, danger: true, confirmText,
    body: `<p class="modal-note">${message}</p>`,
    onConfirm: () => { onConfirm(); }
  });
}

export function statCard(label, value, opts = {}) {
  const { iconName = '', unit = '', foot = '', tone = '', click = '' } = opts;
  return `<div class="stat"${click ? ` data-nav="${click}" style="cursor:pointer"` : ''}>
    <div class="stat-label">${iconName ? icon(iconName) : ''}${esc(label)}</div>
    <div class="stat-value ${tone}">${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
    ${foot ? `<div class="stat-foot">${foot}</div>` : ''}
  </div>`;
}

export function emptyState(text, iconName = 'leaf', action = '') {
  return `<div class="empty">${icon(iconName)}<p>${esc(text)}</p>${action}</div>`;
}

const CURVE = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export function barChart(items, opts = {}) {
  const height = opts.height || 156;
  const W = 560, top = 20, bottom = 26;
  const list = items.slice(-(opts.maxItems || 14));
  if (!list.length) return emptyState('暂无数据', 'chart');
  const max = Math.max(1, ...list.map((x) => num(x.value)));
  const inner = W - 16;
  const slot = inner / list.length;
  const bw = Math.min(34, slot * .6);
  const color = opts.color || 'var(--primary)';
  const bars = list.map((x, i) => {
    const v = num(x.value);
    const h = Math.max(v > 0 ? 3 : 0, (v / max) * (height - top - bottom));
    const cx = 8 + slot * i + slot / 2;
    const y = height - bottom - h;
    return `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="${Math.min(5, bw / 3)}" fill="${x.color || color}" opacity="${v ? .92 : .25}"/>
      ${v && (opts.showValues !== false && list.length <= 10) ? `<text x="${cx}" y="${y - 5}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(x.display || v)}</text>` : ''}
      <text x="${cx}" y="${height - 7}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(x.label)}</text>`;
  }).join('');
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${height}" role="img" aria-label="柱状统计图">
    <line x1="4" y1="${height - bottom + .5}" x2="${W - 4}" y2="${height - bottom + .5}" stroke="var(--border)"/>
    ${bars}</svg></div>`;
}

export function lineChart(values, opts = {}) {
  const W = 560, H = opts.height || 160, padX = 14, padY = 22;
  const vals = values.map((v) => num(v));
  if (!vals.length) return emptyState('暂无数据', 'chart');
  const pts = vals.length === 1 ? [vals[0], vals[0]] : vals;
  const max = Math.max(1, ...pts) * 1.15;
  const coords = pts.map((v, i) => [padX + (i * (W - padX * 2)) / (pts.length - 1), H - padY - (v / max) * (H - padY * 2)]);
  const color = opts.color || 'var(--primary)';
  const line = CURVE(coords);
  const area = `${line} L${coords.at(-1)[0]},${H - padY} L${coords[0][0]},${H - padY} Z`;
  const dots = coords.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${pts.length > 14 ? 2 : 3.2}" fill="${color}"/>`).join('');
  const labels = (opts.labels || []).length
    ? opts.labels.map((lb, i) => {
        if (opts.labels.length > 8 && i % Math.ceil(opts.labels.length / 7) !== 0 && i !== opts.labels.length - 1) return '';
        const x = padX + (i * (W - padX * 2)) / Math.max(1, opts.labels.length - 1);
        return `<text x="${x}" y="${H - 4}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(lb)}</text>`;
      }).join('')
    : '';
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="趋势统计图">
    <path d="${area}" fill="${color}" opacity=".1"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg></div>`;
}

export function donutChart(segments, opts = {}) {
  const list = segments.filter((s) => num(s.value) > 0);
  const total = list.reduce((acc, s) => acc + num(s.value), 0);
  if (!total) return emptyState('暂无数据', 'chart');
  const r = 54, C = 2 * Math.PI * r;
  let offset = 0;
  const circles = list.map((s) => {
    const len = (num(s.value) / total) * C;
    const out = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${s.color || 'var(--primary)'}" stroke-width="17" stroke-dasharray="${len - 1.5} ${C - len + 1.5}" stroke-dashoffset="${-offset}"/>`;
    offset += len;
    return out;
  }).join('');
  const legend = list.map((s) => `<span><i class="legend-dot" style="background:${s.color || 'var(--primary)'}"></i>${esc(s.label)} ${((num(s.value) / total) * 100).toFixed(0)}%</span>`).join('');
  return `<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
    <div style="width:140px;flex:none"><svg viewBox="0 0 140 140"><g transform="rotate(-90 70 70)">${circles}</g>
      <text x="70" y="66" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(opts.centerLabel || '合计')}</text>
      <text x="70" y="84" text-anchor="middle" font-size="19" font-weight="700" fill="var(--text)">${esc(opts.centerValue || total)}</text></svg></div>
    <div class="chart-legend" style="flex-direction:column;gap:7px;margin:0">${legend}</div>
  </div>`;
}

export function heatmap(valueMap, opts = {}) {
  const weeks = opts.weeks || 18;
  const end = weekStart(todayKey());
  const start = addDays(end, -(weeks - 1) * 7);
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const key = addDays(start, i);
    const v = num(valueMap[key]);
    const level = v <= 0 ? 0 : v < 20 ? 1 : v < 40 ? 2 : v < 60 ? 3 : 4;
    cells.push(`<span class="heat-cell${level ? ' heat-' + level : ''}" title="${key}：${v}${opts.unit || '分钟'}"></span>`);
  }
  return `<div class="heatmap">${cells.join('')}</div>
    <div class="heat-labels"><span>${start.slice(5)}</span><span>少</span><span class="row" style="gap:3px">${[0, 1, 2, 3, 4].map((l) => `<i class="heat-cell${l ? ' heat-' + l : ''}"></i>`).join('')}</span><span>多</span><span>${end.slice(5)}</span></div>`;
}
