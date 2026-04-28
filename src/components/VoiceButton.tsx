"use client";

import { Mic, MicOff } from "lucide-react";
import { useCallback } from "react";
import { useSpeechInput } from "@/hooks/useSpeechInput";

interface Props {
  onResult: (text: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function VoiceButton({ onResult, className, size = "md" }: Props) {
  const { listening, supported, toggle } = useSpeechInput(onResult);

  if (!supported) return null;

  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconDim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex-shrink-0 ${dim} rounded-xl flex items-center justify-center transition-all touch-manipulation select-none ${
        listening
          ? "bg-red-500 text-white animate-pulse shadow-md"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300"
      } ${className ?? ""}`}
      title={listening ? "Tap to stop" : "Tap to dictate"}
    >
      {listening ? <MicOff className={iconDim} /> : <Mic className={iconDim} />}
    </button>
  );
}
