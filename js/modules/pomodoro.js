// 番茄专注：可自定义时长的计时器与专注统计
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '番茄专注';
export const subtitle = '25 分钟一段，专注当下';

const RT_KEY = 'qingxu.pomo.runtime';
const R = 94, C = 2 * Math.PI * R;
const MODE_LABEL = { focus: '专注', short: '短休息', long: '长休息' };

function freshRT() {
  return { mode: 'focus', running: false, endAt: 0, remaining: store.getState().focusPrefs.focus * 60 };
}

function loadRT() {
  try {
    const raw = JSON.parse(localStorage.getItem(RT_KEY));
    if (raw && MODE_LABEL[raw.mode]) return { ...freshRT(), ...raw };
  } catch { /* 忽略损坏的运行时状态 */ }
  return freshRT();
}

let rt = loadRT();
let ticker = null;

function saveRT() {
  try { localStorage.setItem(RT_KEY, JSON.stringify(rt)); } catch { /* 存储空间不足时忽略 */ }
}

function durationFor(mode = rt.mode) {
  const p = store.getState().focusPrefs;
  return (mode === 'focus' ? p.focus : mode === 'short' ? p.short : p.long) * 60;
}

function timeText(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function updateDOM() {
  const timeEl = document.getElementById('pomoTime');
  if (!timeEl) return;
  const total = Math.max(1, durationFor());
  const left = rt.running ? Math.max(0, (rt.endAt - Date.now()) / 1000) : Math.max(0, rt.remaining);
  timeEl.textContent = timeText(left);
  const ring = document.getElementById('pomoRing');
  if (ring) ring.style.strokeDashoffset = String(C * (1 - U.clamp(left / total, 0, 1)));
  const wrap = document.getElementById('pomoRingWrap');
  if (wrap) wrap.classList.toggle('break', rt.mode !== 'focus');
  const modeEl = document.getElementById('pomoMode');
  if (modeEl) modeEl.textContent = `${MODE_LABEL[rt.mode]} · ${rt.running ? '进行中' : '准备开始'}`;
  const btn = document.getElementById('pomoToggle');
  if (btn) btn.innerHTML = `${ui.icon(rt.running ? 'pause' : 'play')} ${rt.running ? '暂停' : '开始'}`;
  document.title = rt.running ? `${timeText(left)} · 轻序` : '轻序 · 个人综合管理工作台';
}

function completeSession(finishedMode, silent = false) {
  if (finishedMode === 'focus') {
    const minutes = store.getState().focusPrefs.focus;
    const today = U.todayKey();
    store.addItem('pomodoros', { date: today, minutes, finishedAt: new Date().toISOString() });
    if (!silent) {
      const count = store.getState().pomodoros.filter((p) => p.date === today).length;
      ui.toast(`完成第 ${count} 个番茄，休息一下`, 'success');
    }
    const todayCount = store.getState().pomodoros.filter((p) => p.date === today).length;
    rt.mode = todayCount % 4 === 0 ? 'long' : 'short';
  } else {
    rt.mode = 'focus';
  }
  rt.running = false;
  rt.endAt = 0;
  rt.remaining = durationFor(rt.mode);
  saveRT();
  if (!silent && store.getState().focusPrefs.autoNext && rt.mode !== 'focus') startTimer();
  updateDOM();
  ui.redraw();
}

function tick() {
  if (!rt.running) return;
  const left = (rt.endAt - Date.now()) / 1000;
  if (left <= 0) { completeSession(rt.mode); return; }
  rt.remaining = left;
  updateDOM();
}

function startTimer() {
  if (rt.running) return;
  if (rt.remaining <= 0) rt.remaining = durationFor();
  rt.endAt = Date.now() + rt.remaining * 1000;
  rt.running = true;
  saveRT();
  updateDOM();
}

function pauseTimer() {
  if (!rt.running) return;
  rt.remaining = Math.max(0, (rt.endAt - Date.now()) / 1000);
  rt.running = false;
  rt.endAt = 0;
  saveRT();
  updateDOM();
}

function resetTimer() {
  rt.running = false;
  rt.endAt = 0;
  rt.remaining = durationFor();
  saveRT();
  updateDOM();
  ui.toast('计时器已重置');
}

export function init() {
  if (rt.running && rt.endAt <= Date.now()) completeSession(rt.mode, true);
  else updateDOM();
  if (!ticker) ticker = setInterval(tick, 250);
}

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const todayList = s.pomodoros.filter((p) => p.date === today);
  const todayMinutes = U.sum(todayList, (p) => p.minutes);
  const totalMinutes = U.sum(s.pomodoros, (p) => p.minutes);
  const last14 = U.lastNDays(14);
  const p = s.focusPrefs;

  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('timer')}番茄钟</h2><p class="card-sub">专注 ${p.focus} 分钟 · 短休息 ${p.short} 分钟 · 长休息 ${p.long} 分钟</p></div>
            <button class="btn btn-sm" data-act="settings" type="button">${ui.icon('edit')}时长设置</button></div>
          <div class="timer-wrap">
            <div class="timer-ring ${rt.mode !== 'focus' ? 'break' : ''}" id="pomoRingWrap">
              <svg viewBox="0 0 216 216" aria-hidden="true">
                <circle class="ring-track" cx="108" cy="108" r="${R}"></circle>
                <circle class="ring-progress" id="pomoRing" cx="108" cy="108" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="0"></circle>
              </svg>
              <div class="timer-center"><div class="timer-time" id="pomoTime">${timeText(rt.running ? (rt.endAt - Date.now()) / 1000 : rt.remaining)}</div><div class="timer-mode" id="pomoMode">${MODE_LABEL[rt.mode]} · ${rt.running ? '进行中' : '准备开始'}</div></div>
            </div>
            <div class="segmented mt-16">
              ${Object.entries(MODE_LABEL).map(([k, l]) => `<button type="button" data-mode="${k}" class="${rt.mode === k ? 'active' : ''}">${l}</button>`).join('')}
            </div>
            <div class="timer-controls">
              <button class="btn btn-primary" id="pomoToggle" data-timer="toggle" type="button">${ui.icon(rt.running ? 'pause' : 'play')} ${rt.running ? '暂停' : '开始'}</button>
              <button class="btn" data-timer="reset" type="button">${ui.icon('reset')}重置</button>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('chart')}专注趋势</h2><p class="card-sub">近 14 天专注分钟数</p></div></div>
          ${ui.barChart(last14.map((k) => ({ label: `${U.fromKey(k).getMonth() + 1}/${U.fromKey(k).getDate()}`, value: U.sum(s.pomodoros.filter((x) => x.date === k), (x) => x.minutes) })), { height: 168, maxItems: 14, color: 'var(--purple)' })}
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('今日番茄', String(todayList.length), { iconName: 'coffee', unit: '个', tone: 'tone-purple' })}
          ${ui.statCard('今日专注', String(todayMinutes), { iconName: 'clock', unit: '分钟', tone: 'tone-primary' })}
          ${ui.statCard('累计番茄', String(s.pomodoros.length), { iconName: 'timer', unit: '个' })}
          ${ui.statCard('累计专注', (totalMinutes / 60).toFixed(1), { iconName: 'chart', unit: '小时' })}
        </div>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('clock')}今日记录</h2><button class="btn btn-sm" data-act="manual" type="button">${ui.icon('plus')}补记</button></div>
          ${todayList.length ? `<div class="list">${todayList.slice(0, 8).map((x) => `
            <div class="list-item"><span class="chip chip-purple">${x.finishedAt ? new Date(x.finishedAt).toTimeString().slice(0, 5) : '--:--'}</span>
              <div class="list-main"><div class="list-title">专注 ${x.minutes} 分钟</div></div>
              <button class="mini-btn del" data-act="del" data-id="${x.id}" title="删除">${ui.icon('trash')}</button></div>`).join('')}</div>` : ui.emptyState('今天还没有完成番茄', 'coffee')}
        </section>
        <section class="card">
          <div class="notice">完成 4 个番茄后自动进入长休息。计时状态会保存在本机，刷新页面后仍会继续；关闭页面期间到期的番茄会在再次打开时补记。</div>
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  updateDOM();
  root.querySelector('[data-timer="toggle"]').addEventListener('click', () => { rt.running ? pauseTimer() : startTimer(); });
  root.querySelector('[data-timer="reset"]').addEventListener('click', resetTimer);
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    rt.running = false; rt.endAt = 0; rt.mode = b.dataset.mode; rt.remaining = durationFor();
    saveRT(); ui.redraw();
  }));
  root.querySelector('[data-act="settings"]').addEventListener('click', () => {
    const p = store.getState().focusPrefs;
    ui.openModal({
      title: '专注时长设置',
      body: `<div class="field-row three">
          <div class="field"><label>专注（分钟）</label><input class="input" type="number" name="focus" min="1" max="180" value="${p.focus}"></div>
          <div class="field"><label>短休息</label><input class="input" type="number" name="short" min="1" max="60" value="${p.short}"></div>
          <div class="field"><label>长休息</label><input class="input" type="number" name="long" min="1" max="90" value="${p.long}"></div>
        </div>
        <div class="field"><label>专注结束后自动开始休息</label><select class="select" name="autoNext"><option value="yes" ${p.autoNext ? 'selected' : ''}>开启</option><option value="no" ${!p.autoNext ? 'selected' : ''}>关闭</option></select></div>`,
      onConfirm(fd) {
        const v = (name, fallback, max) => U.clamp(U.num(fd.get(name), fallback), 1, max);
        store.update((s) => { s.focusPrefs = { focus: v('focus', 25, 180), short: v('short', 5, 60), long: v('long', 15, 90), autoNext: fd.get('autoNext') === 'yes' }; });
        if (!rt.running) rt.remaining = durationFor();
        saveRT();
        ui.toast('设置已保存', 'success'); ui.redraw();
      }
    });
  });
  root.querySelector('[data-act="manual"]').addEventListener('click', () => {
    ui.openModal({
      title: '补记一次专注',
      body: `<div class="field-row"><div class="field"><label>日期</label><input class="input" type="date" name="date" value="${U.todayKey()}"></div>
        <div class="field"><label>分钟数</label><input class="input" type="number" name="minutes" value="${store.getState().focusPrefs.focus}" min="1" max="600"></div></div>`,
      onConfirm(fd) {
        const m = U.num(fd.get('minutes'));
        if (m <= 0) { ui.toast('请输入有效时长', 'error'); return false; }
        store.addItem('pomodoros', { date: fd.get('date') || U.todayKey(), minutes: m, finishedAt: new Date().toISOString() });
        ui.toast('已补记', 'success'); ui.redraw();
      }
    });
  });
  root.querySelectorAll('[data-act="del"]').forEach((b) => b.addEventListener('click', () => {
    ui.confirmDialog({ title: '删除记录', message: '确定删除这条专注记录吗？', onConfirm() { store.removeItem('pomodoros', b.dataset.id); ui.redraw(); } });
  }));
}
