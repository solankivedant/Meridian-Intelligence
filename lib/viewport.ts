import { headers } from "next/headers";

/**
 * Whether the request came from a phone.
 *
 * Read from the User-Agent, which is the only signal a server has: the viewport
 * is not sent with the request, and deciding page size in the browser would
 * mean either shipping forty stories to throw thirty away, or a second round
 * trip after first paint.
 *
 * `Mobi` is the right token to look for rather than `Android` or a list of
 * vendors. Every mobile browser engine puts it in (`iPhone ... Mobile/15E148`,
 * `Android 10; Mobile; rv:...`), and tablets deliberately leave it out - Android
 * tablets drop it, and iPadOS has reported itself as a Macintosh for years. So
 * this reads as "phone", which is what it is being asked, and tablets get the
 * full-size feed their screens have room for.
 */
export async function isPhoneRequest(): Promise<boolean> {
  const agent = (await headers()).get("user-agent") ?? "";
  return /Mobi/i.test(agent);
}
