import Image from 'next/image';

export function WattWiseLogo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/wattwise-logo.png"
        alt="WattWise AI logo"
        width={size}
        height={size}
        priority
        unoptimized
        className="h-full w-full object-contain drop-shadow-sm"
      />
    </span>
  );
}