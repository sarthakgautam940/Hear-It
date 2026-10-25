"use client";

import { HardDrive, MicOff, ShieldCheck, Trash2 } from "lucide-react";
import { Sheet } from "@/ui/Sheet";
import { Group, RowIcon, RowStatic } from "@/ui/structure";

export function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Privacy">
      <Group>
        <RowStatic
          icon={
            <RowIcon>
              <MicOff size={20} strokeWidth={2.25} />
            </RowIcon>
          }
          title="Nothing is recorded"
          sub="The microphone feeds a loudness meter fifty times a second. The sound is never kept."
        />
        <RowStatic
          icon={
            <RowIcon>
              <HardDrive size={20} strokeWidth={2.25} />
            </RowIcon>
          }
          title="Everything stays on this phone"
          sub="People, the room, your voice check and your history live here only."
        />
        <RowStatic
          icon={
            <RowIcon>
              <ShieldCheck size={20} strokeWidth={2.25} />
            </RowIcon>
          }
          title="No accounts"
          sub="There is nothing to sign up for and nothing sent anywhere."
        />
        <RowStatic
          icon={
            <RowIcon>
              <Trash2 size={20} strokeWidth={2.25} />
            </RowIcon>
          }
          title="Yours to clear"
          sub="Settings can remove all of it at once."
        />
      </Group>
    </Sheet>
  );
}
