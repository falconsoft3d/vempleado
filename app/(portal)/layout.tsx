import Sidebar from "@/components/Sidebar";
import { requireEmployee } from "@/lib/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { employee } = await requireEmployee();

  return (
    <div className="shell">
      <Sidebar name={employee.name} image={employee.image} company={employee.company} />
      <main className="content">{children}</main>
    </div>
  );
}
