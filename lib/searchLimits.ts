/**
 * Longest search query accepted, anywhere.
 *
 * It lives apart from `lib/search.ts` because the masthead's search box is a
 * client component: importing the constant from the query module would drag
 * Prisma and `pg` into the browser bundle.
 */
export const MAX_QUERY_LENGTH = 120;
