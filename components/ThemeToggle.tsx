"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Script en <head>: aplica el tema guardado antes de pintar (sin guardar, sigue al sistema). */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const ICONS: Record<Theme, string> = {
  // Se muestra el tema al que se cambia: luna en claro, sol en oscuro
  light: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  dark: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
};

/** Botón para alternar modo claro / oscuro; la elección se recuerda en este navegador. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(currentTheme()), []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Sin almacenamiento el cambio vale hasta recargar
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button type="button" className="btn-icon" title={label} aria-label={label} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICONS[theme ?? "light"]} />
      </svg>
    </button>
  );
}
