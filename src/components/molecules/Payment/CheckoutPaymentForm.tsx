import React, { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Alert, Stack } from "@mui/material";
import Button from "../../atoms/Button/Button";
import { getStripe } from "../../../utils/stripeClient";
import { getErrorMessage } from "../../../utils/helper";

export interface CheckoutPaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

const CheckoutInnerForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (confirmError) {
        setError(confirmError.message ?? "Payment failed. Please try again.");
        return;
      }
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, "Payment failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" onClick={handlePay} loading={submitting} disabled={!stripe || !elements}>
        Pay Now
      </Button>
    </Stack>
  );
};

/**
 * Wraps Stripe's <Elements> around the actual form so useStripe/useElements (which
 * require an Elements ancestor) work - one clientSecret drives one PaymentElement, per
 * Stripe's Payment Element integration model. Ported from
 * ~/ElderSphere/eldersphere-fe's own molecules/Payment/CheckoutPaymentForm.
 *
 * onSuccess fires once Stripe confirms the payment client-side - it does NOT mean this
 * booking's Payment row is already SUCCEEDED in our own DB (that only happens once
 * Stripe's webhook is delivered and PaymentServiceImpl#handleWebhook applies it, which can
 * lag the client confirmation by a moment). Callers should treat onSuccess as "show an
 * optimistic processing state and re-fetch", not "the payment is definitely done".
 */
const CheckoutPaymentForm: React.FC<CheckoutPaymentFormProps> = ({ clientSecret, onSuccess }) => (
  <Elements stripe={getStripe()} options={{ clientSecret }}>
    <CheckoutInnerForm onSuccess={onSuccess} />
  </Elements>
);

export default CheckoutPaymentForm;
