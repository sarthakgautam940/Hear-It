import type { Metadata } from "next";
import { SelfTestScreen } from "@/components/screens/SelfTestScreen";

export const metadata: Metadata = { title: "Self-test" };

export default function SelfTestPage() {
  return <SelfTestScreen />;
}
