import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal del Empleado",
  description: "Portal de empleados conectado a Odoo BIM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
