import Link from "next/link";

type AdvisaLogoProps = {
  compact?: boolean;
  href?: string;
};

export const AdVisaMark = ({ compact = false }: { compact?: boolean }) => (
  <span aria-hidden="true" className={compact ? "advisa-logo__mark advisa-logo__mark--compact" : "advisa-logo__mark"}>
    <svg viewBox="0 0 24 24">
      <path d="M5.5 6.5 10.4 18 18.5 5.5" />
      <path className="advisa-logo__mark-accent" d="m9.1 6.5 3.4 7.7" />
    </svg>
  </span>
);

export const AdvisaLogo = ({ compact = false, href = "/" }: AdvisaLogoProps) => {
  return (
    <Link className="advisa-logo" href={href} aria-label="AdVisa home">
      <AdVisaMark compact={compact} />
      {!compact && <span className="advisa-logo__word">AdVisa</span>}
    </Link>
  );
};
