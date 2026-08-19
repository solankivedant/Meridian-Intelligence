/**
 * Switches for the features that spend money per reader.
 *
 * Most of what this site does costs a database query. A few things call Gemini,
 * and one of those - the per-article Ask box - is a button on every card, which
 * means its cost scales with traffic rather than with content. On a public
 * deployment that is an open tap on someone else's API key, so it is off unless
 * deliberately switched on.
 *
 * The flag has to gate the route as well as the button. A hidden control is not
 * a closed endpoint: anyone can read the bundle, find `/api/ask`, and POST to it
 * all day. `ASK_ENABLED` is checked in both places, and the route treats a
 * disabled feature as a route that does not exist.
 *
 * `NEXT_PUBLIC_` because the button needs to know too. The value is not a
 * secret - it is a boolean about how the site is configured, and the endpoint
 * enforces it server-side regardless of what the client believes.
 */
export const ASK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ASK === "true";
