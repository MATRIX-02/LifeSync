# Razorpay & PhonePe Payment Integration Guide

Since Stripe is not available in India, this guide covers integrating **Razorpay** (for cards/netbanking) and **PhonePe** (for UPI payments) - both available in India with FREE integration.

## Table of Contents
1. [Razorpay Setup](#razorpay-setup)
2. [PhonePe Setup](#phonepe-setup)
3. [Environment Configuration](#environment-configuration)
4. [Testing](#testing)
5. [Going to Production](#going-to-production)

---

## Razorpay Setup

### Step 1: Create Razorpay Account

1. Go to [razorpay.com](https://razorpay.com)
2. Sign up with your email
3. Complete KYC (Know Your Customer) verification:
   - Upload PAN card
   - Upload Aadhaar/ID proof
   - Provide bank details
4. Once approved (usually 24-48 hours), you'll have access to API keys

### Step 2: Get Razorpay API Keys

1. Go to **Dashboard** → **Settings** → **API Keys**
2. You'll see:
   - **Key ID** (public key, safe to expose)
   - **Key Secret** (keep this private!)
3. Copy both values

### Step 3: Enable Test Mode

Razorpay provides test credentials by default:
- Use any card number with test credentials
- **Test Card**: `4111 1111 1111 1111`
- **Expiry**: Any future date
- **CVV**: Any 3 digits

---

## PhonePe Setup

### Step 1: Create PhonePe Business Account

1. Go to [business.phonepe.com](https://business.phonepe.com)
2. Sign up as a merchant
3. Select "Payment Gateway" product
4. Complete documentation:
   - Business registration details
   - Bank account information
   - PAN/GST (if applicable)

### Step 2: Get PhonePe Credentials

1. After approval, go to **Settings** → **API Credentials**
2. You'll get:
   - **Merchant ID**
   - **API Key**
3. Use **SANDBOX** environment for testing first

### Step 3: Test PhonePe Integration

PhonePe provides sandbox/test mode with:
- Test UPI IDs for payment simulation
- No actual money transaction
- Same flow as production

---

## Environment Configuration

Create `.env` file in your project root with:

```env
# Supabase (already set up)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Razorpay Configuration
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx  # or rzp_live_xxxxx for production
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=your_secret_key

# PhonePe Configuration
EXPO_PUBLIC_PHONEPE_MERCHANT_ID=MERCHANT_ID
EXPO_PUBLIC_PHONEPE_API_KEY=your_api_key
EXPO_PUBLIC_PHONEPE_ENV=SANDBOX  # Change to PRODUCTION when live
```

> **Important**: Never commit `.env` file to git. Add to `.gitignore`:
> ```
> .env
> .env.local
> ```

---

## Installation

Install Razorpay and PhonePe libraries:

```bash
# Razorpay SDK
npm install razorpay

# PhonePe (uses crypto which is built-in for React Native)
npm install crypto-js
```

---

## File Structure

The payment integration is organized as:

```
src/
├── services/
│   ├── razorpayService.ts    # Razorpay payment handler
│   └── phonepeService.ts     # PhonePe payment handler
└── context/
    └── subscriptionStore.ts  # Payment store with createRazorpayOrder, createPhonePePayment

app/
└── subscription.tsx          # UI with payment method selection
```

---

## Payment Flow

### User Subscribes to Paid Plan

1. **Select Plan** → Choose from Basic/Premium/Enterprise
2. **Choose Payment Method** → Razorpay or PhonePe
3. **Create Order** → Backend creates payment order
4. **Customer Pays** → Opens Razorpay/PhonePe payment interface
5. **Webhook Confirmation** → Payment confirmed, subscription activated
6. **Payment Recorded** → Stored in `payments` table

### Subscription Creation

After successful payment:
```typescript
// Automatic subscription creation in Supabase
- Record payment in `payments` table
- Create entry in `user_subscriptions`
- Update user's active plan
- Record coupon redemption (if used)
```

---

## Backend Implementation (Supabase Edge Functions)

You'll need two Edge Functions to handle payments:

### 1. `razorpay-create-order` Function

```typescript
// supabase/functions/razorpay-create-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Razorpay from "npm:razorpay@2.8.2";

const razorpay = new Razorpay({
  key_id: Deno.env.get("RAZORPAY_KEY_ID"),
  key_secret: Deno.env.get("RAZORPAY_KEY_SECRET"),
});

serve(async (req) => {
  const {
    userId,
    amount, // in paise
    planName,
    userEmail,
  } = await req.json();

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId,
        planName,
        userEmail,
      },
    });

    return new Response(JSON.stringify(order), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
});
```

Deploy with:
```bash
supabase functions deploy razorpay-create-order
supabase secrets set RAZORPAY_KEY_ID your_key_id
supabase secrets set RAZORPAY_KEY_SECRET your_key_secret
```

### 2. `phonepe-callback` Function

```typescript
// supabase/functions/phonepe-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import crypto from "https://deno.land/std@0.184.0/node/crypto.ts";

serve(async (req) => {
  const body = await req.text();
  const checksum = req.headers.get("X-VERIFY");

  // Verify signature
  const calculatedChecksum = crypto
    .createHash("sha256")
    .update(`${body}###${Deno.env.get("PHONEPE_API_KEY")}`)
    .digest("hex");

  if (checksum !== calculatedChecksum) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
    });
  }

  // Process payment
  const payment = JSON.parse(atob(body));
  
  if (payment.code === "PAYMENT_SUCCESS") {
    // Update subscription in database
    // Record payment
    // Send confirmation email
  }

  return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
});
```

Deploy with:
```bash
supabase functions deploy phonepe-callback
supabase secrets set PHONEPE_API_KEY your_api_key
```

---

## Testing

### Test Razorpay Payment

1. Open app and go to subscription screen
2. Select a paid plan (Basic/Premium/Enterprise)
3. Choose **Razorpay** payment method
4. Click "Continue to Razorpay"
5. Use test card: `4111 1111 1111 1111`
6. Enter any future expiry date and CVV
7. Complete payment flow
8. Verify subscription created in Supabase

### Test PhonePe Payment

1. Select a paid plan
2. Choose **PhonePe UPI** payment method
3. Enter a test mobile number
4. Click "Continue to PhonePe"
5. In test mode, payment completes immediately
6. Verify subscription created

---

## Production Checklist

- [ ] Complete KYC for Razorpay
- [ ] Upgrade Razorpay to live keys (`rzp_live_*`)
- [ ] Complete PhonePe merchant verification
- [ ] Switch PhonePe environment to `PRODUCTION`
- [ ] Set up Razorpay webhooks in dashboard
- [ ] Deploy webhook handlers to Supabase
- [ ] Test with real payments (small amount)
- [ ] Set up email notifications for payments
- [ ] Configure payment failure handling
- [ ] Set up monitoring/alerts for failed payments

---

## Important Notes

### Transaction Fees
- **Razorpay**: 2% + ₹3 per transaction
- **PhonePe**: 1% to 2% depending on plan (no setup fees)

### Payment Limits
- **Razorpay**: No upper limit for individual payments
- **PhonePe**: UPI typically limited to ₹100,000 per transaction

### Settlement
- **Razorpay**: T+1 (next business day) to your bank account
- **PhonePe**: T+3 (3 business days) to your bank account

### Refunds
Both support full and partial refunds through API or dashboard.

---

## Troubleshooting

### "Payment failed" error
- Check internet connection
- Verify Razorpay/PhonePe API keys are correct
- Check if payment method supports the transaction amount
- Review Razorpay/PhonePe logs

### Webhook not received
- Check webhook URL is publicly accessible
- Verify webhook signature verification logic
- Check Razorpay/PhonePe webhook logs
- Ensure environment variables are set

### Subscription not created after payment
- Check database permissions
- Verify Supabase Edge Function is deployed
- Check Supabase logs for errors
- Ensure payment record is created before subscription

---

## Support

- **Razorpay Support**: https://razorpay.com/support/
- **PhonePe Support**: https://business.phonepe.com/support/
- **Supabase Docs**: https://supabase.com/docs

---

## Free Tier Summary

✅ **Completely FREE** to set up and test:
- Razorpay: Free account + test mode
- PhonePe: Free account + sandbox
- Supabase: Free tier includes Edge Functions
- No setup fees, only pay per transaction

Perfect for India-based startups! 🚀
