// Vercel Serverless Function — Razorpay order banata hai.
// POST /api/create-order  { items: [{ id, qty }], name, mobile }
//
// SECURITY: amount yahan SERVER par calculate hota hai (client ke bheje hue
// price par bharosa nahi karte). Key Secret sirf env var se aata hai.

import { products } from "../src/data.js";

const FREE_DELIVERY_ABOVE = 499;
const DELIVERY_FEE = 49;

const PRICES = new Map(products.map((p) => [Number(p.id), Number(p.price)]));

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

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("[create-order] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing");
    return send(res, 500, { error: "Payment gateway abhi configure nahi hai. Thodi der baad try karo." });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { error: "Galat request." });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return send(res, 400, { error: "Cart khali hai." });
  if (items.length > 50) return send(res, 400, { error: "Bahut zyada items." });

  // Server-side price calculation
  let subtotal = 0;
  const summary = [];
  for (const it of items) {
    const id = Number(it && it.id);
    const price = PRICES.get(id);
    if (!price) return send(res, 400, { error: "Cart me koi galat item hai." });
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    subtotal += price * qty;
    summary.push({ id, qty });
  }

  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const amountPaise = Math.round(total * 100);

  if (amountPaise < 100) return send(res, 400, { error: "Amount bahut kam hai." });

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  let rpRes;
  let rpData;
  try {
    rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: {
          customer: String(body.name || "").slice(0, 120),
          mobile: String(body.mobile || "").slice(0, 20),
          items: JSON.stringify(summary).slice(0, 500),
        },
      }),
    });
    rpData = await rpRes.json();
  } catch (e) {
    console.error("[create-order] razorpay fetch failed", e && e.message);
    return send(res, 502, { error: "Payment gateway se connect nahi ho paya. Dobara try karo." });
  }

  if (!rpRes.ok || !rpData || !rpData.id) {
    console.error("[create-order] razorpay error", rpData);
    return send(res, 502, { error: "Payment order nahi ban paya. Dobara try karo." });
  }

  return send(res, 200, {
    keyId,
    orderId: rpData.id,
    amount: rpData.amount,
    currency: rpData.currency || "INR",
    subtotal,
    delivery,
    total,
  });
}
