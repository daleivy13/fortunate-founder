"use client";

import { useState, useCallback, useRef } from "react";

export function useSpeechInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!supported) return;
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (e: any) => {
      const text: string = e.results[0]?.[0]?.transcript ?? "";
      if (text) onResult(text);
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);

    recogRef.current = recog;
    recog.start();
    setListening(true);
  }, [supported, onResult]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop, toggle: listening ? stop : start };
}
