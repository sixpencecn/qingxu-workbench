// 数据与设置：备份导出、导入恢复、示例数据与安装说明
import * as store from '../store.js';
import * as photos from '../photos.js';
import * as U from '../utils.js';
import * as ui from '../ui.js';

export const title = '数据与设置';
export const subtitle = '备份、导入与个性化';

export function render() {
  const s = store.getState();
  const counts = [
    ['日程', s.events.length], ['待办', s.todos.length], ['运动', s.workouts.length], ['学习', s.studies.length],
    ['专注', s.pomodoros.length], ['收支', s.txns.length], ['储蓄目标', s.goals.length], ['灵感', s.ideas.length],
    ['生活照片', s.moments.length], ['收支照片', s.txns.filter((t) => t.photoId).length]
  ];
  const notifState = 'Notification' in window ? Notification.permission : 'unsupported';
  const notifLabel = { granted: '已开启', denied: '已拒绝', default: '未开启', unsupported: '浏览器不支持' }[notifState];

  return `
    <div class="grid grid-main">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('database')}本地数据备份</h2><p class="card-sub">建议每周导出一次，文件包含全部数据与照片</p></div></div>
          <div class="row"><button class="btn btn-primary" data-act="export" type="button">${ui.icon('download')}导出 JSON 备份</button>
            <button class="btn" data-act="import" type="button">${ui.icon('upload')}导入备份文件</button>
            <select class="select" id="importMode" style="flex:0 0 150px"><option value="merge">合并（保留现有）</option><option value="replace">覆盖全部数据</option></select>
            <input type="file" id="importFile" accept=".json,application/json" hidden></div>
          <div class="notice mt-16">导入前请确认备份文件来源可靠。新版备份包含生活相册与收支照片，旧版备份也可正常导入。选择「覆盖全部数据」会先清除当前数据与照片；「合并」按记录 ID 去重后追加。</div>
        </section>

        <section class="card">
          <div class="card-head"><div><h2 class="card-title">${ui.icon('layers')}数据概况</h2><p class="card-sub">当前浏览器本地存储占用约 ${U.prettyBytes(store.storageBytes())}</p></div></div>
          <div class="stat-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
            ${counts.map(([label, n]) => `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value" style="font-size:19px">${n}</div></div>`).join('')}
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('info')}提醒与通知</h2></div>
          <div class="summary-line"><span>系统通知权限</span><span>${notifLabel}</span></div>
          <button class="btn btn-soft mt-16" data-act="notify" type="button">${ui.icon('bell')}开启系统通知</button>
          <p class="modal-note mt-8">日程提醒在应用打开时生效；授予系统通知权限后，可同时收到桌面通知。浏览器不保证应用完全关闭后的后台提醒。</p>
        </section>
      </div>
      <div class="stack">
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('spark')}安装到安卓桌面</h2></div>
          <div class="stack" style="gap:10px">
            <div class="notice">1. 用安卓手机上的 Chrome / Edge 浏览器打开本应用链接。<br>2. 点击浏览器右上角菜单，选择「添加到主屏幕」或「安装应用」。<br>3. 确认后桌面出现「轻序」图标，点击即可全屏打开。</div>
            <div class="notice">iOS 用户：在 Safari 中点击底部「分享」按钮，选择「添加到主屏幕」。</div>
            <div class="notice warn">首次在线打开后，应用资源会被缓存到本地，之后可离线访问。数据保存在当前浏览器中，清除浏览器数据会一并删除记录，请务必定期导出备份。</div>
          </div>
          <button class="btn btn-soft btn-block mt-16" data-act="update" type="button">${ui.icon('reset')}检查应用更新</button>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">${ui.icon('database')}数据管理</h2></div>
          <button class="btn btn-block" data-act="demo" type="button">${ui.icon('spark')}载入示例数据（追加）</button>
          <button class="btn btn-danger btn-block mt-8" data-act="clear" type="button">${ui.icon('trash')}清空全部数据</button>
          <p class="modal-note mt-8">示例数据用于快速体验各模块图表效果；清空操作不可撤销，请先导出备份。</p>
        </section>
      </div>
    </div>`;
}

export function mount(root) {
  root.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'export') {
      photos.getAll().then((map) => {
        const payload = {
          format: 'qingxu-backup-v2',
          exportedAt: new Date().toISOString(),
          app: JSON.parse(store.exportData()),
          photos: map
        };
        U.downloadFile(`轻序备份-${U.todayKey()}.json`, JSON.stringify(payload));
        ui.toast('备份文件已下载（含照片）', 'success');
      }).catch(() => ui.toast('照片读取失败，请重试', 'error'));
    }
    if (act === 'import') root.querySelector('#importFile').click();
    if (act === 'notify') {
      if (!('Notification' in window)) { ui.toast('当前浏览器不支持系统通知', 'error'); return; }
      Notification.requestPermission().then((p) => {
        ui.toast(p === 'granted' ? '系统通知已开启' : '未获得通知权限', p === 'granted' ? 'success' : 'error');
        ui.redraw();
      });
    }
    if (act === 'update') {
      if (!('serviceWorker' in navigator)) { ui.toast('当前浏览器不支持离线缓存', 'error'); return; }
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) { ui.toast('尚未注册离线缓存'); return; }
        reg.update().then(() => ui.toast('已检查更新，重新打开即可生效', 'success')).catch(() => ui.toast('检查失败', 'error'));
      });
    }
    if (act === 'demo') {
      ui.confirmDialog({
        title: '载入示例数据', danger: false, confirmText: '载入示例',
        message: '将向当前数据追加一组示例日程、待办、打卡与记账记录，用于体验统计图表。',
        onConfirm() { store.seedDemo(); ui.toast('示例数据已载入', 'success'); ui.refresh(); }
      });
    }
    if (act === 'clear') {
      ui.confirmDialog({
        title: '清空全部数据', confirmText: '确认清空',
        message: '<strong>此操作不可撤销。</strong>所有日程、待办、打卡、记账、灵感与照片记录都会被删除。建议先导出备份。',
        onConfirm() { store.clearAll(); photos.clear(); ui.toast('数据已清空'); ui.refresh(); }
      });
    }
  }));

  root.querySelector('#importFile').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = root.querySelector('#importMode').value;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result);
        let appText = text;
        const parsed = JSON.parse(text);
        if (parsed && parsed.format === 'qingxu-backup-v2') {
          appText = JSON.stringify(parsed.app || {});
          await photos.applyBackup(parsed.photos, mode);
        }
        const result = store.importData(appText, mode);
        const total = result.events.length + result.todos.length + result.workouts.length + result.studies.length
          + result.pomodoros.length + result.txns.length + result.goals.length + result.ideas.length + result.moments.length;
        ui.toast(`导入成功：${total} 条记录（含照片）`, 'success');
        ui.refresh();
      } catch (err) {
        ui.toast(`导入失败：${err.message}`, 'error');
      }
      e.target.value = '';
    };
    reader.onerror = () => { ui.toast('文件读取失败', 'error'); e.target.value = ''; };
    reader.readAsText(file, 'utf-8');
  });
}
