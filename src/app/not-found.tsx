import { Mic } from "lucide-react";
import { Screen } from "@/shell/Screen";
import { LinkButton } from "@/ui/Button";
import { Empty } from "@/ui/structure";

export default function NotFound() {
  return (
    <Screen title="Not here">
      <Empty
        art={null}
        title="There is no page at this address"
        action={
          <LinkButton
            href="/"
            variant="primary"
            size="large"
            icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
          >
            Go to Talk
          </LinkButton>
        }
      >
        Talk, People, History and Settings are all one tap away.
      </Empty>
    </Screen>
  );
}
