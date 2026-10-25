import type { Metadata } from "next";
import { ReportScreen } from "@/components/screens/ReportScreen";

export const metadata: Metadata = { title: "Report" };

export default function ReportPage() {
  return <ReportScreen />;
}
