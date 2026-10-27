import { loadStripe, type Stripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export const isStripeConfigured = Boolean(publishableKey);

let stripePromise: Promise<Stripe | null> | null = null;

// Memoized so every checkout mount reuses the same Stripe.js instance instead of
// re-fetching stripe.js from Stripe's CDN each time - see @stripe/stripe-js docs.
// Resolves to null (never calls loadStripe with an empty key) when the publishable key
// isn't configured, so callers just get a no-op Elements provider instead of a crash -
// payments are additive (Prompt 97), so the rest of the app must keep working either way.
export const getStripe = (): Promise<Stripe | null> => {
  if (!publishableKey) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
};
