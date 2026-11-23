// 记账储蓄：收支记录、分类统计与储蓄目标
import * as store from '../store.js';
import * as photos from '../photos.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '记账储蓄';
export const subtitle = '收支清晰，目标渐进';

const EXPENSE_CATS = ['餐饮', '交通', '购物', '居住', '娱乐', '医疗', '学习', '其他'];
const INCOME_CATS = ['工资', '奖金', '兼职', '理财', '其他'];
const COLORS = ['#2f9e7d', '#5b95cf', '#dda23c', '#8a7cd2', '#e1685a', '#79c9b4', '#a5b4ad', '#c78fae'];
let pendingPhoto = null;

function goalModal(goal = null) {
  ui.openModal({
    title: goal ? '编辑储蓄目标' : '新建储蓄目标',
    body: `<div class="field"><label>目标名称</label><input class="input" name="name" value="${U.esc(goal?.name || '')}" placeholder="例如：旅行基金" required></div>
      <div class="field-row"><div class="field"><label>目标金额（¥）</label><input class="input" type="number" name="target" min="1" step="0.01" value="${goal?.target || ''}" placeholder="10000"></div>
      <div class="field"><label>已储蓄（¥）</label><input class="input" type="number" name="saved" min="0" step="0.01" value="${goal?.saved || 0}"></div></div>
      <div class="field"><label>目标日期</label><input class="input" type="date" name="deadline" value="${U.esc(goal?.deadline || '')}"></div>`,
    onConfirm(fd) {
      const name = String(fd.get('name') || '').trim();
      const target = U.num(fd.get('target'));
      if (!name || target <= 0) { ui.toast('请填写名称与有效目标金额', 'error'); return false; }
      const payload = { name, target, saved: Math.max(0, U.num(fd.get('saved'))), deadline: fd.get('deadline') || '' };
      if (goal) store.patchItem('goals', goal.id, payload);
      else store.addItem('goals', payload);
      ui.toast(goal ? '目标已更新' : '目标已创建', 'success'); ui.redraw();
    }
  });
}

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const month = today.slice(0, 7);
  const monthTx = s.txns.filter((t) => String(t.date).startsWith(month));
  const income = U.sum(monthTx.filter((t) => t.type === 'income'), (t) => t.amount);
  const expense = U.sum(monthTx.filter((t) => t.type === 'expense'), (t) => t.amount);
  const balance = income - expense;
  const recent = U.byDateDesc(s.txns, 'date').slice(0, 14);
  const expenseCats = {};
  monthTx.filter((t) => t.type === 'expense').forEach((t) => { const k = t.category || '其他'; expenseCats[k] = (expenseCats[k] || 0) + U.num(t.amount); });
  const segments = Object.entries(expenseCats).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}`;
    return { key, label: `${d.getMonth() + 1}月`, income: U.sum(s.txns.filter((t) => t.type === 'income' && String(t.date).startsWith(key)), (t) => t.amount), expense: U.sum(s.txns.filter((t) => t.type === 'expense' && String(t.date).startsWith(key)), (t) => t.amount) };
  });

  const goalCards = s.goals.length ? s.goals.map((g) => {
    const pct = U.clamp(Math.round((U.num(g.saved) / Math.max(1, U.num(g.target))) * 100), 0, 100);
    const left = Math.max(0, U.num(g.target) - U.num(g.saved));
    const days = g.deadline ? U.diffDays(today, g.deadline) : null;
    return `<div class="goal-card">
      <div class="goal-head"><div><div class="goal-name">${U.esc(g.name)}</div><div class="goal-amount">¥${U.money(g.saved, 0)} / ¥${U.money(g.target, 0)} · 还差 ¥${U.money(left, 0)}</div></div>
        <span class="chip ${pct >= 100 ? 'chip-primary' : ''}">${pct}%</span></div>
      <div class="progress mt-8"><span style="width:${pct}%"></span></div>
      <div class="row mt-8"><span class="tiny muted">${g.deadline ? (days >= 0 ? `距目标日 ${days} 天` : '目标日已过') : '未设置日期'}</span><span class="spacer"></span>
        <button class="btn btn-sm btn-soft" data-act="deposit" data-id="${g.id}">存入</button>
        <button class="mini-btn" data-act="edit-goal" data-id="${g.id}" title="编辑">${ui.icon('edit')}</button>
        <button class="mini-btn del" data-act="del-goal" data-id="${g.id}" title="删除">${ui.icon('trash')}</button>
      </div>
    </div>`;
  }).join('') : ui.emptyState('还没有储蓄目标，创建一个吧', 'target');

  return `
    <section class="card">
      <div class="card-head"><div><h2 class="card-title">${ui.icon('plus')}记一笔</h2><p class="card-sub">支持收入与支出，自动归入月度统计</p></div></div>
      <form id="txnForm">
        <div class="field-row three">
          <div class="field"><label>类型</label><select class="select" name="type" id="txnType"><option value="expense">支出</option><option value="income">收入</option></select></div>
          <div class="field"><label>金额（¥）</label><input class="input" type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" required></div>
          <div class="field"><label>日期</label><input class="input" type="date" name="date" value="${today}"></div>
        </div>
        <div class="field-row"><div class="field"><label>分类</label><input class="input" name="category" list="catOptions" value="餐饮" placeholder="选择或输入分类"></div>
          <div class="field"><label>备注</label><input class="input" name="note" placeholder="可选"></div></div>
        <datalist id="catOptions">${[...EXPENSE_CATS, ...INCOME_CATS].map((c) => `<option value="${c}"></option>`).join('')}</datalist>
      </form>
      <div class="photo-attach">
        <input type="file" id="txnPhotoInput" accept="image/*" hidden>
        <button class="btn btn-sm" data-act="pick-photo" type="button">${ui.icon('camera')}附加照片（可选）</button>
        <span class="tiny muted" id="txnPhotoTip">${pendingPhoto ? '已选择 1 张照片' : '可上传小票、物品或生活照片'}</span>
        <img id="txnPhotoPreview" alt="照片预览" ${pendingPhoto ? `src="${U.esc(pendingPhoto.data)}"` : 'hidden'}>
      </div>
      <button class="btn btn-primary btn-block" data-act="add-txn" type="button">${ui.icon('plus')}保存记录</button>
    </section>

    <div class="stat-grid mt-16">
      ${ui.statCard('本月收入', U.money(income, 0), { iconName: 'up', unit: '元', tone: 'tone-primary' })}
      ${ui.statCard('本月支出', U.money(expense, 0), { iconName: 'down', unit: '元', tone: 'tone-danger' })}
      ${ui.statCard('本月结余', U.money(balance, 0), { iconName: 'wallet', unit: '元', tone: balance >= 0 ? 'tone-info' : 'tone-danger' })}
      ${ui.statCard('储蓄目标', String(s.goals.length), { iconName: 'target', unit: '个' })}
    </div>

    <div class="grid grid-main mt-16">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('clock')}近期收支</h2><p class="card-sub">最近 ${recent.length} 笔记录</p></div></div>
          ${recent.length ? `<div class="list">${recent.map((t) => `
            <div class="list-item"><span class="chip ${t.type === 'income' ? 'chip-primary' : 'chip-danger'}">${t.type === 'income' ? '收' : '支'}</span>
              <div class="list-main"><div class="list-title">${U.esc(t.category)} ${t.note ? '· ' + U.esc(t.note) : ''}</div><div class="list-meta">${U.fmtDateCN(t.date)}</div></div>
              <span class="strong ${t.type === 'income' ? 'tone-primary' : 'tone-danger'}">${t.type === 'income' ? '+' : '−'}¥${U.money(t.amount)}</span>
              ${t.photoId ? `<button class="mini-btn" data-act="view-photo" data-id="${t.id}" title="查看照片">${ui.icon('image')}</button>` : ''}
              <button class="mini-btn del" data-act="del-txn" data-id="${t.id}" title="删除">${ui.icon('trash')}</button></div>`).join('')}</div>` : ui.emptyState('还没有记账记录', 'wallet')}
        </section>
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('target')}储蓄目标</h2><p class="card-sub">记录进度，逐步达成</p></div>
            <button class="btn btn-primary btn-sm" data-act="new-goal" type="button">${ui.icon('plus')}新建目标</button></div>
          ${goalCards}
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('chart')}本月支出分类</h2></div>
          ${ui.donutChart(segments, { centerLabel: '本月支出', centerValue: '¥' + U.money(expense, 0) })}
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('chart')}近 6 个月收支</h2></div>
          ${ui.lineChart(months.map((m) => m.income), { height: 150, color: 'var(--primary)', labels: months.map((m) => m.label) })}
          <div class="chart-legend"><span><i class="legend-dot" style="background:var(--primary)"></i>收入趋势</span></div>
          ${ui.lineChart(months.map((m) => m.expense), { height: 150, color: 'var(--danger)', labels: months.map((m) => m.label) })}
          <div class="chart-legend"><span><i class="legend-dot" style="background:var(--danger)"></i>支出趋势</span></div>
        </section>
        <section class="card">
          <div class="summary-line"><span>本月结余率</span><span>${income ? ((balance / income) * 100).toFixed(0) : '0'}%</span></div>
          <div class="summary-line"><span>日均支出</span><span>¥${U.money(expense / new Date().getDate())}</span></div>
          <div class="summary-line"><span>累计记录</span><span>${s.txns.length} 笔</span></div>
        </section>
      </div>
    </div>`;
}

async function showTxnPhoto(id, caption) {
  const all = await photos.getAll();
  const data = all[id];
  if (!data) { ui.toast('照片不存在或已被清理', 'error'); return; }
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.innerHTML = `<button class="lightbox-close" data-close type="button" aria-label="关闭">${ui.icon('x')}</button>
    <img src="${U.esc(data)}" alt="${U.esc(caption || '记账照片')}">
    <div class="lightbox-meta"><strong>${U.esc(caption || '记账照片')}</strong></div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

