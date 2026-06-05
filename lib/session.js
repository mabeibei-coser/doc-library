import { getIronSession } from "iron-session";

// 文档库一库管两域：用户可能持有 ASG（安防）或 ATA（薪酬）会员中心签发的 cookie。
// 两个 center 各自是「同名 cookie 唯一签发者」，A800 在这里只读解析任一种、拿到 phone。
// VIP 校验时再按文档 category 把 cookie 整段转发给对应 center（见 server.js fetchIsVip）。
//
// ⚠️ 跨进程共享前提：cookieName + password + cookieOptions(尤其 path/sameSite)
// 必须与签发方逐字节一致，否则解不开。
//
// 生产部署 cookie path：
//  - ATA100 / ASG100 各自的会员 cookie 默认 path=/ → A800（/docs/）天然可读
//  - 若生产收敛 path（如 /ata100/ /asg100/），必须显式开放给 /docs/，否则 A800 拿不到 phone

const ASG = {
  cookieName: "asg_member_session",
  password: process.env.ASG_MEMBER_SESSION_PASSWORD,
  cookiePath: process.env.ASG_COOKIE_PATH || "/",
};

const ATA = {
  cookieName: "ata_member_session",
  password: process.env.ATA_MEMBER_SESSION_PASSWORD,
  cookiePath: process.env.ATA_COOKIE_PATH || "/",
};

// 旧外部引用兼容（如果有 import COOKIE_NAME 的代码）
export const COOKIE_NAME = ASG.cookieName;

function makeOptions(domain) {
  return {
    password: domain.password,
    cookieName: domain.cookieName,
    cookieOptions: {
      secure:
        process.env.ASG_COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: domain.cookiePath,
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export const sessionOptions = ASG.password ? makeOptions(ASG) : makeOptions(ATA);

export async function getSession(req, res) {
  const candidates = [];
  if (ASG.password) candidates.push(ASG);
  if (ATA.password) candidates.push(ATA);
  if (candidates.length === 0) {
    throw new Error(
      "既无 ASG_MEMBER_SESSION_PASSWORD 也无 ATA_MEMBER_SESSION_PASSWORD"
    );
  }
  // 依次尝试解每种 cookie，谁有 phone 用谁
  for (const c of candidates) {
    const s = await getIronSession(req, res, makeOptions(c));
    if (s.phone) return s;
  }
  // 都没解出 phone → 返回第一个空 session（让 requireSession 给出 401）
  return getIronSession(req, res, makeOptions(candidates[0]));
}

/**
 * 推断用户当前应归属哪个业务域 → 返回 "asg" | "ata" | null。
 * 用法：前台拉文档列表时没传 category，按这个推断默认域；下载/VIP 校验不走这个（那块按文档自己的 category 路由）。
 *
 * 规则：哪个 cookie 能解出 phone 就归哪个域；双 cookie 都有时按 candidates 顺序（ASG 优先，首批用户）；
 * 都没有 → null，由调用方决定怎么兜底（当前实现：兜底回安防ASG，避免薪酬数据反向暴露）。
 */
export async function getCookieDomain(req, res) {
  if (ASG.password) {
    const s = await getIronSession(req, res, makeOptions(ASG));
    if (s.phone) return "asg";
  }
  if (ATA.password) {
    const s = await getIronSession(req, res, makeOptions(ATA));
    if (s.phone) return "ata";
  }
  return null;
}
