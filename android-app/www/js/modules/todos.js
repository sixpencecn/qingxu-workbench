// 待办任务：优先级、逾期、归档与状态管理
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '待办任务';
export const subtitle = '按优先级推进，完成一件划掉一件';

const PRIORITY = { high: ['高', 'chip-danger'], mid: ['中', 'chip-warn'], low: ['低', ''] };
const RANK = { high: 0, mid: 1, low: 2 };
const FILTERS = [['active', '进行中'], ['today', '今日 / 逾期'], ['done', '已完成'], ['archive', '归档']];
let filter = 'active';

function isOverdue(t, today) { return !t.done && !!t.due && t.due < today; }

function visibleTodos(s, today) {
  let list = s.todos.filter((t) => {
    if (filter === 'archive') return !!t.archived;
    if (t.archived) return false;
    if (filter === 'done') return !!t.done;
    if (filter === 'today') return !t.done && !!t.due && t.due <= today;
    return !t.done;
  });
  list = [...list].sort((a, b) => {
    if (filter === 'done') return String(b.completedAt || b.createdAt || '').localeCompare(String(a.completedAt || a.createdAt || ''));
    return (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1) || String(a.due || '9999').localeCompare(String(b.due || '9999'));
  });
  return list;
}

function editModal(t) {
  ui.openModal({
    title: '编辑任务',
    body: `<div class="field"><label>任务内容</label><input class="input" name="title" value="${U.esc(t.title)}" required></div>
      <div class="field-row"><div class="field"><label>优先级</label><select class="select" name="priority">
        ${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
      <div class="field"><label>截止日期</label><input class="input" type="date" name="due" value="${U.esc(t.due || '')}"></div></div>
      <div class="field"><label>备注</label><textarea class="textarea" name="note" placeholder="可选">${U.esc(t.note || '')}</textarea></div>`,
    onConfirm(fd) {
      const title = String(fd.get('title') || '').trim();
      if (!title) { ui.toast('请输入任务内容', 'error'); return false; }
      store.patchItem('todos', t.id, { title, priority: fd.get('priority'), due: fd.get('due') || '', note: String(fd.get('note') || '').trim() });
      ui.toast('已更新'); ui.redraw();
    }
  });
}

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const active = s.todos.filter((t) => !t.archived);
  const pending = active.filter((t) => !t.done);
  const overdue = pending.filter((t) => isOverdue(t, today));
  const dueToday = pending.filter((t) => t.due === today);
  const done = active.filter((t) => t.done);
  const list = visibleTodos(s, today);

  const rows = list.length ? list.map((t) => {
    const p = PRIORITY[t.priority] || PRIORITY.mid;
    const od = isOverdue(t, today);
    return `<div class="list-item todo-item ${t.done ? 'done' : ''} ${od ? 'overdue' : ''}">
      <span class="priority-bar priority-${t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'mid'}"></span>
      <button type="button" class="checkbox ${t.done ? 'checked' : ''}" data-act="toggle" data-id="${t.id}" aria-label="切换完成状态">${ui.icon('check')}</button>
      <div class="list-main">
        <div class="list-title">${U.esc(t.title)}</div>
        <div class="list-meta"><span class="chip ${p[1]}">${p[0]}优先</span>
          ${t.due ? `<span class="${od ? 'tone-danger strong' : ''}">${ui.icon('clock')}${od ? '逾期 · ' : ''}${U.fmtDateCN(t.due)}</span>` : ''}
          ${t.note ? `<span>${U.esc(t.note)}</span>` : ''}</div>
      </div>
      <div class="list-actions">
        <button class="mini-btn" data-act="edit" data-id="${t.id}" title="编辑">${ui.icon('edit')}</button>
        <button class="mini-btn" data-act="archive" data-id="${t.id}" title="${t.archived ? '恢复' : '归档'}">${ui.icon('archive')}</button>
        <button class="mini-btn del" data-act="del" data-id="${t.id}" title="删除">${ui.icon('trash')}</button>
      </div>
    </div>`;
  }).join('') : ui.emptyState(filter === 'archive' ? '归档区还是空的' : '这里没有任务，享受清爽吧', 'todo');

  return `
    <section class="card">
      <div class="card-head"><div><h2 class="card-title">${ui.icon('plus')}快速添加</h2><p class="card-sub">输入任务后按 Enter 即可添加</p></div></div>
      <form class="inline-form" id="todoAdd">
        <input class="input" name="title" placeholder="例如：完成季度总结" required>
        <select class="select" name="priority" style="flex:0 0 92px"><option value="mid">中优先</option><option value="high">高优先</option><option value="low">低优先</option></select>
        <input class="input" type="date" name="due" value="${today}" style="flex:0 0 148px" title="截止日期">
        <button class="btn btn-primary" type="submit">${ui.icon('plus')}添加</button>
      </form>
    </section>

    <div class="stat-grid mt-16">
      ${ui.statCard('进行中', String(pending.length), { iconName: 'todo', foot: '项未完成任务' })}
      ${ui.statCard('今日到期', String(dueToday.length), { iconName: 'clock', foot: '今天截止', tone: 'tone-info' })}
      ${ui.statCard('已逾期', String(overdue.length), { iconName: 'flag', foot: overdue.length ? '建议优先处理' : '保持得很好', tone: overdue.length ? 'tone-danger' : '' })}
      ${ui.statCard('已完成', String(done.length), { iconName: 'check', foot: '项已达成', tone: 'tone-primary' })}
    </div>

    <section class="card mt-16">
      <div class="card-head">
        <div class="segmented">${FILTERS.map(([k, l]) => `<button type="button" class="${filter === k ? 'active' : ''}" data-filter="${k}">${l}</button>`).join('')}</div>
        <span class="small muted">${list.length} 项</span>
      </div>
      <div class="list">${rows}</div>
    </section>`;
}

export function mount(root) {
  const form = root.querySelector('#todoAdd');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    if (!title) return;
    store.addItem('todos', { title, priority: fd.get('priority'), due: fd.get('due') || '', done: false, archived: false });
    ui.toast('任务已添加', 'success');
    ui.redraw();
  });
  root.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; ui.redraw(); }));
  root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const t = store.getState().todos.find((x) => x.id === id);
    if (!t) return;
    if (b.dataset.act === 'toggle') {
      store.patchItem('todos', id, { done: !t.done, completedAt: new Date().toISOString() });
      ui.redraw();
    }
    if (b.dataset.act === 'edit') editModal(t);
    if (b.dataset.act === 'archive') {
      store.patchItem('todos', id, { archived: !t.archived });
      ui.toast(t.archived ? '已恢复到列表' : '已归档', 'success'); ui.redraw();
    }
    if (b.dataset.act === 'del') {
      ui.confirmDialog({ title: '删除任务', message: `确定删除「${U.esc(t.title)}」吗？`, onConfirm() { store.removeItem('todos', id); ui.toast('已删除'); ui.redraw(); } });
    }
  }));
}