export function mount(root) {
  root.querySelector('#txnType').addEventListener('change', (e) => {
    const input = root.querySelector('[name="category"]');
    input.value = e.target.value === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0];
  });
  root.querySelector('[data-act="add-txn"]').addEventListener('click', async () => {
    const fd = new FormData(root.querySelector('#txnForm'));
    const amount = U.num(fd.get('amount'));
    if (amount <= 0) { ui.toast('请输入有效金额', 'error'); return; }
    const photoId = pendingPhoto ? pendingPhoto.id : '';
    if (pendingPhoto) {
      try { await photos.put(pendingPhoto.id, pendingPhoto.data); }
      catch (err) { ui.toast(err?.message || '照片保存失败', 'error'); return; }
    }
    store.addItem('txns', {
      type: fd.get('type'), amount, date: fd.get('date') || U.todayKey(),
      category: String(fd.get('category') || '').trim() || '其他', note: String(fd.get('note') || '').trim(),
      photoId
    });
    pendingPhoto = null;
    ui.toast('记账成功', 'success'); ui.redraw();
  });

  const photoInput = root.querySelector('#txnPhotoInput');
  root.querySelector('[data-act="pick-photo"]').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await photos.compressFiles([file], 1);
      pendingPhoto = items[0];
      const preview = root.querySelector('#txnPhotoPreview');
      preview.src = pendingPhoto.data; preview.hidden = false;
      root.querySelector('#txnPhotoTip').textContent = '已选择 1 张照片';
      ui.toast('照片已就绪，保存记录后生效', 'success');
    } catch (err) { ui.toast(err?.message || '照片处理失败', 'error'); }
    e.target.value = '';
  });
  root.querySelectorAll('[data-act]').forEach((b) => {
    const act = b.dataset.act;
    if (act === 'new-goal') goalModal();
    if (act === 'edit-goal') {
      const g = store.getState().goals.find((x) => x.id === b.dataset.id);
      if (g) goalModal(g);
    }
    if (act === 'del-txn') {
      ui.confirmDialog({ title: '删除记录', message: '确定删除这笔收支记录吗？附加的照片也会一并删除。', onConfirm() {
        const txn = store.getState().txns.find((x) => x.id === b.dataset.id);
        if (txn?.photoId) photos.remove(txn.photoId);
        store.removeItem('txns', b.dataset.id); ui.toast('已删除'); ui.redraw();
      } });
    }
    if (act === 'view-photo') {
      const txn = store.getState().txns.find((x) => x.id === b.dataset.id);
      if (txn?.photoId) showTxnPhoto(txn.photoId, `${txn.category} · ${txn.note || U.fmtDateCN(txn.date)}`);
    }
    if (act === 'del-goal') {
      ui.confirmDialog({ title: '删除目标', message: '确定删除这个储蓄目标吗？', onConfirm() { store.removeItem('goals', b.dataset.id); ui.toast('已删除'); ui.redraw(); } });
    }
    if (act === 'deposit') {
      const g = store.getState().goals.find((x) => x.id === b.dataset.id);
      if (!g) return;
      ui.openModal({
        title: `存入 · ${g.name}`,
        body: `<div class="field"><label>存入金额（¥）</label><input class="input" type="number" name="amount" min="0.01" step="0.01" value="500"></div>
          <p class="modal-note">当前已储蓄 ¥${U.money(g.saved, 0)}，目标 ¥${U.money(g.target, 0)}。</p>`,
        onConfirm(fd) {
          const amount = U.num(fd.get('amount'));
          if (amount <= 0) { ui.toast('请输入有效金额', 'error'); return false; }
          store.patchItem('goals', g.id, { saved: U.num(g.saved) + amount });
          ui.toast('已存入储蓄目标', 'success'); ui.redraw();
        }
      });
    }
  });
}
