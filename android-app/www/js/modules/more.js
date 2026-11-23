// 全部模块快捷入口
import * as ui from '../ui.js';
import * as store from '../store.js';
import * as U from '../utils.js';

export const title = '全部模块';
export const subtitle = '快捷进入所有功能';

const TILES = [
  ['fitness', 'dumbbell', '健身打卡', '运动记录与连续统计'],
  ['study', 'book', '学习打卡', '时长记录与热力图'],
  ['water', 'droplet', '饮水打卡', '每日杯数与趋势'],
  ['pomodoro', 'timer', '番茄专注', '专注计时与统计'],
  ['finance', 'wallet', '记账储蓄', '收支分类与目标进度'],
  ['journal', 'camera', '生活相册', '上传照片记录生活'],
  ['ideas', 'bulb', '灵感速记', '碎片想法与标签'],
  ['review', 'chart', '数据复盘', '周月汇总分析'],
  ['settings', 'database', '数据与设置', '备份、导入与恢复']
];

export function render() {
  const s = store.getState();
  const today = U.todayKey();
  const hints = {
    fitness: s.workouts.filter((w) => w.date === today).length ? '今日已打卡' : '今日待打卡',
    study: `${U.sum(s.studies.filter((x) => x.date === today), (x) => x.minutes)} 分钟`,
    water: `${s.water[today] || 0} / ${s.waterGoal} 杯`,
    pomodoro: `${s.pomodoros.filter((p) => p.date === today).length} 次`,
    finance: `${s.txns.filter((t) => t.date === today).length} 笔`,
    journal: `${s.moments.length} 张`,
    ideas: `${s.ideas.length} 条`,
    review: '周 / 月视图',
    settings: `${U.prettyBytes(store.storageBytes())} 本地数据`
  };
  return `
    <div class="card">
      <div class="card-head"><div><h2 class="card-title">${ui.icon('grid')}功能导航</h2><p class="card-sub">所有数据均保存在本机，可离线使用</p></div></div>
      <div class="app-grid">
        ${TILES.map(([key, ico, name, desc]) => `<button type="button" class="app-tile" data-nav="${key}">
          <span class="tile-icon">${ui.icon(ico)}</span><strong>${name}</strong><small>${desc}</small>
          <div class="tiny tone-primary mt-8">${hints[key]}</div></button>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h2 class="card-title">${ui.icon('info')}使用提示</h2></div>
      <div class="notice">在安卓 Chrome 浏览器中打开本页面，选择「添加到主屏幕」即可安装为桌面应用；安装后可离线访问。数据存储在当前浏览器中，建议定期在「数据与设置」中导出备份文件。</div>
    </div>`;
}
