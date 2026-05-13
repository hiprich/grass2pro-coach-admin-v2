import { UserCircle2 } from "lucide-react";

type Props = {
  name: string;
  variant?: "dashboard" | "studio";
};

export function LoggedInAsNotice({ name, variant = "dashboard" }: Props) {
  const iconSize = variant === "studio" ? 16 : 18;
  return (
    <div
      className={`logged-in-as ${variant === "studio" ? "logged-in-as--studio" : ""}`.trim()}
      aria-label={`You are logged in as ${name}`}
      data-testid="logged-in-as-notice"
    >
      <UserCircle2 size={iconSize} className="logged-in-as__icon" aria-hidden />
      <span className="logged-in-as__text">
        You are logged in as <strong>{name}</strong>
      </span>
    </div>
  );
}
