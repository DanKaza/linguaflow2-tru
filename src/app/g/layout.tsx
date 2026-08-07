import { AppShell } from "@/components/layout/AppShell";
import { teacherItems } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      role="teacher"
      items={teacherItems}
      userName="Bu Siti Rahma"
      userSub="Guru Bahasa Jepang"
      bottomNav={<MobileBottomNav />}
    >
      {children}
    </AppShell>
  );
}
