import { PlaceSetting } from "@/features/talk/art/Setting";

/* A place set and waiting: the table's own drawing of one setting, for a History with no conversations yet. */
export function PlaceScene() {
  return (
    <svg className="hi-scene hi-scene--small" viewBox="0 0 200 140" aria-hidden>
      <g transform="translate(100 142) rotate(-90) scale(1.8)">
        <PlaceSetting food="roast" wine={false} mat="plain" set />
      </g>
    </svg>
  );
}
