import type { ComponentType } from "react";
import { History, Mic, SlidersHorizontal, Users } from "lucide-react";

export interface Tab {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
}

export const TABS: readonly Tab[] = [
  { href: "/", label: "Talk", icon: Mic },
  { href: "/people", label: "People", icon: Users },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];
