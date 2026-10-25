import type { Metadata } from "next";
import { PeopleScreen } from "@/components/screens/PeopleScreen";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return <PeopleScreen />;
}
