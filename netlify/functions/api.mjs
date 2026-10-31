import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const config = { path: "/api/*" };

const DEFAULT = {
  mission: "[Insert GANHeP's official mission statement.]",
  vision: "[Insert GANHeP's official vision statement.]",
  whoWeAre: "[History, founding year and background of GANHeP.]",
  whatWeDo: "[Summary of activities: training, outreach, health education, professional support.]",
  affiliation: "[Relationship with the Seventh-day Adventist Church and any regulatory bodies.]",
  contact: { address: "[Office address, city, Ghana]", phone: "[Phone / WhatsApp]", email: "[Email]" },
  leaders: ["President", "Vice President", "Secretary", "Treasurer"].map(r => ({ name: "[Full name]", role: r, photo: "" })),
  programmes: [
    { title: "Health education", body: "[Seminars, cooking schools, wellness talks.]" },
    { title: "Community outreach", body: "[Health screenings and campaigns.]" },
    { title: "Professional development", body: "[Workshops and mentorship for members.]" }
  ],
  news: [],
  resources: []
};
const FIELDS = ["regDate","fullName","gender","dob","phone","email","address","qualification","specialty","years","workplace","licence","church","district","mstatus","office","pastor"];
const REQUIRED = ["regDate","fullName","gender","dob","phone","email","address","qualification","specialty","years","church","district","mstatus","pastor"];

const json = (d, s = 200) => Response.json(d, { status: s });
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = p => crypto.createHmac("sha256", secret()).update(p).digest("base64url");
function makeToken() {
  const p = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 3600 * 1000 })).toString("base64url");
  return p + "." + sign(p);
}
function authed(req) {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const [p, sig] = t.split(".");
  if (!p || !sig || !secret()) return false;
  const good = sign(p);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try { return JSON.parse(Buffer.from(p, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
const clean = (o) => { const r = {}; for (const k of FIELDS) r[k] = String(o?.[k] ?? "").trim().slice(0, 200); return r; };
const bad = d => { for (const k of REQUIRED) if (!d[k]) return k + " is required"; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return "Invalid email"; return ""; };

export default async (req) => {
  const store = getStore("ganhep");
  const parts = new URL(req.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const m = req.method, [a, id, sub] = parts;
  let body = {};
  if (m !== "GET" && m !== "DELETE") { try { body = await req.json(); } catch { body = {}; } }

  if (a === "content" && m === "GET") return json({ ...DEFAULT, ...(await store.get("content", { type: "json" }) || {}) });

  if (a === "register" && m === "POST") {
    const d = clean(body), err = bad(d);
    if (err) return json({ error: err }, 400);
    const key = crypto.randomUUID();
    await store.setJSON("members/" + key, { ...d, status: "Pending", memberId: "", submittedAt: new Date().toISOString() });
    return json({ reference: "REG-" + key.slice(0, 6).toUpperCase() });
  }

  if (a === "login" && m === "POST") {
    const pw = process.env.ADMIN_PASSWORD || "";
    if (!pw) return json({ error: "ADMIN_PASSWORD is not set on the server" }, 500);
    await new Promise(r => setTimeout(r, 700));
    const x = Buffer.from(String(body.password || "")), y = Buffer.from(pw);
    if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return json({ error: "Wrong password" }, 401);
    return json({ token: makeToken() });
  }

  if (!authed(req)) return json({ error: "Unauthorized" }, 401);

  if (a === "content" && m === "PUT") { await store.setJSON("content", body); return json({ ok: true }); }

  if (a === "members" && !id && m === "GET") {
    const { blobs } = await store.list({ prefix: "members/" });
    const rows = await Promise.all(blobs.map(async b => ({ id: b.key.slice(8), ...(await store.get(b.key, { type: "json" })) })));
    return json(rows);
  }
  if (a === "members" && id) {
    const key = "members/" + id, cur = await store.get(key, { type: "json" });
    if (!cur) return json({ error: "Not found" }, 404);
    if (m === "DELETE") { await store.delete(key); return json({ ok: true }); }
    if (m === "PUT" && !sub) {
      const d = clean(body), err = bad(d);
      if (err) return json({ error: err }, 400);
      await store.setJSON(key, { ...cur, ...d }); return json({ ok: true });
    }
    if (m === "POST" && sub === "status") {
      const s = body.status;
      if (!["Pending", "Approved", "Rejected"].includes(s)) return json({ error: "Bad status" }, 400);
      let memberId = cur.memberId;
      if (s === "Approved" && !memberId) {
        const c = (await store.get("counter", { type: "json" })) || { n: 0 };
        c.n += 1; await store.setJSON("counter", c);
        memberId = `GANHeP-${new Date().getFullYear()}-${String(c.n).padStart(4, "0")}`;
      }
      await store.setJSON(key, { ...cur, status: s, memberId });
      return json({ ok: true, memberId });
    }
  }
  return json({ error: "Not found" }, 404);
};
