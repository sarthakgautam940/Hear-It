import type { Metadata } from "next";
import { RoomScreen } from "@/components/screens/RoomScreen";

export const metadata: Metadata = { title: "Room" };

export default function RoomPage() {
  return <RoomScreen />;
}
