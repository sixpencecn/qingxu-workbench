// 应用入口：导航、路由、安装提示与日程提醒
import { icon, fillIcons, toast, go } from './ui.js';
import * as store from './store.js';
import * as home from './modules/home.js';
import * as more from './modules/more.js';
import * as calendar from './modules/calendar.js';
import * as todos from './modules/todos.js';
import * as fitness from './modules/fitness.js';
import * as study from './modules/study.js';
import * as water from './modules/water.js';
import * as pomodoro from './modules/pomodoro.js';
import * as finance from './modules/finance.js';
import * as ideas from './modules/ideas.js';
import * as journal from './modules/journal.js';
import * as review from './modules/review.js';
import * as settings from './modules/settings.js';

const views = { home, more, calendar, todos, fitness, study, water, pomodoro, finance, ideas, journal, review, settings };

const NAV_GROUPS = [
  { label: '总览', items: [['home', '概览', 'home'], ['review', '数据复盘', 'chart']] },
  { label: '计划管理', items: [['calendar', '日程日历', 'calendar'], ['todos', '待办任务', 'todo']] },
  { label: '习惯养成', items: [['fitness', '健身打卡', 'dumbbell'], ['study', '学习打卡', 'book'], ['water', '饮水打卡', 'droplet'], ['pomodoro', '番茄专注', 'timer']] },
  { label: '生活记录', items: [['finance', '记账储蓄', 'wallet'], ['journal', '生活相册', 'camera'], ['ideas', '灵感速记', 'bulb']] },
  { label: '系统', items: [['settings', '数据与设置', 'database']] }
];

const TABS = [
  ['home', '首页', 'home'],
  ['calendar', '日程', 'calendar'],
  ['todos', '待办', 'todo'],
  ['pomodoro', '专注', 'timer'],
  ['more', '更多', 'grid']
];
const MORE_ROUTES = new Set(['fitness', 'study', 'water', 'finance', 'ideas', 'journal', 'review', 'settings']);

const $ = (sel) => document.querySelector(sel);
let currentRoute = 'home';

function activeRoute() {
  const name = location.hash.replace(/^#\/?/, '').split('?')[0];
  return views[name] ? name : 'home';
}

function renderSideNav() {
  const pending = store.getState().todos.filter((t) => !t.done && !t.archived).length;
  $('#sideNav').innerHTML = NAV_GROUPS.map((g) => `
    <div class="side-group">
      <div class="side-group-title">${g.label}</div>
      ${g.items.map(([key, label, ico]) => `<button type="button" class="side-link ${key === currentRoute ? 'active' : ''}" data-nav="${key}">${icon(ico)}<span>${label}</span>${key === 'todos' && pending ? `<span class="chip chip-primary nav-badge">${pending}</span>` : ''}</button>`).join('')}
    </div>`).join('');
}

function renderBottomNav() {
  $('#bottomNav').innerHTML = TABS.map(([key, label, ico]) => {
    const active = key === currentRoute || (key === 'more' && MORE_ROUTES.has(currentRoute));
    return `<button type="button" class="tab ${active ? 'active' : ''}" data-nav="${key}">${icon(ico)}<span>${label}</span></button>`;
  }).join('');
}

function render(scroll = true) {
  currentRoute = activeRoute();
  const view = views[currentRoute];
  $('#pageTitle').textContent = typeof view.title === 'function' ? view.title() : view.title;
  $('#pageSubtitle').textContent = typeof view.subtitle === 'function' ? view.subtitle() : (view.subtitle || '');
  const now = new Date();
  $('#dateChip').textContent = `${now.getMonth() + 1}月${now.getDate()}日 周${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;
  renderSideNav();
  renderBottomNav();
  const root = $('#view');
  root.innerHTML = view.render();
  fillIcons(root);
  if (typeof view.mount === 'function') view.mount(root);
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

function setupNavigation() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-nav]');
    if (trigger) {
      go(trigger.dataset.nav);
      $('#sidebar').classList.remove('open');
      $('#sidebarOverlay').hidden = true;
    }
  });
  $('#menuBtn').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarOverlay').hidden = !$('#sidebar').classList.contains('open');
  });
  $('#sidebarOverlay').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').hidden = true;
  });
  $('#topSettings').addEventListener('click', () => go('settings'));
  window.addEventListener('hashchange', () => render(true));
  window.addEventListener('app:refresh', () => render(true));
  window.addEventListener('app:redraw', () => render(false));
}

function setupInstallPrompt() {
  let deferred = null;
  const banner = $('#installBanner');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || localStorage.getItem('qingxu.install.dismissed') === '1') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    setTimeout(() => { banner.hidden = false; }, 1600);
  });
  window.addEventListener('appinstalled', () => { banner.hidden = true; toast('已安装到桌面', 'success'); });

  if (isIOS) {
    setTimeout(() => {
      banner.hidden = false;
      banner.querySelector('.install-banner-text').innerHTML = '<strong>添加到主屏幕</strong><small>点击 Safari 分享按钮，选择「添加到主屏幕」</small>';
      $('#installBtn').hidden = true;
    }, 2600);
  }
  $('#installBtn').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === 'accepted') toast('正在安装到桌面', 'success');
    deferred = null;
    banner.hidden = true;
  });
  $('#installClose').addEventListener('click', () => {
    banner.hidden = true;
    localStorage.setItem('qingxu.install.dismissed', '1');
  });
}

function setupReminders() {
  const fired = new Set();
  function check() {
    const now = Date.now();
    for (const ev of store.getState().events) {
      if (!ev.date || !ev.time || ev.reminder === null || ev.reminder === undefined || ev.reminder === '') continue;
      const at = new Date(`${ev.date}T${String(ev.time).slice(0, 5)}:00`).getTime();
      if (!Number.isFinite(at)) continue;
      const trigger = at - Number(ev.reminder) * 60000;
      const key = `${ev.id}-${ev.date}-${ev.time}`;
      if (now >= trigger && now < at + 300000 && !fired.has(key)) {
        fired.add(key);
        const body = `${ev.title} · ${ev.time.slice(0, 5)}`;
        toast(`日程提醒：${body}`, 'success');
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('轻序 · 日程提醒', { body, icon: './icons/icon-192.png' }); } catch { /* 部分浏览器限制后台通知 */ }
        }
      }
    }
  }
  setTimeout(check, 2500);
  setInterval(check, 30000);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('离线缓存注册失败', err));
  });
}

function boot() {
  if (!location.hash) history.replaceState(null, '', '#/home');
  fillIcons(document);
  setupNavigation();
  pomodoro.init();
  setupInstallPrompt();
  setupReminders();
  registerServiceWorker();
  render();
}

boot();
