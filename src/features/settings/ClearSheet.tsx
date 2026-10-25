"use client";

import { Trash2 } from "lucide-react";
import { resetOnboarding } from "@/lib/theme";
import { engine } from "@/platform/engine";
import { clearAllData } from "@/platform/storage";
import { Button } from "@/ui/Button";
import { Sheet } from "@/ui/Sheet";

export function ClearSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  async function clear() {
    await engine.stop();
    clearAllData();
    onClose();
    resetOnboarding();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Clear everything?"
      footer={
        <>
          <Button
            variant="danger"
            size="large"
            block
            icon={<Trash2 size={20} strokeWidth={2.25} aria-hidden />}
            onClick={() => void clear()}
          >
            Clear everything
          </Button>
          <Button variant="secondary" size="large" block onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className="hi-quiet hi-confirm">
        The people at your table, the room, your voice check, your calibration and every
        conversation leave this phone, and Hear It starts fresh. This cannot be undone.
      </p>
    </Sheet>
  );
}
