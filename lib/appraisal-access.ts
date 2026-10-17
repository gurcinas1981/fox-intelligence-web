import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const unavailable = () => NextResponse.json(
  { error: "Appraisals are temporarily unavailable. Contact the operator." },
  { status: 503, headers: { "Cache-Control": "no-store" } }
);

export function authorizeAppraisal(req: NextRequest) {
  const secret = process.env.APPRAISAL_ACCESS_TOKEN;
  if (!secret || secret.length < 32) return unavailable();
  const supplied = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(supplied), digest(expected))) {
    return NextResponse.json({ error: "Enter a valid appraisal access code." }, {
      status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" }
    });
  }
  return null;
}

// One atomic reservation covers both windows across every server instance.
// Stable service keys prevent IP/header spoofing or access-code rotation bypasses.
export const RESERVE_SCRIPT = `
for i = 1, 2 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= tonumber(ARGV[i]) then
    return {0, math.max(1, redis.call('TTL', KEYS[i]))}
  end
end
for i = 1, 2 do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], ARGV[i + 2]) end
end
return {1, 0}
`;

export async function reserveAppraisal() {
  try {
    const endpoint = new URL(process.env.UPSTASH_REDIS_REST_URL || "");
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || endpoint.pathname !== "/" || !token) return unavailable();
    const now = Math.floor(Date.now() / 1000);
    const windows = [600, 86400];
    const keys = windows.map((seconds) => `fox-appraisal:v1:${seconds}:${Math.floor(now / seconds)}`);
    const ttl = windows.map((seconds) => seconds - now % seconds);
    const response = await fetch(endpoint, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", RESERVE_SCRIPT, 2, ...keys, 3, 20, ...ttl])
    });
    if (!response.ok) return unavailable();
    const { result, error } = await response.json();
    if (error || !Array.isArray(result) || result.length !== 2 ||
        ![0, 1].includes(result[0]) || !Number.isInteger(result[1]) || result[1] < 0) return unavailable();
    if (result[0] === 0) {
      return NextResponse.json({ error: "Appraisal limit reached. Please try again later." }, {
        status: 429, headers: { "Retry-After": String(Math.max(1, result[1])), "Cache-Control": "no-store" }
      });
    }
    return null;
  } catch { return unavailable(); }
}
