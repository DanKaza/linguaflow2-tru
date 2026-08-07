import { AppShell } from "@/components/layout/AppShell";
import { adminItems } from "@/components/layout/AppSidebar";
import { AdminMobileBottomNav } from "@/components/layout/AdminMobileBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      role="admin"
      items={adminItems}
      userName="Budi Santoso"
      userSub="Admin SMK Texar"
      bottomNav={<AdminMobileBottomNav />}
    >
      {children}
    </AppShell>
  );
}
