# Billing runbook — kerf.box Pro ($15/mo)

This is the one-time setup to turn on real payments for the **Pro** tier.
Everything in code is already done; this connects it to a live Stripe account.

## The model

| Tier | Price | What you get | Who pays inference |
| --- | --- | --- | --- |
| **Free** | $0 forever | App + full REST API + MCP server, with your own Anthropic key (BYOK) or over MCP. Archive, scoped API keys, markdown export, refusal engine. | The user (their Anthropic key) |
| **Pro** | $15/mo flat | Run with **no key** — every request goes through our in-house agent. Same access from web, API, or MCP. | Us (our `ANTHROPIC_API_KEY`) |

The paywall is only on the **in-house key path**. BYOK and demo mode are
never gated. If Stripe is not configured, the gate **fails open** (the
in-house agent runs unmetered) so self-hosters and the OSS build are never
paywalled.

## How the gate works (for reference)

`/api/strategy` and `/api/copy` check, in order:
1. BYOK key present (`X-Anthropic-Key`)? → run on their key. **Free.**
2. Demo mode requested? → return demo content. **Free.**
3. Signed in, no BYOK, server has a key? → `isSubscribed(userId)`:
   - subscribed → run on our key.
   - not subscribed → `402 { code: "subscription_required", upgrade_url }`.
4. Stripe not configured (`hasStripe()` false)? → `isSubscribed` returns
   `true` for everyone (fail-open).

`hasStripe()` is true only when **both** `STRIPE_SECRET_KEY` and
`STRIPE_PRICE_ID` are set.

## Setup (≈15 minutes, one-time)

### 1. Create a Stripe account and activate live mode
<https://dashboard.stripe.com/register>. Activating **live mode** requires
your business details and a bank account — this is the step that gates real
money. You can do everything below in **test mode** first (`sk_test_…` keys)
and flip to live when ready.

### 2. Create the $15/mo recurring Price
Dashboard → **Products** → **Add product**
- Name: `kerf.box Pro`
- Pricing: **Recurring**, **$15.00 USD**, billing period **Monthly**
- Save, then copy the **Price ID** — it looks like `price_1AbC…`.

### 3. Register the webhook endpoint
Dashboard → **Developers** → **Webhooks** → **Add endpoint**
- Endpoint URL: `https://kerfbox.vercel.app/api/stripe/webhook`
- Events to send (exactly these three):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Save, then click **Reveal** under *Signing secret* and copy the
  `whsec_…` value.

### 4. Set the env vars in Vercel
Vercel → project → **Settings** → **Environment Variables** (scope to
**Production**, and Preview if you want to test there):

| Variable | Value | From |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…`) | Stripe → Developers → API keys |
| `STRIPE_PRICE_ID` | `price_…` | Step 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Step 3 |

> Use the **same mode** for all three: live keys with a live price and a
> live webhook secret, or test keys with a test price and a test webhook
> secret. Mixing modes will fail signature verification or checkout.

### 5. Run the database migration
Apply the `subscriptions` table from `db/schema.sql` to your Supabase
project (SQL editor → paste → run). It is safe to re-run — everything uses
`if not exists` / `drop policy if exists`. The table:

```sql
create table if not exists subscriptions (
  user_id                 text primary key,            -- Clerk user id
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  status                  text not null default 'incomplete',
  price_id                text,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
```

RLS is enabled with deny-all policies for `anon` and `authenticated`; only
the service role (used server-side) can read or write it.

### 6. Redeploy and smoke-test
- Redeploy in Vercel so the new env vars take effect.
- In **test mode**, sign in, go to `/pricing`, click **Upgrade**, and
  complete checkout with Stripe's test card `4242 4242 4242 4242` (any
  future expiry, any CVC, any ZIP).
- Confirm: you land back on `/app?upgraded=1`, the **● Pro** badge appears,
  and a row exists in the `subscriptions` table with `status = active`.
- Confirm a run with **no key** succeeds (in-house agent), and that a
  signed-in user **without** a subscription gets the 402 upgrade prompt.
- Flip the env vars to **live** keys and repeat once with a real card (you
  can refund yourself), or trust the test run.

## Cancellation / management
Subscribers get a **manage billing** button in the `/app` header. It opens
the Stripe customer portal (`/api/billing/portal`) where they can update
their card or cancel. On cancel, Stripe fires
`customer.subscription.deleted` → our webhook flips the row out of an active
status → the in-house agent locks back to Pro-only for that user.

## Local development
Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a `whsec_…` to use as your local `STRIPE_WEBHOOK_SECRET` in
`.env.local`. Trigger test events with `stripe trigger checkout.session.completed`.

## Troubleshooting
- **Upgrade button says "Payments aren't enabled"** → `hasStripe()` is
  false. Check that **both** `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are
  set in the deployed environment and you redeployed.
- **Checkout works but no Pro badge** → the webhook isn't landing. Check the
  endpoint URL, the three subscribed events, and that
  `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret. Inspect
  delivery attempts in Stripe → Webhooks.
- **402 even for a paying user** → confirm the `subscriptions` row exists
  with `status in ('active','trialing')` and `current_period_end` in the
  future; verify the Supabase service-role key is set server-side.
- **Everyone can use the in-house agent for free** → that's the fail-open
  default; it means Stripe isn't configured. Expected for self-host.
