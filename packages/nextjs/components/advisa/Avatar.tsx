export const Avatar = ({ size = "normal" }: { size?: "small" | "normal" | "large" }) => (
  <span className={`striped-avatar app-avatar app-avatar--${size}`} aria-hidden="true" />
);
