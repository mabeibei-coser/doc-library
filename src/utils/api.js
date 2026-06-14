/**
 * 安防文档库 API 客户端
 * 登录态来自会员中心共享 cookie；下载时后端会问中心要不要 VIP。
 */
const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

// 一库管两域：ASG 是首发域（VITE_CENTER_URL 历史名，留作 ASG 兜底）；ATA 后接入用 VITE_ATA_CENTER_URL。
// 本地默认 ASG=:4002 / ATA=:4004（与各 center dev 端口对齐）。
const ASG_CENTER_URL = import.meta.env.VITE_CENTER_URL || 'http://localhost:4002/';
const ATA_CENTER_URL = import.meta.env.VITE_ATA_CENTER_URL || 'http://localhost:4004/';

/** 按文档/页面所属域返回会员中心地址。'人才ATA' → ATA；其余（含空）→ ASG（兜底，避免薪酬入口被错引到 ASG 时显得正常）。 */
export const centerUrlFor = (category) => (category === '人才ATA' ? ATA_CENTER_URL : ASG_CENTER_URL);

// URL ?category= 是"当前页面属于哪个域"最准的入口信号；裸 URL 进来则空，自动落到 ASG 兜底。
const URL_CATEGORY = (() => {
  try { return new URLSearchParams(window.location.search).get('category') || '' } catch { return '' }
})();

// 向后兼容：默认 CENTER_URL 跟着 URL_CATEGORY 路由，旧引用（fetchMe / gotoCenterLogin）自动走对中心。
export const CENTER_URL = centerUrlFor(URL_CATEGORY);

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
 * 在微信内（已登录态）拿到 10 分钟有效的签名下载地址。
 * 用户用「在浏览器中打开」跳到外部浏览器时，URL 自带凭证、不再需要 cookie。
 * 返回 { downloadUrl, pageUrl }：
 *  - downloadUrl：直接下载（iOS 微信 / 外部浏览器 / 非压缩包走这条，可同步赋给 window.location.href）
 *  - pageUrl：压缩包下载引导页（安卓微信走这条——微信能渲染 HTML、但拦截 zip 下载）
 * 两者都用 BASE_URL 前缀，子路径部署（线上 /a800/）下也能正确路由。
 */
export async function fetchSignedDownloadUrl(docId) {
  const data = await http('POST', `/documents/${docId}/sign-download`);
  const dt = encodeURIComponent(data.token);
  return {
    downloadUrl: `${API_BASE}/documents/${docId}/download?dt=${dt}`,
    pageUrl: `${API_BASE}/documents/${docId}/download-page?dt=${dt}`,
  };
}

/**
 * 触发下载：必须用户手势同步调用。
 * URL 应预先通过 fetchSignedDownloadUrl 拿到（在 useEffect 里），点击时直接传进来。
 */
export function triggerDownload(url) {
  window.location.href = url;
}

export default { fetchMe, fetchDocuments, fetchSignedDownloadUrl, triggerDownload, gotoCenterLogin, CENTER_URL };
