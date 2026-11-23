// 照片本地存储：优先 IndexedDB，失败时回退 localStorage。图片统一压缩后保存，离线可用。
import { uid } from './utils.js';

const FB_KEY = 'qingxu.photos.fallback.v1';
const DB_NAME = 'qingxu-photos';
const STORE = 'files';
let dbPromise = null;

function fallbackRead() {
  try { return JSON.parse(localStorage.getItem(FB_KEY) || '{}') || {}; } catch { return {}; }
}
function fallbackWrite(map) {
  localStorage.setItem(FB_KEY, JSON.stringify(map));
}

function openDB() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('打开照片库失败'));
  });
  return dbPromise;
}

function tx(db, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    try { result = run(store); } catch (err) { reject(err); return; }
    t.oncomplete = () => resolve(result && typeof result.result !== 'undefined' ? result.result : result);
    t.onerror = () => reject(t.error || new Error('照片库操作失败'));
  });
}

export async function getAll() {
  try {
    const db = await openDB();
    const rows = await tx(db, 'readonly', (s) => s.getAll());
    const map = {};
    (rows || []).forEach((row) => { if (row && row.id) map[row.id] = row.data; });
    return map;
  } catch (err) {
    console.warn('IndexedDB 照片库不可用，使用兼容存储。', err);
    return fallbackRead();
  }
}

export async function put(id, data) {
  try {
    const db = await openDB();
    await tx(db, 'readwrite', (s) => s.put({ id, data }));
    return;
  } catch { /* 回退 */ }
  const map = fallbackRead();
  map[id] = data;
  fallbackWrite(map);
}

export async function remove(id) {
  if (!id) return;
  try {
    const db = await openDB();
    await tx(db, 'readwrite', (s) => s.delete(id));
    return;
  } catch { /* 回退 */ }
  const map = fallbackRead();
  delete map[id];
  fallbackWrite(map);
}

export async function clear() {
  try {
    const db = await openDB();
    await tx(db, 'readwrite', (s) => s.clear());
  } catch { /* 回退 */ }
  try { localStorage.removeItem(FB_KEY); } catch { /* 忽略 */ }
}

export async function applyBackup(photos, mode = 'merge') {
  if (!photos || typeof photos !== 'object' || Array.isArray(photos)) return;
  if (mode === 'replace') await clear();
  const pairs = Object.entries(photos).filter(([, data]) => typeof data === 'string' && data.startsWith('data:image/'));
  for (const [id, data] of pairs) await put(id, data);
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('照片读取失败'));
    reader.readAsDataURL(file);
  });
}

function compress(src, maxSide = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) { reject(new Error('照片尺寸无效')); return; }
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      const out = canvas.toDataURL('image/jpeg', quality);
      resolve(out.length < src.length ? out : src);
    };
    img.onerror = () => reject(new Error('照片解析失败'));
    img.src = src;
  });
}

export async function compressFiles(fileList, count = 99) {
  const files = Array.from(fileList || []).filter((f) => f && String(f.type || '').startsWith('image/'));
  if (!files.length) throw new Error('请选择图片文件');
  const picked = files.slice(0, count);
  const out = [];
  for (const file of picked) {
    if (file.size > 20 * 1024 * 1024) throw new Error('单张照片请勿超过 20MB');
    const raw = await readAsDataURL(file);
    const data = await compress(raw);
    out.push({ id: uid(), data, name: file.name || '照片', createdAt: new Date().toISOString() });
  }
  return out;
}
