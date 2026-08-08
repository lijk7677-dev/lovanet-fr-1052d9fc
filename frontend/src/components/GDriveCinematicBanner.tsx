/** Full-width cinematic banner backed by a Google Drive video */
const GDRIVE_BANNER_SRC =
  "https://drive.google.com/file/d/1bo0FDHxvNvIGulffMKbyJFlmb0vA3YCs/preview?autoplay=1";

const resolveVideoSource = (input: string) => {
  if (!input) return input;
  if (input.includes("drive.google.com/file/d/")) {
    const match = input.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return input;
};

export const GDriveCinematicBanner = ({
  title,
  src,
  height = 320,
  heightClassName = "",
  className = "",
}: {
  title?: string;
  src?: string;
  height?: number;
  heightClassName?: string;
  className?: string;
}) => (
  <section className={`container mx-auto px-4 lg:px-8 ${className}`}>
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_90px_-42px_rgba(56,189,248,0.6)] ${heightClassName}`}
      style={heightClassName ? undefined : { height }}
    >
      <video
        src={resolveVideoSource(src ?? GDRIVE_BANNER_SRC)}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={title ?? "Bannière cinématique Lovanet"}
        data-bg-video
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background)/0.85) 0%, transparent 24%, transparent 76%, hsl(var(--background)/0.9) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--background)/0.65) 0%, transparent 18%, transparent 82%, hsl(var(--background)/0.65) 100%)",
        }}
      />
    </div>
  </section>
);
