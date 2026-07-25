import Link from "next/link";

type AdvisaLogoProps = {
  compact?: boolean;
  href?: string;
};

export const AdvisaLogo = ({ compact = false, href = "/" }: AdvisaLogoProps) => {
  return (
    <Link className="advisa-logo" href={href} aria-label="Advisa home">
      <span className={compact ? "advisa-logo__mark advisa-logo__mark--compact" : "advisa-logo__mark"}>A</span>
      {!compact && <span className="advisa-logo__word">Advisa</span>}
    </Link>
  );
};
