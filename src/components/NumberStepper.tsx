"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  label: string;
  unit?: string;
  size?: "sm" | "lg";
}

export function NumberStepper({
  value,
  onChange,
  step = 0.1,
  min = 0,
  max = 999,
  decimals = 1,
  label,
  unit,
  size = "lg",
}: Props) {
  const num = parseFloat(value) || 0;

  const decrement = () => {
    if (!value) return;
    const next = Math.max(min, parseFloat((num - step).toFixed(decimals)));
    onChange(next.toString());
  };

  const increment = () => {
    const next = Math.min(max, parseFloat(((parseFloat(value) || 0) + step).toFixed(decimals)));
    onChange(next.toString());
  };

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide text-center">{label}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={decrement}
            className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 text-3xl font-light flex items-center justify-center active:scale-95 active:bg-slate-200 select-none touch-manipulation"
          >
            −
          </button>
          <div className="w-20 text-center">
            <p className="text-2xl font-bold text-slate-900 leading-none">{value || <span className="text-slate-300">—</span>}</p>
            {unit && <p className="text-xs text-slate-400 mt-1">{unit}</p>}
          </div>
          <button
            type="button"
            onClick={increment}
            className="w-14 h-14 rounded-2xl bg-[#1756a9] text-white text-3xl font-light flex items-center justify-center active:scale-95 active:bg-[#0f3f82] select-none touch-manipulation"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      {unit && <p className="text-[10px] text-slate-300">{unit}</p>}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={decrement}
          className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 text-xl font-light flex items-center justify-center active:scale-95 select-none touch-manipulation"
        >
          −
        </button>
        <div className="w-16 text-center">
          <p className="text-base font-bold text-slate-900">{value || <span className="text-slate-300">—</span>}</p>
        </div>
        <button
          type="button"
          onClick={increment}
          className="w-10 h-10 rounded-xl bg-[#1756a9] text-white text-xl font-light flex items-center justify-center active:scale-95 select-none touch-manipulation"
        >
          +
        </button>
      </div>
    </div>
  );
}
