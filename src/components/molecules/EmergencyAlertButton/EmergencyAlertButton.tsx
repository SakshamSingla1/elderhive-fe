import React, { useEffect, useRef, useState } from "react";
import { Box, Button as MuiButton, CircularProgress, Typography, type ButtonProps as MuiButtonProps } from "@mui/material";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

const MotionMuiButton = motion.create(MuiButton);

export const DEFAULT_HOLD_DURATION_MS = 1500;

export interface EmergencyAlertButtonProps {
  loading?: boolean;
  disabled?: boolean;
  /** Fires once the press has been held for the full holdDurationMs - never on a plain
   *  tap/click, and never if released early. */
  onConfirm: () => void;
  children: React.ReactNode;
  size?: MuiButtonProps["size"];
  holdDurationMs?: number;
}

/**
 * Reference: ~/ElderSphere/eldersphere-fe's own EmergencyAlertButton - its "weight and
 * reassurance, not playfulness" visual language (the firmer whileTap compression, the
 * single soft post-trigger pulse ring, the best-effort haptic buzz) is carried over
 * directly. What's NEW here (ElderSphere's version is still a plain single tap) is the
 * actual gesture: this button does nothing on a quick tap or click - it only fires
 * onConfirm after being held down for holdDurationMs straight, specifically to prevent an
 * accidental brush/tap from sending a real SOS. A fill bar grows under the button while
 * held as the progress indicator; releasing early (pointerup/pointerleave/pointercancel,
 * or releasing a held Enter/Space for keyboard users) resets it to zero with no trigger.
 *
 * The actual confirm timing is a plain setTimeout, not tied to the fill bar's own CSS
 * transition or framer-motion's animation-complete callback - reliable under
 * prefers-reduced-motion (where the fill bar's animation is suppressed but the timing
 * requirement itself must not be) and straightforward to drive with Vitest fake timers.
 */
const EmergencyAlertButton: React.FC<EmergencyAlertButtonProps> = ({
  loading,
  disabled,
  onConfirm,
  children,
  size = "large",
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [pulseKey, setPulseKey] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInert = disabled || loading;

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Unmounting mid-hold (e.g. navigating away) must not leave a dangling timer that
  // fires onConfirm against an unmounted page.
  useEffect(() => clearHoldTimer, []);

  const startHold = () => {
    if (isInert || holdTimerRef.current) return;
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);
      try {
        navigator.vibrate?.([30, 25, 60]);
      } catch {
        // ignore - haptic feedback is pure garnish
      }
      if (!prefersReducedMotion) setPulseKey((k) => k + 1);
      onConfirm();
    }, holdDurationMs);
  };

  const cancelHold = () => {
    clearHoldTimer();
    setIsHolding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); // stop MuiButton's own single-fire click-on-keyup
    startHold();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    cancelHold();
  };

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <AnimatePresence>
          {!prefersReducedMotion && pulseKey > 0 && (
            <motion.span
              key={pulseKey}
              initial={{ opacity: 0.45, scale: 1 }}
              animate={{ opacity: 0, scale: 1.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 14,
                backgroundColor: "#C0392B",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <MotionMuiButton
          variant="contained"
          color="error"
          size={size}
          disabled={isInert}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          whileTap={isInert ? undefined : { scale: 0.92 }}
          animate={{ scale: isHolding ? 0.95 : 1 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          sx={{
            position: "relative",
            overflow: "hidden",
            "&::after": {
              content: '""',
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 4,
              width: isHolding ? "100%" : "0%",
              backgroundColor: "rgba(255,255,255,0.85)",
              transition: prefersReducedMotion ? "none" : isHolding ? `width ${holdDurationMs}ms linear` : "width 0.15s ease-out",
            },
          }}
        >
          {children}
        </MotionMuiButton>
      </Box>
      <Typography variant="caption" color="text.secondary" aria-live="polite">
        {isHolding ? "Keep holding to confirm…" : "Press and hold to send"}
      </Typography>
    </Box>
  );
};

export default EmergencyAlertButton;
