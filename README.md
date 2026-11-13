# Mr & Mrs Masala — Website

100% pure organic Indian masale ki online store. React + Vite + Tailwind CSS pe bana
frontend, Vercel serverless functions ke saath (orders + online payment).

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, React Router 7, Vite 8, Tailwind CSS 3 |
| Icons | lucide-react |
| Backend (payments) | Vercel Serverless Functions (`/api`) |
| Database | Browser `localStorage` (accounts, cart, wishlist, orders) |
| Payments | **Razorpay** (UPI, Cards, Netbanking, Wallets) |
| Order notifications | WhatsApp bot (`/whatsapp-bot`, alag Node server) |

---

## Local setup

```bash
npm install
npm run dev          # http://localhost:5173
```

Environment variables ke liye `.env.example` ko `.env` me copy karo:

```bash
cp .env.example .env
```

> **Note:** Vercel ke `/api` functions `npm run dev` me nahi chalte. Payment local me
> test karne ke liye ya to `vercel dev` use karo, ya `.env` me
> `VITE_PAYMENTS_API_URL=https://<your-site>.vercel.app` daal do (deployed API use hoga).

---

## Online payment (Razorpay) setup

Payment ke 2 hisse hote hain: **order create** (`/api/create-order`) aur
**signature verify** (`/api/verify-payment`). Amount server par calculate hota hai,
aur signature HMAC-SHA256 se verify hota hai — isliye client se amount ya
"payment ho gaya" claim pe bharosa nahi kiya jata.

### 1. Razorpay keys lo

1. [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings → API Keys**
2. **Key ID** aur **Key Secret** generate karo
   - Test mode: `rzp_test_...`
   - Live mode: `rzp_live_...` (isliye pehle KYC complete karna hoga)
3. Live jane se pehle **test mode** me poora flow test karo.

### 2. Keys ko Vercel me daalo

Vercel → Project → **Settings → Environment Variables**:

| Name | Value | Environments |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | Production, Preview, Development |
| `RAZORPAY_KEY_SECRET` | `<secret>` | Production, Preview, Development |

⚠️ `RAZORPAY_KEY_SECRET` **kabhi** frontend me ya git me mat daalo.
Isliye iska koi `VITE_` prefix nahi hai — sirf server ise padhta hai.

### 3. Razorpay Dashboard me webhook (recommended)

Orders ka reliable record rakhne ke liye Razorpay → **Settings → Webhooks** me
endpoint add karo (aapke backend ka URL) aur events enable karo:
`payment.captured`, `payment.failed`, `refund.processed`.

### 4. Refund

Refund Razorpay dashboard se kar sakte ho (Payments → us payment → Refund).
Site ki Refund Policy: approved refund 5–7 working days me same source me.

---

## Deploy

Repo Vercel pe import karo (Framework preset: **Vite**).

- `vercel.json` me SPA rewrite `/api/*` ko chhod kar baaki sab `/index.html` pe bhejta hai,
  taaki client-side routing chale aur API functions kaam karein.
- CSP headers me Razorpay ke domains (`checkout.razorpay.com`, `api.razorpay.com`,
  `lumberjack.razorpay.com`) already allowed hain. Agar aap koi naya third-party
  script add karo (analytics, chat widget, etc.) to us domain ko `vercel.json` aur
  `public/_headers` — dono me CSP me add karna padega.

---

## WhatsApp bot (order notifications)

`whatsapp-bot/` ek alag Node service hai jo order ka notification WhatsApp par bhejta hai.
Root `.env` me us ka public URL daal do:

```
VITE_BOT_API_URL=https://<your-bot>.onrender.com
```

Us URL ko CSP ke `connect-src` me bhi add karna padega (warna browser request block karega).

---

## Folder structure

```
api/                          Vercel serverless functions
  create-order.js             Razorpay order banata hai (amount server-side)
  verify-payment.js           Payment signature verify karta hai
src/
  components/                 Sabhi UI sections + pages
  context/                    Cart, Wishlist, Auth contexts
  data.js                     Products, categories, site config
  store.js                    localStorage: accounts, orders, order status
  googleAuth.js               Google Sign-In (Firebase)
public/                       Static assets + _headers (CSP)
whatsapp-bot/                 Alag Node bot service
```

---

## Windows pe dhyaan dene wali baat

Folder path me `&` (jaise `mr&mrsmasala`) ho to Windows pe `npm run dev` / `npm run build`
fail ho sakta hai, kyunki `&` ko command separator samjha jata hai. Folder ko
`mrmrsmasala` jaisa naam do.

---

## Security notes

- Payment amount server par calculate hota hai (client ke bheje price pe bharosa nahi).
- Card/UPI details site ke server se hoke nahi jaate — wo seedha Razorpay ke paas jaate hain.
- Account password browser me SHA-256 hash ke roop me save hota hai.
- Orders `localStorage` me hain — matlab ek device/browser tak seemit. Cross-device order
  tracking chahiye to backend database (Supabase/Firebase) lagana padega.
