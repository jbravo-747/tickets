"use client";

import { Icon } from "./Icon";

/** Cambia entre claro y oscuro. El tema inicial lo fija el script del layout (sin parpadeo). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const el = document.documentElement;
    const next = el.dataset.theme === "dark" ? "light" : "dark";
    el.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  };
  return (
    <button type="button" onClick={toggle} className={`btn-icon ${className}`} aria-label="Cambiar entre modo claro y oscuro" title="Modo claro / oscuro">
      <span className="dark:hidden"><Icon name="dark_mode" size={18} /></span>
      <span className="hidden dark:inline"><Icon name="light_mode" size={18} /></span>
    </button>
  );
}

/** Script en <head>: aplica el tema guardado o el del sistema antes de pintar. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;
