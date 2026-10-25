import type { Metadata } from "next";
import { ScienceScreen } from "@/components/screens/ScienceScreen";

export const metadata: Metadata = { title: "Science" };

export default function SciencePage() {
  return <ScienceScreen />;
}
