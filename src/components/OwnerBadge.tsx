export default function OwnerBadge() {
  return (
    <svg
      className="w-4 h-4 inline-block ml-1 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Owner"
    >
      <path d="M2 18h20l-2-9-4 3-4-6-4 6-4-3-2 9z" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="2" cy="14" r="1" />
      <circle cx="22" cy="14" r="1" />
    </svg>
  );
}

