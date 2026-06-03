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

// 文档查看 +1（不去重；失败不影响用户操作，silently swallow）
export const recordView = (id) => http('POST', `/documents/${id}/view`).catch(() => null);

// 内嵌预览 URL（GET 走 cookie，后端守门同 download）
export const inlineUrl = (id) => `${API_BASE}/documents/${id}/inline`;

export function gotoCenterLogin() {
  const back = encodeURIComponent(window.location.href);
  window.location.href = `${CENTER_URL}?from=${back}`;
}

/**
 * 下载文档：跳转真实 HTTP URL，让浏览器原生处理下载。
 * 之前 fetch+blob URL 在微信 WebView 不兼容（blob 跨进程失效）；
 * 现在直跳 URL，服务端 Content-Disposition: attachment 触发下载。
 * 鉴权改由前端按钮三态预判 + onClick locked 本地短路，不再做 fetch 预检。
 */
export function downloadDocument(doc) {
  const url = `${API_BASE}/documents/${doc.id}/download`;
  window.location.href = url;
}

export default { fetchMe, fetchDocuments, downloadDocument, gotoCenterLogin, CENTER_URL };
