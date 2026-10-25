/**
 * When the app is the whole screen rather than a drawn phone: a phone, or any
 * window too small to frame one. device.css uses the same query.
 */
export const PHONE_QUERY = "not all and (min-width: 600px) and (min-height: 540px)";

/** The color of the phone's own bars in each theme: the page's background. */
export const BAR_COLOR = { light: "#f6f6f4", dark: "#0d0d0d" } as const;
