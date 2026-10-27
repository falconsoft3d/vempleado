import type { Metadata } from "next";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal del Empleado",
  description: "Portal de empleados conectado a Odoo BIM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El script de tema pone data-theme antes de hidratar
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
