// 灵感速记：碎片想法与标签分类
import * as store from '../store.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '灵感速记';
export const subtitle = '捕捉一闪而过的想法';

let activeTag = '';
let query = '';

function allTags() {
  const set = new Set();
  store.getState().ideas.forEach((i) => (i.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

function filtered() {
  const q = query.trim().toLowerCase();
  return U.byDateDesc(store.getState().ideas, 'createdAt').filter((i) => {
    if (activeTag && !(i.tags || []).includes(activeTag)) return false;
    if (q && !(`${i.text} ${(i.tags || []).join(' ')}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function listHTML() {
  const list = filtered();
  if (!list.length) return ui.emptyState(query || activeTag ? '没有匹配的灵感' : '还没有记录灵感', 'bulb');
  return `<div class="idea-masonry">${list.map((i) => `
    <div class="idea-card">
      <p>${U.esc(i.text)}</p>
      <div class="idea-tags">${(i.tags || []).map((t) => `<span class="chip chip-purple">#${U.esc(t)}</span>`).join('')}
        <span class="spacer"></span><span class="tiny muted">${i.createdAt ? new Date(i.createdAt).toLocaleDateString('zh-CN') : ''}</span></div>
      <div class="row mt-8"><button class="mini-btn" data-act="edit" data-id="${i.id}" title="编辑">${ui.icon('edit')}</button>
        <button class="mini-btn del" data-act="del" data-id="${i.id}" title="删除">${ui.icon('trash')}</button></div>
    </div>`).join('')}</div>`;
}

function ideaModal(idea = null) {
  ui.openModal({
    title: idea ? '编辑灵感' : '记录灵感',
    body: `<div class="field"><label>想法内容</label><textarea class="textarea" name="text" rows="4" placeholder="写下此刻的想法…" required>${U.esc(idea?.text || '')}</textarea></div>
      <div class="field"><label>标签</label><input class="input" name="tags" value="${U.esc((idea?.tags || []).join(', '))}" placeholder="用逗号分隔，如：产品, 阅读"></div>`,
    onConfirm(fd) {
      const text = String(fd.get('text') || '').trim();
      if (!text) { ui.toast('请输入想法内容', 'error'); return false; }
      const tags = U.parseTags(fd.get('tags'));
      if (idea) store.patchItem('ideas', idea.id, { text, tags });
      else store.addItem('ideas', { text, tags });
      ui.toast(idea ? '已更新' : '灵感已保存', 'success'); ui.redraw();
    }
  });
}

export function render() {
  const s = store.getState();
  const weekAgo = U.addDays(U.todayKey(), -6);
  const weekCount = s.ideas.filter((i) => (i.createdAt || '').slice(0, 10) >= weekAgo).length;
  const tags = allTags();
  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('bulb')}随手记</h2><p class="card-sub">不必整理措辞，先记下来再说</p></div></div>
          <form id="ideaForm">
            <div class="field"><textarea class="textarea" name="text" placeholder="此刻想到什么？" rows="3"></textarea></div>
            <div class="inline-form"><input class="input" name="tags" placeholder="标签（可选，用逗号分隔）"><button class="btn btn-primary" type="submit">${ui.icon('plus')}保存灵感</button></div>
          </form>
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('layers')}灵感列表</h2><p class="card-sub">共 ${s.ideas.length} 条记录</p></div>
            <div class="inline-form" style="flex:0 1 220px"><span class="input" style="display:flex;align-items:center;gap:6px;padding:6px 10px">${ui.icon('search')}<input id="ideaSearch" class="" style="border:0;outline:0;background:transparent;width:100%;font-size:12px" value="${U.esc(query)}" placeholder="搜索"></span></div></div>
          <div class="row mt-8" style="gap:6px">
            <button class="chip chip-btn ${activeTag === '' ? 'active' : ''}" data-tag="" type="button">全部</button>
            ${tags.map((t) => `<button class="chip chip-btn ${activeTag === t ? 'active' : ''}" data-tag="${U.esc(t)}" type="button">#${U.esc(t)}</button>`).join('')}
          </div>
          <div class="mt-16" id="ideaList">${listHTML()}</div>
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('全部灵感', String(s.ideas.length), { iconName: 'bulb', unit: '条' })}
          ${ui.statCard('本周新增', String(weekCount), { iconName: 'spark', unit: '条', tone: 'tone-primary' })}
          ${ui.statCard('标签数量', String(tags.length), { iconName: 'layers', unit: '个', tone: 'tone-purple' })}
          ${ui.statCard('当前筛选', String(filtered().length), { iconName: 'search', unit: '条', tone: 'tone-info' })}
        </div>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('info')}标签用法</h2></div>
          <div class="notice">在保存时用逗号分隔多个标签，例如「产品, 待读」。点击上方标签即可按分类筛选，搜索框支持内容关键词与标签匹配。</div>
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelector('#ideaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const text = String(fd.get('text') || '').trim();
    if (!text) return;
    store.addItem('ideas', { text, tags: U.parseTags(fd.get('tags')) });
    ui.toast('灵感已保存', 'success'); ui.redraw();
  });
  root.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => { activeTag = b.dataset.tag; ui.redraw(); }));
  root.querySelector('#ideaSearch').addEventListener('input', (e) => {
    query = e.target.value;
    document.getElementById('ideaList').innerHTML = listHTML();
  });
  root.querySelector('#ideaList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const idea = store.getState().ideas.find((x) => x.id === btn.dataset.id);
    if (!idea) return;
    if (btn.dataset.act === 'edit') ideaModal(idea);
    if (btn.dataset.act === 'del') {
      ui.confirmDialog({ title: '删除灵感', message: '确定删除这条灵感吗？', onConfirm() { store.removeItem('ideas', idea.id); ui.toast('已删除'); ui.redraw(); } });
    }
  });
}
