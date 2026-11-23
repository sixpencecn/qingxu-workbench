// 首页概览：今日安排、进度与快捷操作
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '概览';
export const subtitle = '今天的安排与进度，一目了然';

const PRIORITY = { high: '高', mid: '中', low: '低' };
const PRIORITY_CHIP = { high: 'chip-danger', mid: 'chip-warn', low: '' };

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const events = s.events.filter((e) => e.date === today).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const active = s.todos.filter((t) => !t.archived);
  const pending = active.filter((t) => !t.done);
  const overdue = pending.filter((t) => t.due && t.due < today);
  const focusToday = s.pomodoros.filter((p) => p.date === today);
  const focusMinutes = U.sum(focusToday, (p) => p.minutes);
  const studyMinutes = U.sum(s.studies.filter((x) => x.date === today), (x) => x.minutes);
  const water = s.water[today] || 0;
  const workoutDone = s.workouts.some((w) => w.date === today);
  const monthPrefix = today.slice(0, 7);
  const monthTx = s.txns.filter((t) => t.date.startsWith(monthPrefix));
  const expenseMonth = U.sum(monthTx.filter((t) => t.type === 'expense'), (t) => t.amount);
  const expenseToday = U.sum(s.txns.filter((t) => t.date === today && t.type === 'expense'), (t) => t.amount);
  const waterPct = Math.min(100, Math.round((water / s.waterGoal) * 100));
  const streakF = U.streakInfo(s.workouts.map((w) => w.date)).current;
  const streakS = U.streakInfo(s.studies.map((w) => w.date)).current;
  const streakW = U.streakInfo(Object.keys(s.water).filter((k) => (s.water[k] || 0) > 0)).current;
  const bestStreak = Math.max(streakF, streakS, streakW);
  const weekDays = U.lastNDays(7);

  const quickActions = `
    <div class="hero-actions">
      <button class="btn btn-primary btn-sm" data-act="quick-todo" type="button">${ui.icon('plus')} 新建待办</button>
      <button class="btn btn-soft btn-sm" data-act="quick-focus" type="button">${ui.icon('timer')} 开始专注</button>
      <button class="btn btn-sm" data-act="quick-study" type="button">${ui.icon('book')} 学习打卡</button>
      <button class="btn btn-sm" data-act="quick-expense" type="button">${ui.icon('wallet')} 记一笔</button>
    </div>`;

  const eventRows = events.length ? events.slice(0, 4).map((e) => `
    <div class="list-item">
      <span class="chip chip-primary">${e.time ? U.fmtTime(e.time) : '全天'}</span>
      <div class="list-main"><div class="list-title">${U.esc(e.title)}</div>${e.note ? `<div class="list-meta">${U.esc(e.note)}</div>` : ''}</div>
      ${e.reminder !== null && e.reminder !== undefined ? `<span class="chip" title="提醒">${ui.icon('bell')}</span>` : ''}
    </div>`).join('') : ui.emptyState('今天还没有安排，添加一件期待的事吧', 'calendar');

  const todoRows = pending.length ? pending.slice(0, 5).map((t) => `
    <div class="list-item todo-item ${t.due && t.due < today ? 'overdue' : ''}">
      <button type="button" class="checkbox" data-act="toggle-todo" data-id="${t.id}" aria-label="完成">${ui.icon('check')}</button>
      <div class="list-main">
        <div class="list-title">${U.esc(t.title)}</div>
        <div class="list-meta"><span class="chip ${PRIORITY_CHIP[t.priority] || ''}">${PRIORITY[t.priority] || '中'}</span>${t.due ? `<span class="${t.due < today ? 'tone-danger' : ''}">${t.due === today ? '今天到期' : U.fmtDateCN(t.due)}</span>` : ''}</div>
      </div>
    </div>`).join('') : ui.emptyState('待办已清空，状态很好', 'check');

  const goalRows = s.goals.slice(0, 2).map((g) => {
    const pct = Math.min(100, Math.round((U.num(g.saved) / Math.max(1, U.num(g.target))) * 100));
    return `<div class="mt-8"><div class="row small"><span class="strong">${U.esc(g.name)}</span><span class="spacer muted">${U.money(g.saved, 0)} / ${U.money(g.target, 0)}</span><span class="tone-primary strong">${pct}%</span></div><div class="progress mt-8"><span style="width:${pct}%"></span></div></div>`;
  }).join('');

  return `
    <div class="card hero-card">
      <div class="row"><div class="flex"><div class="small muted">${U.fmtDateCN(today)}</div><div class="hero-title">${greeting()}，今天也按自己的节奏来</div><div class="hero-sub">已完成 ${active.length - pending.length} 项任务 · 专注 ${focusToday.length} 次 · 记录 ${studyMinutes} 分钟学习</div></div></div>
      ${quickActions}
    </div>

    <div class="stat-grid mt-16">
      ${ui.statCard('今日日程', String(events.length), { iconName: 'calendar', foot: '项安排', click: 'calendar' })}
      ${ui.statCard('待办剩余', String(pending.length), { iconName: 'todo', foot: overdue.length ? `${overdue.length} 项已逾期` : '节奏正常', tone: overdue.length ? 'tone-danger' : '', click: 'todos' })}
      ${ui.statCard('连续打卡', String(bestStreak), { iconName: 'flag', foot: '天 · 当前最佳', tone: 'tone-primary', click: 'fitness' })}
      ${ui.statCard('今日专注', String(focusMinutes), { iconName: 'timer', unit: '分钟', foot: `${focusToday.length} 个番茄`, tone: 'tone-purple', click: 'pomodoro' })}
    </div>

    <div class="grid grid-main mt-16">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('calendar')}今日日程</h2><p class="card-sub">按时间排序，重要事项在前</p></div><button class="btn btn-sm" type="button" data-nav="calendar">查看日历</button></div>
          <div class="list">${eventRows}</div>
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('todo')}待办清单</h2><p class="card-sub">点击方框即可完成</p></div><button class="btn btn-sm" type="button" data-nav="todos">全部任务</button></div>
          <div class="list">${todoRows}</div>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('layers')}今日进度</h2></div>
          <div class="row small"><span>饮水</span><span class="spacer muted">${water} / ${s.waterGoal} 杯</span><span class="strong">${waterPct}%</span></div>
          <div class="progress mt-8"><span style="width:${waterPct}%"></span></div>
          <div class="summary-line mt-16"><span>健身打卡</span><span class="${workoutDone ? 'tone-primary' : 'muted'}">${workoutDone ? '已完成' : '未完成'}</span></div>
          <div class="summary-line"><span>学习时长</span><span>${U.fmtMinutes(studyMinutes)}</span></div>
          <div class="summary-line"><span>今日支出</span><span class="tone-danger">¥${U.money(expenseToday)}</span></div>
          <div class="summary-line"><span>本月结余</span><span class="tone-primary">¥${U.money(U.sum(monthTx, (t) => (t.type === 'income' ? 1 : -1) * U.num(t.amount)))}</span></div>
          <button class="btn btn-soft btn-block mt-16" type="button" data-act="quick-water">${ui.icon('droplet')}喝一杯水 +1</button>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('chart')}近 7 天学习分钟</h2></div>
          ${ui.barChart(weekDays.map((k) => ({ label: U.fromKey(k).getDate() + '', value: U.sum(s.studies.filter((x) => x.date === k), (x) => x.minutes) })), { height: 140, maxItems: 7 })}
        </section>
        ${s.goals.length ? `<section class="card"><div class="card-head"><h2 class="card-title">${ui.icon('target')}储蓄目标</h2><button class="btn btn-sm" type="button" data-nav="finance">管理</button></div>${goalRows}</section>` : ''}
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    const s = store.getState();
    const today = U.todayKey();
    if (act === 'quick-todo') {
      ui.openModal({
        title: '新建待办',
        body: `<div class="field"><label>任务内容</label><input class="input" name="title" placeholder="要完成什么？" required></div>
          <div class="field-row"><div class="field"><label>优先级</label><select class="select" name="priority"><option value="mid">中</option><option value="high">高</option><option value="low">低</option></select></div>
          <div class="field"><label>截止日期</label><input class="input" type="date" name="due" value="${today}"></div></div>`,
        onConfirm(fd) {
          const t = String(fd.get('title') || '').trim();
          if (!t) { ui.toast('请输入任务内容', 'error'); return false; }
          store.addItem('todos', { title: t, priority: fd.get('priority'), due: fd.get('due') || '', done: false, archived: false });
          ui.toast('待办已添加', 'success'); ui.refresh();
        }
      });
    }
    if (act === 'quick-focus') ui.go('pomodoro');
    if (act === 'quick-study') {
      ui.openModal({
        title: '学习打卡',
        body: `<div class="field-row"><div class="field"><label>学习时长（分钟）</label><input class="input" type="number" name="minutes" value="30" min="1" max="600"></div><div class="field"><label>分类</label><input class="input" name="subject" placeholder="如：英语 / 专业课程"></div></div>
          <div class="field"><label>学习内容</label><textarea class="textarea" name="content" placeholder="今天学到了什么？"></textarea></div>`,
        onConfirm(fd) {
          const m = U.num(fd.get('minutes'));
          if (m <= 0) { ui.toast('请输入有效的学习时长', 'error'); return false; }
          store.addItem('studies', { date: today, minutes: m, subject: String(fd.get('subject') || '').trim() || '学习', content: String(fd.get('content') || '').trim() });
          ui.toast('学习打卡成功', 'success'); ui.refresh();
        }
      });
    }
    if (act === 'quick-expense') {
      ui.openModal({
        title: '记一笔',
        body: `<div class="field"><label>类型与金额</label><div class="field-row"><select class="select" name="type"><option value="expense">支出</option><option value="income">收入</option></select><input class="input" type="number" name="amount" step="0.01" min="0.01" placeholder="金额"></div></div>
          <div class="field"><label>分类</label><input class="input" name="category" placeholder="如：餐饮 / 交通 / 工资"></div>
          <div class="field"><label>备注</label><input class="input" name="note" placeholder="可选"></div>`,
        onConfirm(fd) {
          const amount = U.num(fd.get('amount'));
          if (amount <= 0) { ui.toast('请输入有效金额', 'error'); return false; }
          store.addItem('txns', { date: today, type: fd.get('type'), amount, category: String(fd.get('category') || '').trim() || '其他', note: String(fd.get('note') || '').trim() });
          ui.toast('已记录', 'success'); ui.refresh();
        }
      });
    }
    if (act === 'quick-water') {
      store.update((st) => { st.water[today] = (st.water[today] || 0) + 1; });
      ui.toast(`今日已饮水 ${s.water[today] + 1} 杯`, 'success'); ui.refresh();
    }
    if (act === 'toggle-todo') {
      const t = s.todos.find((x) => x.id === btn.dataset.id);
      if (t) { store.patchItem('todos', t.id, { done: !t.done }); ui.refresh(); }
    }
  }));
}
