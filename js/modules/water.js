// 饮水习惯打卡：每日杯数、目标与趋势
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '饮水打卡';
export const subtitle = '少量多次，保持好状态';

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const count = s.water[today] || 0;
  const goal = s.waterGoal;
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const cupCount = Math.min(20, Math.max(goal, count));
  const last7 = U.lastNDays(7);
  const achieved = Object.entries(s.water).filter(([, v]) => U.num(v) >= goal).length;
  const streak = U.streakInfo(Object.keys(s.water).filter((k) => U.num(s.water[k]) >= goal)).current;
  const avg7 = (U.sum(last7, (k) => s.water[k] || 0) / 7).toFixed(1);

  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('droplet')}今日饮水</h2><p class="card-sub">${U.fmtDateCN(today)} · 目标 ${goal} 杯</p></div>
            <button class="btn btn-sm" data-act="goal" type="button">设置目标</button></div>
          <div class="row"><div class="stat-value tone-info">${count}<small> / ${goal} 杯</small></div><span class="spacer"></span><span class="chip chip-info">${pct}% 已完成</span></div>
          <div class="progress mt-8"><span style="width:${pct}%;background:linear-gradient(90deg,#a9d9f2,#5b95cf)"></span></div>
          <div class="water-cups mt-16">
            ${Array.from({ length: cupCount }, (_, i) => `<button type="button" class="water-cup ${i < count ? 'filled' : ''}" data-cup="${i + 1}" title="${i + 1} 杯">${ui.icon('droplet')}</button>`).join('')}
          </div>
          <div class="row mt-16"><button class="btn btn-sm" data-act="minus" type="button">− 减少一杯</button><button class="btn btn-primary btn-sm" data-act="plus" type="button">${ui.icon('plus')}喝了一杯</button></div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('chart')}近 7 天饮水</h2><p class="card-sub">虚线目标为 ${goal} 杯 / 天</p></div></div>
          ${ui.barChart(last7.map((k) => ({
            label: '周' + U.WEEKDAYS[U.fromKey(k).getDay()],
            value: s.water[k] || 0,
            display: s.water[k] || '',
            color: (s.water[k] || 0) >= goal ? 'var(--info)' : '#bcd8e9'
          })), { height: 160, maxItems: 7 })}
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('今日杯数', String(count), { iconName: 'droplet', unit: '杯', tone: 'tone-info' })}
          ${ui.statCard('连续达标', String(streak), { iconName: 'flag', unit: '天', tone: 'tone-primary' })}
          ${ui.statCard('累计达标', String(achieved), { iconName: 'check', unit: '天' })}
          ${ui.statCard('7 日均值', avg7, { iconName: 'chart', unit: '杯' })}
        </div>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('info')}饮水小提示</h2></div>
          <div class="notice">建议将每日饮水量分散到多个时段，每次少量饮用。点击上方水杯可直接设定当天杯数，再次点击已填满的水杯会减少一杯。</div>
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  const today = U.todayKey();
  const setCount = (n) => {
    store.update((s) => { s.water[today] = Math.max(0, Math.min(30, n)); });
    ui.redraw();
  };
  const s = store.getState();
  root.querySelectorAll('[data-cup]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.cup);
    setCount(s.water[today] === n ? n - 1 : n);
  }));
  root.querySelector('[data-act="plus"]').addEventListener('click', () => setCount((s.water[today] || 0) + 1));
  root.querySelector('[data-act="minus"]').addEventListener('click', () => setCount((s.water[today] || 0) - 1));
  root.querySelector('[data-act="goal"]').addEventListener('click', () => {
    ui.openModal({
      title: '设置每日饮水目标',
      body: `<div class="field"><label>目标杯数（1 - 20）</label><input class="input" type="number" name="goal" min="1" max="20" value="${s.waterGoal}"></div>
        <p class="modal-note">一杯按约 250 毫升估算，可按个人情况调整。</p>`,
      onConfirm(fd) {
        const goal = U.clamp(U.num(fd.get('goal'), 8), 1, 20);
        store.update((st) => { st.waterGoal = goal; });
        ui.toast('目标已更新', 'success'); ui.redraw();
      }
    });
  });
}
