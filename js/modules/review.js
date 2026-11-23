// 周 / 月数据复盘看板
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '数据复盘';
export const subtitle = '周月汇总，回顾与调整';

let period = 'week';

function periodDays(periodKey) {
  const today = U.todayKey();
  if (periodKey === 'month') {
    const start = today.slice(0, 7) + '-01';
    const count = U.diffDays(start, today) + 1;
    return U.lastNDays(count, today);
  }
  return U.lastNDays(7, today);
}

function insights(d) {
  const out = [];
  if (d.workoutDays >= 3) out.push(`本期运动 ${d.workoutDays} 天，连续打卡 ${d.streakF} 天，节奏稳定。`);
  else out.push('运动频率偏低，建议每周至少安排 3 次活动。');
  if (d.studyMinutes >= 300) out.push(`学习累计 ${U.fmtMinutes(d.studyMinutes)}，覆盖 ${d.studyDays} 天，投入充分。`);
  else out.push(`学习累计 ${U.fmtMinutes(d.studyMinutes)}，可以尝试用番茄钟拆分任务。`);
  if (d.waterAvg >= store.getState().waterGoal) out.push(`饮水日均 ${d.waterAvg} 杯，已达到目标。`);
  else out.push(`饮水日均 ${d.waterAvg} 杯，离目标还有提升空间。`);
  if (d.balance < 0) out.push(`本期支出超过收入 ¥${U.money(Math.abs(d.balance), 0)}，建议检查大额分类。`);
  else if (d.income > 0) out.push(`本期结余 ¥${U.money(d.balance, 0)}，储蓄率 ${((d.balance / d.income) * 100).toFixed(0)}%。`);
  if (d.todosDone >= 5) out.push(`完成 ${d.todosDone} 项待办，执行情况良好。`);
  return out;
}

export function render() {
  const s = store.getState();
  const days = periodDays(period);
  const today = U.todayKey();
  const start = days[0], end = days.at(-1);
  const inPeriod = (date) => !!date && date >= start && date <= end;
  const workouts = s.workouts.filter((w) => inPeriod(w.date));
  const studies = s.studies.filter((w) => inPeriod(w.date));
  const pomos = s.pomodoros.filter((w) => inPeriod(w.date));
  const txns = s.txns.filter((w) => inPeriod(w.date));
  const todosDone = s.todos.filter((t) => t.done && t.completedAt && inPeriod(t.completedAt.slice(0, 10))).length;
  const income = U.sum(txns.filter((t) => t.type === 'income'), (t) => t.amount);
  const expense = U.sum(txns.filter((t) => t.type === 'expense'), (t) => t.amount);
  const studyMinutes = U.sum(studies, (x) => x.minutes);
  const focusMinutes = U.sum(pomos, (x) => x.minutes);
  const waterTotal = U.sum(days, (k) => s.water[k] || 0);
  const waterAvg = days.length ? (waterTotal / days.length).toFixed(1) : '0';
  const waterHit = days.filter((k) => (s.water[k] || 0) >= s.waterGoal).length;
  const d = {
    workoutDays: new Set(workouts.map((w) => w.date)).size,
    studyDays: new Set(studies.map((w) => w.date)).size,
    studyMinutes, focusMinutes, income, expense, balance: income - expense,
    waterAvg: Number(waterAvg), todosDone,
    streakF: U.streakInfo(s.workouts.map((w) => w.date)).current
  };
  const expenseCats = {};
  txns.filter((t) => t.type === 'expense').forEach((t) => { const k = t.category || '其他'; expenseCats[k] = (expenseCats[k] || 0) + U.num(t.amount); });
  const segColors = ['#2f9e7d', '#5b95cf', '#dda23c', '#8a7cd2', '#e1685a', '#79c9b4', '#a5b4ad'];
  const segments = Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value], i) => ({ label, value, color: segColors[i % segColors.length] }));
  const maxDays = period === 'month' ? 31 : 7;
  const chartDays = days.length > maxDays ? days.slice(-maxDays) : days;
  const labelEvery = chartDays.length > 14 ? 2 : 1;

  return `
    <section class="card">
      <div class="card-head">
        <div><h2 class="card-title">${ui.icon('chart')}复盘区间</h2><p class="card-sub">${U.fmtDateCN(start)} — ${U.fmtDateCN(end)} · 共 ${days.length} 天</p></div>
        <div class="segmented"><button type="button" data-period="week" class="${period === 'week' ? 'active' : ''}">本周</button><button type="button" data-period="month" class="${period === 'month' ? 'active' : ''}">本月</button></div>
      </div>
      <div class="stat-grid">
        ${ui.statCard('运动天数', String(d.workoutDays), { iconName: 'dumbbell', unit: '天', tone: 'tone-primary' })}
        ${ui.statCard('学习时长', String(studyMinutes), { iconName: 'book', unit: '分钟', tone: 'tone-purple' })}
        ${ui.statCard('专注番茄', String(pomos.length), { iconName: 'coffee', unit: '个' })}
        ${ui.statCard('饮水达标', String(waterHit), { iconName: 'droplet', unit: '天', tone: 'tone-info' })}
      </div>
    </section>

    <div class="grid grid-main mt-16">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('layers')}每日投入分布</h2><p class="card-sub">学习与运动时长合计，单位：分钟</p></div></div>
          ${ui.barChart(chartDays.map((k, i) => ({
            label: i % labelEvery === 0 || i === chartDays.length - 1 ? `${U.fromKey(k).getMonth() + 1}/${U.fromKey(k).getDate()}` : '',
            value: U.sum(studies.filter((x) => x.date === k), (x) => x.minutes) + U.sum(workouts.filter((x) => x.date === k), (x) => x.minutes)
          })), { height: 172, maxItems: 31 })}
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('droplet')}饮水趋势</h2><p class="card-sub">目标 ${s.waterGoal} 杯 / 天</p></div></div>
          ${ui.lineChart(chartDays.map((k) => s.water[k] || 0), { height: 150, color: 'var(--info)', labels: chartDays.map((k, i) => (i % labelEvery === 0 ? `${U.fromKey(k).getDate()}` : '')) })}
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('wallet')}财务概览</h2></div>
          <div class="summary-line"><span>收入</span><span class="tone-primary">+¥${U.money(income, 0)}</span></div>
          <div class="summary-line"><span>支出</span><span class="tone-danger">−¥${U.money(expense, 0)}</span></div>
          <div class="summary-line"><span>结余</span><span>¥${U.money(d.balance, 0)}</span></div>
          ${ui.donutChart(segments, { centerLabel: '支出', centerValue: '¥' + U.money(expense, 0) })}
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('check')}完成情况</h2></div>
          <div class="summary-line"><span>完成任务</span><span>${todosDone} 项</span></div>
          <div class="summary-line"><span>学习天数</span><span>${d.studyDays} 天</span></div>
          <div class="summary-line"><span>专注时长</span><span>${U.fmtMinutes(focusMinutes)}</span></div>
          <div class="summary-line"><span>饮水日均</span><span>${waterAvg} 杯</span></div>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('spark')}复盘洞察</h2></div>
          <div class="stack" style="gap:8px">${insights(d).map((text) => `<div class="notice">${U.esc(text)}</div>`).join('')}</div>
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.period; ui.redraw(); }));
}
