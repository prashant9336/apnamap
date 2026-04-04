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

interface SpeechRecognitionError extends Event {
  error: string;
  message?: string;
}

// ─── Component ────────────────────────────────────────────────────
type RecordState = "idle" | "listening" | "done" | "error" | "unsupported";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  lang?: "hi-IN" | "en-IN";  // default: hi-IN
}

const MAX_DURATION_MS = 30_000;

function friendlyError(errorCode: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "permission-denied":
      return "Mic access denied. Allow microphone in browser settings and try again.";
    case "no-speech":
      return "No speech heard. Speak clearly and try again.";
    case "audio-capture":
      return "No microphone found. Check your mic is connected.";
    case "network":
      return "Network error. Check your connection and try again.";
    case "aborted":
      return "";  // user-initiated abort, no message needed
    default:
      return "Could not start recording. Try again.";
  }
}

export default function VoiceRecorder({ onTranscript, disabled, lang = "hi-IN" }: Props) {
  const [state,    setState]   = useState<RecordState>("idle");
  const [liveText, setLive]    = useState("");
  const [elapsed,  setElapsed] = useState(0);
  const [errMsg,   setErrMsg]  = useState("");

  const recogRef     = useRef<any>(null);
  const accumRef     = useRef("");
  const autoStopRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect browser support once on mount
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
      tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recogRef.current?.abort();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (disabled) return;
    setErrMsg("");

    // Explicitly request mic permission first so the browser shows its native
    // permission prompt. This also gives a clear error if denied.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We only need the stream to trigger the permission prompt — stop it
      // immediately. SpeechRecognition manages its own audio context.
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      const code = err?.name ?? "unknown";
      if (code === "NotAllowedError" || code === "PermissionDeniedError") {
        setErrMsg("Mic access denied. Allow microphone in browser settings.");
      } else if (code === "NotFoundError") {
        setErrMsg("No microphone found. Check your mic is connected.");
      } else {
        setErrMsg("Could not access microphone. Try again.");
      }
      setState("error");
      return;
    }

    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    accumRef.current = "";
    setLive("");
    setElapsed(0);

    const recognition = new SR();
    // Accept both Hindi and English — use hi-IN for better Hinglish handling.
    // Browsers will still recognise English words spoken in a Hindi context.
    recognition.lang = lang;
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
      const full = accumRef.current.trim();
      if (full) {
        setState("done");
        onTranscript(full);
      } else {
        // Ended with nothing — likely mic was cut off
        setState("idle");
      }
    };

    recognition.onerror = (e: SpeechRecognitionError) => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      const msg = friendlyError(e.error);
      if (msg) {
        setErrMsg(msg);
        setState("error");
      } else {
        setState("idle");
      }
    };

    recognition.start();

    // Hard ceiling: auto-stop after MAX_DURATION_MS
    autoStopRef.current = setTimeout(() => recognition.stop(), MAX_DURATION_MS);
  }, [disabled, lang, onTranscript]);

  const stop = useCallback(() => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    recogRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recogRef.current?.abort();
    accumRef.current = "";
    setLive("");
    setElapsed(0);
    setErrMsg("");
    setState("idle");
  }, []);

  // ── Unsupported ─────────────────────────────────────────────────
  if (state === "unsupported") {
    return (
      <div style={{ textAlign: "center", padding: "28px 16px" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎙️</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: 0 }}>
          Voice input works in Chrome and Edge.
          <br />Please open this page in Chrome to use voice posting.
        </p>
      </div>
    );
  }

  // ── Normal UI ───────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 16, padding: "20px 16px",
    }}>
      {/* ── CTA label above mic ── */}
      {state === "idle" && (
        <div style={{
          padding: "7px 14px", borderRadius: 100,
          background: "rgba(255,94,26,0.08)",
          border: "1px solid rgba(255,94,26,0.20)",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#FF8A57" }}>
            🎤 Speak your offer
          </span>
        </div>
      )}

      {/* ── Mic button with pulse ring ── */}
      <div style={{ position: "relative" }}>
        {state === "listening" && (
          <motion.div
            style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              background: "rgba(255,94,26,0.15)", pointerEvents: "none",
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={state === "idle" || state === "error" ? start : stop}
          disabled={disabled || state === "done"}
          aria-label={state === "listening" ? "Stop recording" : "Start recording — speak your offer"}
          style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "none", cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, position: "relative",
            background: state === "listening"
              ? "linear-gradient(135deg,#FF5E1A,#FF8C3A)"
              : state === "error"
                ? "rgba(239,68,68,0.15)"
                : "rgba(255,255,255,0.07)",
            boxShadow: state === "listening"
              ? "0 0 28px rgba(255,94,26,0.55), 0 0 8px rgba(255,94,26,0.3)"
              : "0 0 0 1px rgba(255,255,255,0.10)",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
        >
          {state === "listening" ? "⏹" : state === "error" ? "🔄" : "🎤"}
        </motion.button>
      </div>

      {/* ── Status text ── */}
      <div style={{ textAlign: "center", minHeight: 40 }}>
        {state === "idle" && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.5 }}>
            Tap the mic then describe your offer.<br />
            <span style={{ fontSize: "11px" }}>Works with Hindi, English &amp; Hinglish.</span>
          </p>
        )}
        {state === "listening" && (
          <div>
            <motion.p
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: 12, fontWeight: 700, color: "#FF6A30", margin: "0 0 3px" }}
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
            ✓ Got it!
          </p>
        )}
        {state === "error" && errMsg && (
          <p style={{ fontSize: 12, color: "#F87171", margin: 0, lineHeight: 1.5 }}>
            {errMsg}
          </p>
        )}
      </div>

      {/* ── Live transcript preview ── */}
      {liveText.length > 0 && (
        <div style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12, color: "rgba(255,255,255,0.60)",
          lineHeight: 1.6, maxHeight: 80, overflow: "auto",
        }}>
          {liveText}
        </div>
      )}

      {/* ── Record again / retry ── */}
      {(state === "done" || state === "error") && (
        <button
          onClick={reset}
          style={{
            fontSize: 12, color: "rgba(255,255,255,0.40)",
            background: "none", border: "none",
            cursor: "pointer", textDecoration: "underline", padding: 0,
          }}
        >
          {state === "error" ? "Try again" : "Record again"}
        </button>
      )}
    </div>
  );
}
