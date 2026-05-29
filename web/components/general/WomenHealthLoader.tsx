import { HeartPulse, Sparkles, Earth } from "lucide-react";

export function WomenHealthLoader({
  label = "Preparing your care space",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-[45vh] items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <div className="relative grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 rounded-full border border-rose-100 bg-white shadow-lg shadow-rose-100/80" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-[#e64b6a] border-r-[#35a99a]" />
          <div className="absolute inset-5 rounded-full bg-[#fff4ef]" />
          <Earth className="relative h-9 w-9 text-[#e64b6a]" aria-hidden="true" />
          <Sparkles className="absolute right-2 top-3 h-4 w-4 animate-pulse text-amber-500" aria-hidden="true" />
          <HeartPulse className="absolute bottom-3 left-2 h-4 w-4 animate-pulse text-[#35a99a]" aria-hidden="true" />
        </div>

        <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#e64b6a]">
          Aria
        </p>
        <p className="mt-2 text-base font-semibold text-[#172033]">{label}</p>
        <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
          Loading your cycle, symptom, and wellness insights.
        </p>
      </div>
    </div>
  );
}
