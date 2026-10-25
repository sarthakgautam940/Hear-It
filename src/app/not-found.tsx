import { LinkButton } from "@/components/ui/Button";
import { PageHead, Standing } from "@/components/ui/structure";

export default function NotFound() {
  return (
    <>
      <PageHead title="Not here" />
      <Standing
        head="There is no page at this address."
        note="The table, the people, the room and the report are all one tap away."
        actions={
          <LinkButton href="/" variant="primary">
            Go to the table
          </LinkButton>
        }
      />
    </>
  );
}
