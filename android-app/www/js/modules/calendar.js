// 日程日历：月视图、事件增删改与提醒设置
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '日程日历';
export const subtitle = '管理时间与提醒，重要事项不遗漏';

const now = new Date();
let cursorYear = now.getFullYear();
let cursorMonth = now.getMonth();
let selected = U.todayKey();

const REMINDERS = [['', '无提醒'], ['0', '准时提醒'], ['5', '提前 5 分钟'], ['10', '提前 10 分钟'], ['30', '提前 30 分钟'], ['60', '提前 1 小时']];

function eventsOn(date) {
  return store.getState().events.filter((e) => e.date === date)
    .sort((a, b) => String(a.time || '99:99').localeCompare(String(b.time || '99:99')));
}

function relativeLabel(date) {
  const d = U.diffDays(U.todayKey(), date);
  if (d === 0) return '今天';
  if (d === 1) return '明天';
  if (d === -1) return '昨天';
  return U.fmtDateCN(date);
}

function eventModal(ev = null, presetDate = selected) {
  const current = String(ev?.reminder ?? '');
  const body = `
    <div class="field"><label>日程标题</label><input class="input" name="title" value="${U.esc(ev?.title || '')}" placeholder="例如：项目评审会" required></div>
    <div class="field-row"><div class="field"><label>日期</label><input class="input" type="date" name="date" value="${ev?.date || presetDate}"></div>
    <div class="field"><label>时间</label><input class="input" type="time" name="time" value="${U.fmtTime(ev?.time)}"></div></div>
    <div class="field"><label>提醒</label><select class="select" name="reminder">${REMINDERS.map(([v, l]) => `<option value="${v}" ${String(v) === current ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>备注</label><textarea class="textarea" name="note" placeholder="可选">${U.esc(ev?.note || '')}</textarea></div>
    ${ev ? `<button type="button" class="btn btn-danger btn-sm" id="deleteEvent">${ui.icon('trash')} 删除这条日程</button>` : ''}`;

  ui.openModal({
    title: ev ? '编辑日程' : '新增日程', body,
    onOpen(root, close) {
      const del = root.querySelector('#deleteEvent');
      if (del) del.addEventListener('click', () => {
        close();
        ui.confirmDialog({ title: '删除日程', message: `确定删除「${U.esc(ev.title)}」吗？此操作不可撤销。`, onConfirm() {
          store.removeItem('events', ev.id); ui.toast('日程已删除'); ui.redraw();
        } });
      });
    },
    onConfirm(fd) {
      const t = String(fd.get('title') || '').trim();
      const date = String(fd.get('date') || '');
      if (!t || !date) { ui.toast('请填写标题与日期', 'error'); return false; }
      const reminderRaw = fd.get('reminder');
      const reminder = reminderRaw === '' ? null : Number(reminderRaw);
      const payload = { title: t, date, time: U.fmtTime(fd.get('time')), reminder, note: String(fd.get('note') || '').trim() };
      if (ev) store.patchItem('events', ev.id, payload);
      else store.addItem('events', payload);
      if (reminder !== null && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      ui.toast(ev ? '日程已更新' : '日程已添加', 'success');
      selected = date;
      const d = U.fromKey(date); cursorYear = d.getFullYear(); cursorMonth = d.getMonth();
      ui.redraw();
    }
  });
}

export function render() {
  const cells = U.monthMatrix(cursorYear, cursorMonth);
  const today = U.todayKey();
  const dayEvents = eventsOn(selected);
  const upcoming = store.getState().events.filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'))).slice(0, 6);

  const cellHTML = cells.map((c) => {
    const evs = eventsOn(c.key);
    return `<button type="button" class="cal-cell ${c.outside ? 'outside' : ''} ${c.key === today ? 'today' : ''} ${c.key === selected ? 'selected' : ''}" data-date="${c.key}">
      <span class="cal-date">${c.day}${c.key === today ? '<i class="cal-dot"></i>' : ''}</span>
      ${evs.slice(0, 2).map((e) => `<span class="cal-event ${e.time ? 'has-time' : ''}">${e.time ? U.fmtTime(e.time) + ' ' : ''}${U.esc(e.title)}</span>`).join('')}
      ${evs.length > 2 ? `<span class="cal-more">还有 ${evs.length - 2} 项</span>` : ''}
    </button>`;
  }).join('');

  const dayList = dayEvents.length ? dayEvents.map((e) => `
    <div class="list-item">
      <span class="chip ${e.time ? 'chip-primary' : ''}">${e.time ? U.fmtTime(e.time) : '全天'}</span>
      <div class="list-main"><div class="list-title">${U.esc(e.title)}</div>
        <div class="list-meta">${e.reminder !== null && e.reminder !== undefined ? `<span class="chip chip-warn">${ui.icon('bell')}${e.reminder === 0 ? '准时' : '提前 ' + e.reminder + ' 分'}</span>` : ''}${e.note ? `<span>${U.esc(e.note)}</span>` : ''}</div>
      </div>
      <div class="list-actions"><button class="mini-btn" data-act="edit" data-id="${e.id}" title="编辑">${ui.icon('edit')}</button><button class="mini-btn del" data-act="del" data-id="${e.id}" title="删除">${ui.icon('trash')}</button></div>
    </div>`).join('') : ui.emptyState('这一天暂无日程', 'calendar', `<button class="btn btn-soft btn-sm" type="button" data-act="add">${ui.icon('plus')}添加日程</button>`);

  const upList = upcoming.length ? upcoming.map((e) => `
    <div class="list-item"><span class="chip ${e.date === today ? 'chip-primary' : ''}">${relativeLabel(e.date)}</span>
      <div class="list-main"><div class="list-title">${U.esc(e.title)}</div><div class="list-meta">${e.time ? U.fmtTime(e.time) : '全天'}</div></div></div>`).join('')
    : ui.emptyState('近期没有待办日程', 'clock');

  return `
    <div class="card">
      <div class="calendar-head">
        <div class="calendar-title">${cursorYear} 年 ${cursorMonth + 1} 月</div>
        <div class="row">
          <button class="btn btn-sm" type="button" data-cal="today">今天</button>
          <button class="icon-btn btn-sm" type="button" data-cal="prev" aria-label="上个月">${ui.icon('left')}</button>
          <button class="icon-btn btn-sm" type="button" data-cal="next" aria-label="下个月">${ui.icon('right')}</button>
          <button class="btn btn-primary btn-sm" type="button" data-act="add">${ui.icon('plus')}新增日程</button>
        </div>
      </div>
      <div class="calendar-weekdays">${['一', '二', '三', '四', '五', '六', '日'].map((w) => `<div>周${w}</div>`).join('')}</div>
      <div class="calendar-grid">${cellHTML}</div>
      <div class="chart-legend"><span><i class="legend-dot" style="background:var(--accent)"></i>今日</span><span><i class="legend-dot" style="background:var(--primary)"></i>已选日期</span><span>点击日期查看与添加日程</span></div>
    </div>
    <div class="grid grid-main mt-16">
      <section class="card">
        <div class="card-head"><div><h2 class="card-title">${ui.icon('clock')}${U.fmtDateCN(selected)}</h2><p class="card-sub">共 ${dayEvents.length} 项安排</p></div></div>
        <div class="list">${dayList}</div>
      </section>
      <section class="card">
        <div class="card-head"><h2 class="card-title">${ui.icon('bell')}即将到来</h2></div>
        <div class="list">${upList}</div>
      </section>
    </div>`;
}

export function mount(root) {
  root.querySelectorAll('[data-cal]').forEach((btn) => btn.addEventListener('click', () => {
    const act = btn.dataset.cal;
    if (act === 'today') { const d = new Date(); cursorYear = d.getFullYear(); cursorMonth = d.getMonth(); selected = U.todayKey(); }
    if (act === 'prev' || act === 'next') {
      cursorMonth += act === 'next' ? 1 : -1;
      if (cursorMonth < 0) { cursorMonth = 11; cursorYear -= 1; }
      if (cursorMonth > 11) { cursorMonth = 0; cursorYear += 1; }
    }
    ui.redraw();
  }));
  root.querySelectorAll('[data-date]').forEach((btn) => btn.addEventListener('click', () => { selected = btn.dataset.date; ui.redraw(); }));
  root.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'add') eventModal(null, selected);
    if (act === 'edit') {
      const ev = store.getState().events.find((e) => e.id === btn.dataset.id);
      if (ev) eventModal(ev);
    }
    if (act === 'del') {
      const ev = store.getState().events.find((e) => e.id === btn.dataset.id);
      if (!ev) return;
      ui.confirmDialog({ title: '删除日程', message: `确定删除「${U.esc(ev.title)}」吗？`, onConfirm() { store.removeItem('events', ev.id); ui.toast('已删除'); ui.redraw(); } });
    }
  }));
}
