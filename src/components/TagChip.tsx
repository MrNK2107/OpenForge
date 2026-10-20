/**
 * Tag pill with a colored dot. Text stays dark so light brand colors
 * (e.g. React's #61dafb) remain readable on a light background.
 */
export function TagChip({ name, color }: { name: string; color?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-sm text-gray-700">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color || '#8b5cf6' }}
      />
      {name}
    </span>
  );
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
