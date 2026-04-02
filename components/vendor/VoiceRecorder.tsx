"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";

// ─── Web Speech API type shims ────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      [j: number]: { transcript: string; confidence: number };
    };
  };
}

// ─── Component ────────────────────────────────────────────────────
type RecordState = "idle" | "listening" | "done" | "unsupported";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const MAX_DURATION_MS = 30_000;

export default function VoiceRecorder({ onTranscript, disabled }: Props) {
  const [state,   setState]   = useState<RecordState>("idle");
  const [liveText, setLive]   = useState("");
  const [elapsed, setElapsed] = useState(0);

  const recogRef     = useRef<any>(null);
  const accumRef     = useRef("");
  const autoStopRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect browser support once
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !(window as any).SpeechRecognition &&
      !(window as any).webkitSpeechRecognition
    ) {
      setState("unsupported");
    }
  }, []);

  // Elapsed timer — runs while listening
  useEffect(() => {
    if (state === "listening") {
      setElapsed(0);
      tickRef.current = setInterval(
        () => setElapsed((e) => e + 1),
        1000,
      );
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recogRef.current?.abort();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    accumRef.current = "";
    setLive("");
    setElapsed(0);

    const recognition = new SR();
    recognition.lang = "hi-IN";     // handles Hindi + Hinglish well
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recogRef.current = recognition;

    recognition.onstart = () => setState("listening");

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          accumRef.current += t + " ";
        } else {
          interim += t;
        }
      }
      setLive((accumRef.current + interim).trim());
    };

    recognition.onend = () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      setState("done");
      const full = accumRef.current.trim();
      if (full) onTranscript(full);
    };

    recognition.onerror = () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      setState("idle");
    };

    recognition.start();

    // Hard ceiling: auto-stop after MAX_DURATION_MS
    autoStopRef.current = setTimeout(() => recognition.stop(), MAX_DURATION_MS);
  }, [disabled, onTranscript]);

  const stop = useCallback(() => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    recogRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recogRef.current?.abort();
    accumRef.current = "";
    setLive("");
    setElapsed(0);
    setState("idle");
  }, []);

  // ── Unsupported ─────────────────────────────────────────────────
  if (state === "unsupported") {
    return (
      <div style={{ textAlign: "center", padding: "28px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎙️</div>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.38)",
          lineHeight: 1.6, margin: 0,
        }}>
          Voice input requires Chrome on Android or desktop Chrome/Edge.
          <br />Please open this page in Chrome to use voice posting.
        </p>
      </div>
    );
  }

  // ── Normal UI ───────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 18, padding: "24px 16px",
    }}>
      {/* Mic button with pulse ring */}
      <div style={{ position: "relative" }}>
        {state === "listening" && (
          <motion.div
            style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              background: "rgba(255,94,26,0.15)",
              pointerEvents: "none",
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={state === "idle" ? start : stop}
          disabled={disabled || state === "done"}
          aria-label={state === "listening" ? "Stop recording" : "Start recording"}
          style={{
            width: 76, height: 76, borderRadius: "50%",
            border: "none", cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 30, position: "relative",
            background: state === "listening"
              ? "linear-gradient(135deg,#FF5E1A,#FF8C3A)"
              : "rgba(255,255,255,0.07)",
            boxShadow: state === "listening"
              ? "0 0 28px rgba(255,94,26,0.55), 0 0 8px rgba(255,94,26,0.3)"
              : "0 0 0 1px rgba(255,255,255,0.10)",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
        >
          {state === "listening" ? "⏹" : "🎙️"}
        </motion.button>
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center", minHeight: 36 }}>
        {state === "idle" && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", margin: 0 }}>
            Tap mic and speak your offer
          </p>
        )}
        {state === "listening" && (
          <div>
            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                fontSize: 12, fontWeight: 700,
                color: "#FF6A30", margin: "0 0 3px",
              }}
            >
              ● Recording… {elapsed}s / 30s
            </motion.p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: 0 }}>
              Tap ⏹ when done
            </p>
          </div>
        )}
        {state === "done" && (
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1FBB5A", margin: 0 }}>
            ✓ Recording complete
          </p>
        )}
      </div>

      {/* Live transcript preview */}
      {liveText.length > 0 && (
        <div style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          fontSize: 12, color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6, maxHeight: 72, overflow: "hidden",
        }}>
          {liveText}
        </div>
      )}

      {/* Record again */}
      {state === "done" && (
        <button
          onClick={reset}
          style={{
            fontSize: 12, color: "rgba(255,255,255,0.35)",
            background: "none", border: "none",
            cursor: "pointer", textDecoration: "underline", padding: 0,
          }}
        >
          Record again
        </button>
      )}
    </div>
  );
}
