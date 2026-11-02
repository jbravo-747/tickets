/** Íconos Material Symbols. La lista se usa para descargar solo estos glifos (ver layout). */
export const ICONS = [
  "add", "alarm", "apartment", "arrow_back", "attach_file", "badge", "calendar_month", "calendar_today",
  "check", "check_circle", "chevron_left", "chevron_right", "close", "confirmation_number", "description",
  "domain", "edit_calendar", "error", "event", "filter_alt", "flag", "folder_open", "forum", "history",
  "hourglass_top", "inbox", "label", "lock", "logout", "mail", "mark_email_read", "menu", "open_in_new",
  "pending_actions", "person", "public", "schedule", "search", "send", "sync", "tag", "task_alt", "timeline",
  "trending_up", "upload_file", "warning",
] as const;

export type IconName = (typeof ICONS)[number];

export const ICONS_URL =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
  `&icon_names=${[...ICONS].sort().join(",")}&display=block`;

export function Icon({ name, size = 18, className = "", fill = false }: { name: IconName; size?: number; className?: string; fill?: boolean }) {
  return (
    <span
      aria-hidden
      className={`icon ${className}`}
      style={{ fontSize: size, width: size, height: size, ...(fill ? { fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 20' } : {}) }}
    >
      {name}
    </span>
  );
}
