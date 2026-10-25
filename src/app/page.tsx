import type { Metadata } from "next";
import { TableScreen } from "@/components/screens/TableScreen";

export const metadata: Metadata = { title: "Table" };

export default function TablePage() {
  return <TableScreen />;
}
