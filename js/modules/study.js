// 学习打卡：时长、内容、热力图与累计统计
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '学习打卡';
export const subtitle = '专注积累，看见成长的轨迹';

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const todayMinutes = U.sum(s.studies.filter((x) => x.date === today), (x) => x.minutes);
  const totalMinutes = U.sum(s.studies, (x) => x.minutes);
  const days = new Set(s.studies.map((x) => x.date));
  const avg = days.size ? Math.round(totalMinutes / days.size) : 0;
  const heatMap = {};
  s.studies.forEach((x) => { heatMap[x.date] = (heatMap[x.date] || 0) + U.num(x.minutes); });
  const subjects = {};
  s.studies.forEach((x) => { const k = x.subject || '未分类'; subjects[k] = (subjects[k] || 0) + U.num(x.minutes); });
  const subjectList = Object.entries(subjects).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const maxSubject = Math.max(1, ...subjectList.map((x) => x.value));
  const recent = U.byDateDesc(s.studies, 'date').slice(0, 10);
  const trend = U.lastNDays(14);
  const weekMinutes = U.sum(s.studies.filter((x) => x.date >= U.weekStart(today)), (x) => x.minutes);

  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('book')}学习记录</h2><p class="card-sub">今日已记录 ${U.fmtMinutes(todayMinutes)}</p></div></div>
          <form id="studyForm">
            <div class="field-row three">
              <div class="field"><label>日期</label><input class="input" type="date" name="date" value="${today}"></div>
              <div class="field"><label>时长（分钟）</label><input class="input" type="number" name="minutes" value="30" min="1" max="600"></div>
              <div class="field"><label>分类</label><input class="input" name="subject" list="subjectOptions" placeholder="如：英语"></div>
            </div>
            <datalist id="subjectOptions">${[...new Set(s.studies.map((x) => x.subject).filter(Boolean))].map((x) => `<option value="${U.esc(x)}"></option>`).join('')}</datalist>
            <div class="field"><label>学习内容</label><textarea class="textarea" name="content" placeholder="记录今天学到的知识点或进展"></textarea></div>
          </form>
          <button class="btn btn-primary btn-block" type="button" data-act="add">${ui.icon('plus')}提交打卡</button>
        </section>

        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('layers')}打卡热力图</h2><p class="card-sub">近 18 周 · 颜色越深代表时长越长</p></div></div>
          ${ui.heatmap(heatMap, { weeks: 18, unit: '分钟' })}
        </section>

        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('chart')}近 14 天趋势</h2><p class="card-sub">单位：分钟</p></div></div>
          ${ui.barChart(trend.map((k) => ({ label: `${U.fromKey(k).getMonth() + 1}/${U.fromKey(k).getDate()}`, value: heatMap[k] || 0, display: heatMap[k] || '' })), { height: 168, maxItems: 14 })}
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('今日学习', String(todayMinutes), { iconName: 'clock', unit: '分钟', tone: 'tone-primary' })}
          ${ui.statCard('本周学习', String(weekMinutes), { iconName: 'calendar', unit: '分钟' })}
          ${ui.statCard('累计时长', String(totalMinutes), { iconName: 'timer', unit: '分钟', tone: 'tone-purple' })}
          ${ui.statCard('打卡天数', String(days.size), { iconName: 'flag', unit: '天' })}
        </div>
        <section class="card">
          <div class="summary-line"><span>累计小时数</span><span>${(totalMinutes / 60).toFixed(1)} 小时</span></div>
          <div class="summary-line"><span>平均每次时长</span><span>${avg} 分钟</span></div>
          <div class="summary-line"><span>最长连续打卡</span><span>${U.streakInfo([...days]).longest} 天</span></div>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('layers')}分类分布</h2></div>
          ${subjectList.length ? `<div class="bar-list">${subjectList.map((x) => `
            <div class="bar-row"><span class="bar-label">${U.esc(x.label)}</span><span class="progress"><span style="width:${(x.value / maxSubject) * 100}%"></span></span><span class="bar-value">${x.value} 分</span></div>`).join('')}</div>` : ui.emptyState('暂无分类数据', 'chart')}
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('clock')}最近学习</h2></div>
          ${recent.length ? `<div class="list">${recent.map((x) => `
            <div class="list-item"><div class="list-main"><div class="list-title">${U.esc(x.subject || '学习')} · ${U.fmtMinutes(x.minutes)}</div>
              <div class="list-meta">${U.fmtDateCN(x.date)}${x.content ? ' · ' + U.esc(x.content) : ''}</div></div>
              <button class="mini-btn del" data-act="del" data-id="${x.id}" title="删除">${ui.icon('trash')}</button></div>`).join('')}</div>` : ui.emptyState('还没有学习记录', 'book')}
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelector('[data-act="add"]').addEventListener('click', () => {
    const fd = new FormData(root.querySelector('#studyForm'));
    const minutes = U.num(fd.get('minutes'));
    if (minutes <= 0) { ui.toast('请输入有效时长', 'error'); return; }
    store.addItem('studies', {
      date: fd.get('date') || U.todayKey(), minutes,
      subject: String(fd.get('subject') || '').trim() || '学习',
      content: String(fd.get('content') || '').trim()
    });
    ui.toast('学习打卡成功', 'success'); ui.redraw();
  });
  root.querySelectorAll('[data-act="del"]').forEach((b) => b.addEventListener('click', () => {
    ui.confirmDialog({ title: '删除记录', message: '确定删除这条学习记录吗？', onConfirm() { store.removeItem('studies', b.dataset.id); ui.toast('已删除'); ui.redraw(); } });
  }));
}
