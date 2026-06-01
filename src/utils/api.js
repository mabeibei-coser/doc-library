/**
 * 安防文档库 API 客户端
 * 登录态来自会员中心共享 cookie；下载时后端会问中心要不要 VIP。
 */
const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;
export const CENTER_URL = import.meta.env.VITE_CENTER_URL || 'http://localhost:4002/';

// 预览图绝对地址：后端返回的 url 形如 /api/preview/xxx，前端要补上部署子路径（线上 /a800/）。
export const previewSrc = (url) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${url || ''}`;

async function http(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `请求失败 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// 当前用户（中心写的共享 cookie 解出来；文档库自己没有 /me，借中心的）
export async function fetchMe() {
  try {
    const res = await fetch(`${CENTER_URL.replace(/\/$/, '')}/api/me`, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const fetchDocuments = (category, q) => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  const qs = params.toString();
  return http('GET', `/documents${qs ? '?' + qs : ''}`);
};

export function gotoCenterLogin() {
  const back = encodeURIComponent(window.location.href);
  window.location.href = `${CENTER_URL}?from=${back}`;
}

/**
 * 下载文档：直接打下载链接（带 cookie）。后端校验 free/vip。
 * 非 VIP 下 vip 档会返 403 JSON——所以先用 fetch 探一次，403 就引导开通，否则真下载。
 */
export async function downloadDocument(doc) {
  const url = `${API_BASE}/documents/${doc.id}/download`;
  const res = await fetch(url, { credentials: 'include' });
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || '需要 VIP');
    err.status = 403;
    err.needVip = true;
    throw err;
  }
  if (res.status === 401) {
    const err = new Error('请先登录');
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  // 成功：从响应头取文件名，blob 触发浏览器下载
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename\*=UTF-8''(.+)$/);
  const filename = m ? decodeURIComponent(m[1]) : (doc.attachmentName || `${doc.title}`);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default { fetchMe, fetchDocuments, downloadDocument, gotoCenterLogin, CENTER_URL };
