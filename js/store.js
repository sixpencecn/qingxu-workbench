// 本地持久化数据层：所有数据仅保存在浏览器 localStorage
import { uid, todayKey } from './utils.js';

const KEY = 'qingxu.workbench.v1';

export function defaultState() {
  return {
    version: 1,
    events: [],
    todos: [],
    workouts: [],
    studies: [],
    water: {},
    waterGoal: 8,
    pomodoros: [],
    focusPrefs: { focus: 25, short: 5, long: 15, autoNext: true },
    txns: [],
    goals: [],
    ideas: [],
    moments: [],
    meta: { createdAt: new Date().toISOString() }
  };
}

function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const out = { ...base };
  for (const key of ['events', 'todos', 'workouts', 'studies', 'pomodoros', 'txns', 'goals', 'ideas', 'moments']) {
    out[key] = Array.isArray(raw[key]) ? raw[key].filter((x) => x && typeof x === 'object') : [];
  }
  out.water = raw.water && typeof raw.water === 'object' && !Array.isArray(raw.water) ? raw.water : {};
  out.waterGoal = Number(raw.waterGoal) > 0 ? Number(raw.waterGoal) : 8;
  out.focusPrefs = { ...base.focusPrefs, ...(raw.focusPrefs && typeof raw.focusPrefs === 'object' ? raw.focusPrefs : {}) };
  out.meta = { ...base.meta, ...(raw.meta || {}) };
  return out;
}

function read() {
  try {
    const value = localStorage.getItem(KEY);
    return value ? normalize(JSON.parse(value)) : defaultState();
  } catch (err) {
    console.warn('本地数据读取失败，已使用空数据。', err);
    return defaultState();
  }
}

let state = read();
const listeners = new Set();

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    emit();
    return true;
  } catch (err) {
    console.error('保存失败', err);
    throw err;
  }
}

export function update(mutator) {
  const result = mutator(state);
  save();
  return result;
}

export function addItem(collection, item) {
  const record = { id: uid(), createdAt: new Date().toISOString(), ...item };
  update((s) => { s[collection].unshift(record); });
  return record;
}

export function removeItem(collection, id) {
  update((s) => { s[collection] = s[collection].filter((x) => x.id !== id); });
}

export function patchItem(collection, id, patch) {
  update((s) => {
    const target = s[collection].find((x) => x.id === id);
    if (target) Object.assign(target, patch);
  });
}

export function exportData() {
  return JSON.stringify({ ...state, meta: { ...state.meta, exportedAt: new Date().toISOString() } }, null, 2);
}

export function importData(text, mode = 'replace') {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('文件格式不是有效的 JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('文件数据结构无效');
  const incoming = normalize(parsed);
  if (mode === 'merge') {
    update((s) => {
      for (const key of ['events', 'todos', 'workouts', 'studies', 'pomodoros', 'txns', 'goals', 'ideas', 'moments']) {
        const ids = new Set(s[key].map((x) => x.id));
        s[key].push(...incoming[key].filter((x) => !ids.has(x.id)));
      }
      s.water = { ...incoming.water, ...s.water };
      s.waterGoal = incoming.waterGoal;
      s.focusPrefs = { ...s.focusPrefs, ...incoming.focusPrefs };
    });
  } else {
    update((s) => { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, incoming); });
  }
  return incoming;
}

export function clearAll() {
  update((s) => { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, defaultState()); });
}

export function storageBytes() {
  try { return new Blob([localStorage.getItem(KEY) || '']).size; } catch { return 0; }
}

export function seedDemo() {
  const today = todayKey();
  const shift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  update((s) => {
    s.events.push(
      { id: uid(), title: '周计划梳理', date: today, time: '09:30', reminder: 10, note: '确认本周三项重点', createdAt: new Date().toISOString() },
      { id: uid(), title: '项目同步会', date: shift(1), time: '14:00', reminder: 5, note: '', createdAt: new Date().toISOString() }
    );
    s.todos.push(
      { id: uid(), title: '整理本周任务清单', priority: 'high', due: today, done: false, archived: false, createdAt: new Date().toISOString() },
      { id: uid(), title: '阅读 20 分钟', priority: 'mid', due: today, done: true, archived: false, createdAt: new Date().toISOString() },
      { id: uid(), title: '预约体检', priority: 'low', due: shift(-2), done: false, archived: false, createdAt: new Date().toISOString() }
    );
    for (let i = 6; i >= 0; i--) {
      if (i % 3 !== 2) s.workouts.push({ id: uid(), date: shift(-i), type: i % 2 ? '跑步' : '力量训练', minutes: 25 + i * 3, note: '', createdAt: new Date().toISOString() });
      s.studies.push({ id: uid(), date: shift(-i), minutes: 20 + i * 5, subject: i % 2 ? '专业课程' : '英语', content: '示例学习记录', createdAt: new Date().toISOString() });
      s.water[shift(-i)] = Math.min(8, 4 + ((i * 3) % 6));
    }
    s.txns.push(
      { id: uid(), date: today, type: 'expense', category: '餐饮', amount: 38, note: '午餐', createdAt: new Date().toISOString() },
      { id: uid(), date: shift(-1), type: 'expense', category: '交通', amount: 12, note: '地铁', createdAt: new Date().toISOString() },
      { id: uid(), date: shift(-2), type: 'income', category: '工资', amount: 12000, note: '月薪', createdAt: new Date().toISOString() }
    );
    s.goals.push({ id: uid(), name: '旅行基金', target: 10000, saved: 3200, deadline: shift(90), createdAt: new Date().toISOString() });
    s.ideas.push({ id: uid(), text: '把每周复盘做成固定仪式：周日晚间 20 分钟。', tags: ['习惯', '复盘'], createdAt: new Date().toISOString() });
    s.pomodoros.push({ id: uid(), date: today, minutes: 25, finishedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
  });
}
