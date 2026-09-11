export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-blue text-[9px] font-bold text-black shadow-[0_0_20px_rgba(34,211,238,0.45)]">
        BF
      </span>
      <span className="text-lg font-bold tracking-tight">
        Byte<span className="text-brand">Force</span>
      </span>
    </span>
  );
}
