import type { ComponentType } from "react";
import { BookOpen, ClipboardList, House, Mic, Settings, Target, Users } from "lucide-react";

export type IconComponent = ComponentType<{ size?: number | string; className?: string; "aria-hidden"?: boolean }>;

export interface Destination {
  label: string;
  href: string;
  keywords: string;
  context: string;
  icon: IconComponent;
}

export const PRIMARY_NAV: readonly Destination[] = [
  { label: "Table", href: "/", keywords: "home start map reach live talk dinner", context: "Live", icon: Target },
  { label: "People", href: "/people", keywords: "listeners family seats hearing add person", context: "Set up", icon: Users },
  { label: "Room", href: "/room", keywords: "noise listen measure quiet loud", context: "Set up", icon: House },
  { label: "Self-test", href: "/self-test", keywords: "gain baseline sentences measure voice test", context: "Measure", icon: Mic },
  { label: "Report", href: "/report", keywords: "summary results tonight sessions history dose", context: "Results", icon: ClipboardList },
];

export const SECONDARY_NAV: readonly Destination[] = [
  { label: "Settings", href: "/settings", keywords: "chatter level ear adaptive calibrate theme text size data", context: "More", icon: Settings },
  { label: "Science", href: "/science", keywords: "how it works lombard reflex sources limits privacy", context: "More", icon: BookOpen },
];

export const ALL_NAV: readonly Destination[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

export function destinationFor(pathname: string): Destination | null {
  return ALL_NAV.find((d) => d.href === pathname) ?? null;
}

export interface PaletteAction {
  label: string;
  href: string;
  keywords: string;
  context: string;
  icon: IconComponent;
}

/** Actions a reader can run from the palette; each lands on the page that owns it. */
export const PALETTE_ACTIONS: readonly PaletteAction[] = [
  { label: "Start at the table", href: "/?start=1", keywords: "begin go live listen boost", context: "Action", icon: Target },
  { label: "Add a person", href: "/people?add=1", keywords: "new listener seat family", context: "Action", icon: Users },
  { label: "Listen to the room", href: "/room?listen=1", keywords: "measure noise ten seconds", context: "Action", icon: House },
  { label: "Run the self-test", href: "/self-test?start=1", keywords: "ten sentences gain", context: "Action", icon: Mic },
];
