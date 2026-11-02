import { accentVars } from "@/lib/accent";

/** Aplica el color de la organización como acento a todo lo que envuelve (sin afectar el layout). */
export function AccentScope({ color, children }: { color?: string | null; children: React.ReactNode }) {
  return (
    <div className="accent-scope contents" style={accentVars(color) as React.CSSProperties}>
      {children}
    </div>
  );
}
