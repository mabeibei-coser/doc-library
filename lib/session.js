import { getIronSession } from "iron-session";

// 文档库接入「安全隐患域会员中心」：登录态由中心(asg100)签发，
// 这里用【同名同密钥】共享 cookie 只读解析拿 phone，自己不签发登录。
// ⚠️ cookieName + password + cookieOptions 必须与中心逐字节一致。

export const COOKIE_NAME = "asg_member_session";

export const sessionOptions = {
  password: process.env.ASG_MEMBER_SESSION_PASSWORD,
  cookieName: COOKIE_NAME,
  cookieOptions: {
    secure:
      process.env.ASG_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: process.env.ASG_COOKIE_PATH || "/",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession(req, res) {
  if (!sessionOptions.password) {
    throw new Error("ASG_MEMBER_SESSION_PASSWORD env 未配置");
  }
  return getIronSession(req, res, sessionOptions);
}
