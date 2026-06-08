import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f7f8fa]">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
