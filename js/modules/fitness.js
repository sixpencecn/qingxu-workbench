// 健身打卡：登记、连续统计与趋势
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '健身打卡';
export const subtitle = '记录每一次运动，积累连续动力';

const TYPES = ['跑步', '力量训练', '步行', '骑行', '瑜伽', '球类', '其他'];
const COLORS = { '跑步': '#2f9e7d', '力量训练': '#5b95cf', '步行': '#79c9b4', '骑行': '#8a7cd2', '瑜伽': '#dda23c', '球类': '#e1685a', '其他': '#8aa098' };

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const doneToday = s.workouts.some((w) => w.date === today);
  const streak = U.streakInfo(s.workouts.map((w) => w.date));
  const week = U.weekStart(today);
  const weekCount = s.workouts.filter((w) => w.date >= week).length;
  const weekMinutes = U.sum(s.workouts.filter((w) => w.date >= week), (w) => w.minutes);
  const days = U.lastNDays(14);
  const recent = U.byDateDesc(s.workouts, 'date').slice(0, 10);
  const typeTotals = TYPES.map((t) => ({ label: t, value: U.sum(s.workouts.filter((w) => w.type === t), (w) => w.minutes) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const maxType = Math.max(1, ...typeTotals.map((x) => x.value));

  const dayStrip = U.lastNDays(7).map((k) => {
    const hit = s.workouts.some((w) => w.date === k);
    return `<div class="day-strip-cell ${k === today ? 'active' : ''}"><span>周${U.WEEKDAYS[U.fromKey(k).getDay()]}</span><b>${U.fromKey(k).getDate()}</b><span class="${hit ? 'tone-primary' : 'muted'}">${hit ? '✓' : '·'}</span></div>`;
  }).join('');

  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('dumbbell')}运动打卡</h2><p class="card-sub">${doneToday ? '今日已打卡，继续保持' : '今天还没有运动记录'}</p></div>
            ${doneToday ? `<span class="chip chip-primary">今日已完成</span>` : ''}</div>
          <form class="field-row" id="workoutForm">
            <div class="field"><label>日期</label><input class="input" type="date" name="date" value="${today}"></div>
            <div class="field"><label>运动类型</label><select class="select" name="type">${TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}</select></div>
            <div class="field"><label>时长（分钟）</label><input class="input" type="number" name="minutes" value="30" min="1" max="600"></div>
            <div class="field"><label>备注</label><input class="input" name="note" placeholder="可选，如配速 / 组数"></div>
          </form>
          <button class="btn btn-primary btn-block" type="button" data-act="add">${ui.icon('plus')}确认打卡</button>
        </section>

        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('chart')}运动时长趋势</h2><p class="card-sub">近 14 天，单位：分钟</p></div></div>
          ${ui.barChart(days.map((k) => {
            const v = U.sum(s.workouts.filter((w) => w.date === k), (w) => w.minutes);
            return { label: `${U.fromKey(k).getMonth() + 1}/${U.fromKey(k).getDate()}`, value: v, display: v || '' };
          }), { height: 168, maxItems: 14 })}
        </section>

        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('clock')}最近记录</h2></div>
          ${recent.length ? `<div class="list">${recent.map((w) => `
            <div class="list-item"><span class="chip" style="border-left:3px solid ${COLORS[w.type] || COLORS['其他']}">${U.esc(w.type)}</span>
              <div class="list-main"><div class="list-title">${U.fmtMinutes(w.minutes)}</div><div class="list-meta">${U.fmtDateCN(w.date)}${w.note ? ' · ' + U.esc(w.note) : ''}</div></div>
              <div class="list-actions"><button class="mini-btn del" data-act="del" data-id="${w.id}" title="删除">${ui.icon('trash')}</button></div>
            </div>`).join('')}</div>` : ui.emptyState('还没有运动记录', 'dumbbell')}
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('当前连续', String(streak.current), { iconName: 'flag', unit: '天', tone: 'tone-primary' })}
          ${ui.statCard('最长连续', String(streak.longest), { iconName: 'target', unit: '天' })}
          ${ui.statCard('本周打卡', String(weekCount), { iconName: 'check', unit: '次' })}
          ${ui.statCard('本周时长', String(weekMinutes), { iconName: 'clock', unit: '分钟', tone: 'tone-info' })}
        </div>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('calendar')}近 7 天</h2></div>
          <div class="day-strip">${dayStrip}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('layers')}运动类型分布</h2></div>
          ${typeTotals.length ? `<div class="bar-list">${typeTotals.map((t) => `
            <div class="bar-row"><span class="bar-label">${t.label}</span>
              <span class="progress"><span style="width:${(t.value / maxType) * 100}%;background:${COLORS[t.label] || COLORS['其他']}"></span></span>
              <span class="bar-value">${t.value} 分</span></div>`).join('')}</div>` : ui.emptyState('暂无分布数据', 'chart')}
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelector('[data-act="add"]').addEventListener('click', () => {
    const form = root.querySelector('#workoutForm');
    const fd = new FormData(form);
    const minutes = U.num(fd.get('minutes'));
    if (minutes <= 0) { ui.toast('请输入有效时长', 'error'); return; }
    store.addItem('workouts', {
      date: fd.get('date') || U.todayKey(), type: fd.get('type'), minutes,
      note: String(fd.get('note') || '').trim()
    });
    ui.toast('健身打卡成功', 'success'); ui.redraw();
  });
  root.querySelectorAll('[data-act="del"]').forEach((b) => b.addEventListener('click', () => {
    ui.confirmDialog({ title: '删除记录', message: '确定删除这条运动记录吗？', onConfirm() { store.removeItem('workouts', b.dataset.id); ui.toast('已删除'); ui.redraw(); } });
  }));
}
