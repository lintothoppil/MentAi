import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, LayoutDashboard } from "lucide-react";

const navItems = [
  { label: "Mentor Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard/mentor" },
  { label: "Certificates", icon: <Award className="h-4 w-4" />, path: "/dashboard/mentor/certificates", isActive: true },
];

export default function MentorCertificatesPage() {
  return (
    <DashboardLayout
      role="mentor"
      roleLabel="Mentor"
      navItems={navItems}
      gradientClass="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100"
    >
      <Card className="border border-amber-200">
        <CardHeader>
          <CardTitle>Mentor Certificates</CardTitle>
          <CardDescription>Certificate tools are being prepared for this module.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Use this page for certificate requests, issuance status, and downloads.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
