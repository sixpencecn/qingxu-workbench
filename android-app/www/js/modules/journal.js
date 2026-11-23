// 生活相册：上传手机本地照片，记录生活片段
import * as store from '../store.js';
import * as photos from '../photos.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '生活相册';
export const subtitle = '用照片留住日常';

let activeTag = '';
let query = '';
let cache = {};

function allTags() {
  const set = new Set();
  store.getState().moments.forEach((m) => (m.tags || []).forEach((t) => set.add(t)));
  return [...set].sort();
}

function filtered() {
  const q = query.trim().toLowerCase();
  return U.byDateDesc(store.getState().moments, 'date').filter((m) => {
    if (activeTag && !(m.tags || []).includes(activeTag)) return false;
    if (q && !(`${m.caption || ''} ${(m.tags || []).join(' ')} ${m.date || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function card(m) {
  return `<div class="photo-card">
    <div class="photo-thumb" data-act="view" data-id="${m.id}" role="button" tabindex="0" aria-label="查看照片">
      <img data-photo="${m.photoId}" alt="${U.esc(m.caption || '生活照片')}">
      <span class="photo-missing-tip">照片未找到</span>
    </div>
    <div class="photo-card-body">
      <div class="photo-caption">${U.esc(m.caption || '未命名照片')}</div>
      <div class="photo-meta">${U.fmtDateCN(m.date || U.todayKey(), false)}${(m.tags || []).length ? ' · ' + (m.tags || []).map((t) => '#' + U.esc(t)).join(' ') : ''}</div>
      <div class="row mt-8" style="gap:4px">
        <button class="mini-btn" data-act="edit" data-id="${m.id}" title="编辑">${ui.icon('edit')}</button>
        <button class="mini-btn del" data-act="del" data-id="${m.id}" title="删除">${ui.icon('trash')}</button>
      </div>
    </div>
  </div>`;
}

export function render() {
  const s = store.getState();
  const month = U.todayKey().slice(0, 7);
  const monthCount = s.moments.filter((m) => String(m.date || m.createdAt || '').startsWith(month)).length;
  const tags = allTags();
  const list = filtered();
  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('camera')}上传生活照片</h2><p class="card-sub">从手机相册选择，支持一次多选，自动压缩后离线保存</p></div></div>
          <form id="journalForm" novalidate>
            <div class="field-row">
              <div class="field"><label>记录日期</label><input class="input" type="date" name="date" value="${U.todayKey()}"></div>
              <div class="field"><label>标签（可选，逗号分隔）</label><input class="input" name="tags" placeholder="例如：旅行, 家人"></div>
            </div>
            <div class="field"><label>照片说明（可选）</label><input class="input" name="caption" placeholder="这一刻发生了什么？"></div>
            <input type="file" id="journalFiles" accept="image/*" multiple hidden>
            <button class="btn btn-primary btn-block" data-act="pick" type="button">${ui.icon('plus')}选择照片并上传</button>
          </form>
          <div class="notice mt-16">照片仅保存在本机的应用数据中，不上传服务器；压缩后存储，建议单批不超过 12 张。可在「数据与设置」中将照片一并导出备份。</div>
        </section>

        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('image')}照片墙</h2><p class="card-sub">共 ${s.moments.length} 张 · 当前显示 ${list.length} 张</p></div>
            <div class="inline-form" style="flex:0 1 210px"><span class="input" style="display:flex;align-items:center;gap:6px;padding:6px 10px">${ui.icon('search')}<input id="journalSearch" style="border:0;outline:0;background:transparent;width:100%;font-size:12px" value="${U.esc(query)}" placeholder="搜索说明或标签"></span></div></div>
          <div class="row mt-8" style="gap:6px">
            <button class="chip chip-btn ${activeTag === '' ? 'active' : ''}" data-tag="" type="button">全部</button>
            ${tags.map((t) => `<button class="chip chip-btn ${activeTag === t ? 'active' : ''}" data-tag="${U.esc(t)}" type="button">#${U.esc(t)}</button>`).join('')}
          </div>
          <div class="mt-16" id="photoList">${list.length ? `<div class="photo-grid">${list.map(card).join('')}</div>` : ui.emptyState(query || activeTag ? '没有匹配的照片' : '还没有照片，上传一张记录生活吧', 'camera')}</div>
        </section>
      </div>
      <div class="stack">
        <div class="stat-grid" style="grid-template-columns:1fr 1fr">
          ${ui.statCard('全部照片', String(s.moments.length), { iconName: 'image', unit: '张' })}
          ${ui.statCard('本月记录', String(monthCount), { iconName: 'camera', unit: '张', tone: 'tone-primary' })}
          ${ui.statCard('标签数量', String(tags.length), { iconName: 'layers', unit: '个', tone: 'tone-purple' })}
          ${ui.statCard('筛选结果', String(list.length), { iconName: 'search', unit: '张', tone: 'tone-info' })}
        </div>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('info')}使用建议</h2></div>
          <div class="notice">点击照片可全屏查看；使用标签分类后，点击标签即可筛选。照片与文字记录均保存在本机，换设备或清除数据前请先导出备份文件。</div>
        </section>
      </div>
    </div>`;
}

function openLightbox(m) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.innerHTML = `
    <button class="lightbox-close" data-close type="button" aria-label="关闭">${ui.icon('x')}</button>
    <img src="${U.esc(cache[m.photoId] || '')}" alt="${U.esc(m.caption || '生活照片')}">
    <div class="lightbox-meta"><strong>${U.esc(m.caption || '生活照片')}</strong><span>${U.fmtDateCN(m.date || U.todayKey())}</span></div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

function editModal(m) {
  ui.openModal({
    title: '编辑照片记录',
    body: `<div class="field"><label>日期</label><input class="input" type="date" name="date" value="${U.esc(m.date || U.todayKey())}"></div>
      <div class="field"><label>照片说明</label><input class="input" name="caption" value="${U.esc(m.caption || '')}" placeholder="这一刻发生了什么？"></div>
      <div class="field"><label>标签</label><input class="input" name="tags" value="${U.esc((m.tags || []).join(', '))}" placeholder="用逗号分隔"></div>`,
    onConfirm(fd) {
      store.patchItem('moments', m.id, {
        date: fd.get('date') || U.todayKey(),
        caption: String(fd.get('caption') || '').trim(),
        tags: U.parseTags(fd.get('tags'))
      });
      ui.toast('已更新', 'success'); ui.redraw();
    }
  });
}

async function fillThumbs(root) {
  cache = await photos.getAll();
  root.querySelectorAll('img[data-photo]').forEach((img) => {
    const data = cache[img.dataset.photo];
    if (data) img.src = data;
    else img.closest('.photo-card')?.classList.add('photo-missing');
  });
}

export function mount(root) {
  fillThumbs(root);
  const fileInput = root.querySelector('#journalFiles');

  root.querySelector('[data-act="pick"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const form = root.querySelector('#journalForm');
    const fd = new FormData(form);
    const date = fd.get('date') || U.todayKey();
    const caption = String(fd.get('caption') || '').trim();
    const tags = U.parseTags(fd.get('tags'));
    ui.toast(`正在处理 ${files.length} 张照片…`);
    try {
      const items = await photos.compressFiles(files, 12);
      for (const item of items) {
        await photos.put(item.id, item.data);
        store.addItem('moments', { photoId: item.id, date, caption, tags, name: item.name });
      }
      ui.toast(`已保存 ${items.length} 张照片`, 'success'); ui.redraw();
    } catch (err) {
      ui.toast(err?.message || '照片保存失败，请重试', 'error');
    }
    e.target.value = '';
  });

  root.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => { activeTag = b.dataset.tag; ui.redraw(); }));
  root.querySelector('#journalSearch').addEventListener('input', (e) => {
    query = e.target.value;
    const host = root.querySelector('#photoList');
    const list = filtered();
    host.innerHTML = list.length ? `<div class="photo-grid">${list.map(card).join('')}</div>` : ui.emptyState(query || activeTag ? '没有匹配的照片' : '还没有照片，上传一张记录生活吧', 'camera');
    fillThumbs(root);
  });

  root.querySelector('#photoList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const m = store.getState().moments.find((x) => x.id === btn.dataset.id);
    if (!m) return;
    if (btn.dataset.act === 'view') openLightbox(m);
    if (btn.dataset.act === 'edit') editModal(m);
    if (btn.dataset.act === 'del') {
      ui.confirmDialog({
        title: '删除照片', message: '确定删除这张照片及其文字记录吗？此操作不可撤销。',
        onConfirm() { store.removeItem('moments', m.id); photos.remove(m.photoId); ui.toast('已删除'); ui.redraw(); }
      });
    }
  });
}
