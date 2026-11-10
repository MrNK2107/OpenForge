/**
 * Tag pill with a colored dot on a translucent dark surface, so light brand
 * colors (e.g. React's #61dafb) stay readable against the dark theme.
 */
export function TagChip({ name, color }: { name: string; color?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-neutral-300">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color || '#f97316' }}
      />
      {name}
    </span>
  );
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
