// Vercel Serverless Function — Razorpay payment signature verify karta hai.
// POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
//
// Signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)
// Ye check karne ke liye zaruri hai ki payment sach me hua hai (bogus nahi).

import crypto from "node:crypto";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("[verify-payment] RAZORPAY_KEY_SECRET missing");
    return send(res, 500, { error: "Payment gateway abhi configure nahi hai." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { ok: false, error: "Galat request." });
  }

  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");

  if (!orderId || !paymentId || !signature) {
    return send(res, 400, { ok: false, error: "Payment details adhuri hain." });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  let valid = false;
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    valid = false;
  }

  if (!valid) {
    console.error("[verify-payment] signature mismatch", { orderId, paymentId });
    return send(res, 400, { ok: false, error: "Payment verify nahi ho paya." });
  }

  return send(res, 200, { ok: true, paymentId, orderId });
}
