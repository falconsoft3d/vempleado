"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import Avatar from "./Avatar";

const MENU = [
  { href: "/", label: "Inicio", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/imputar", label: "Imputar horas", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0" },
];

export default function Sidebar({ name, image, company }: { name: string; image: string | null; company: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">V</span>
        <span className="brand-name">Portal</span>
      </div>
      <nav>
        {MENU.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? "nav-link active" : "nav-link"}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-user">
        <Avatar name={name} image={image} size={36} />
        <div className="sidebar-user-info">
          <strong>{name}</strong>
          {company && <span>{company}</span>}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
