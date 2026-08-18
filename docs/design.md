# Design language

The dashboard reads like a publication, not a control panel. Every rule below
follows from that one decision.

## Principles

1. **The page has a reading order.** A grid of identical tiles tells you nothing
   about where to start. One lead, one feature per day, cards between them, rows
   in narrow columns — mixing registers is what creates hierarchy.
2. **Structure comes from enclosure, not from labels.** A page of loose rules
   under small headings reads as one undifferentiated column however the
   headings are styled. Sections are boxes.
3. **Colour is signal, never decoration.** Eight hues, one per category, used
   for accents only — dots, kickers, meters, section caps. A page has one focal
   point per section rather than eight competing ones.
4. **Filters are chrome, content is content.** The filter panel is explicitly
   framed and tinted so it cannot be mistaken for a story.
5. **State lives in the URL.** Every view is shareable. Nothing is hidden behind
   a click that leaves no trace.

## Tokens

All colour is CSS custom properties in `app/globals.css`. No hex value appears
in a component.

### Paper and ink
| Token | Role |
| --- | --- |
| `--paper` / `--surface-1` | The plane; panels sit on white |
| `--surface-2` | Tinted strips: section headers, the filter panel |
| `--text-primary` / `--text-secondary` / `--text-muted` | The three-step text ramp |
| `--rule` / `--rule-strong` | Hairlines; strong for panel edges, light for internal dividers |
| `--ink-wash` | Hover and active fills |

### The eight categories
Fixed assignment, never reordered or cycled — the order below is the palette
order and it is mirrored in `lib/categoryMeta.ts` and in the masthead's colour
strip.

| Category | Token | Light |
| --- | --- | --- |
| Policy & Regulatory | `--cat-policy` | `#2a78d6` blue |
| Subsidies & Schemes | `--cat-subsidy` | `#eb6834` orange |
| Tech & Innovation | `--cat-tech` | `#1baf7a` aqua |
| Business & Startups | `--cat-business` | `#eda100` yellow |
| Investment & FDI | `--cat-investment` | `#e87ba4` magenta |
| Economy & Markets | `--cat-economy` | `#008300` green |
| Trade | `--cat-trade` | `#4a3aa7` violet |
| Geopolitics | `--cat-geopolitics` | `#e34948` red |

Dark values are re-defined under `:root[data-theme="dark"]`. The plane is white
by default: a system dark preference does **not** flip it, because a paper-white
reading surface is the design, but the dark palette stays reachable through the
explicit theme hook.

## Type

| Class | Family | Used for |
| --- | --- | --- |
| `.headline` | Newsreader serif, 500, `-0.011em`, balanced wrap | Leads, section titles, masthead |
| `.headline-tight` | Newsreader serif, 1.28 line-height | Feed rows, suggestion titles |
| `.kicker` | Geist Sans, 11px, 600, `+0.09em`, uppercase | Small all-caps labels. Caps need to open up at 10–11px, not tighten. |
| `.meta` | Geist Mono, 11px, tabular figures | Timestamps, counts, section numbers |
| `.measure` | — | Caps body copy at 62ch regardless of container |

Newsreader is optical-size variable, so the browser picks the right optical size
for a 40px lead and a 15px row headline. That is why one family covers both
without either looking like a scaled copy of the other.

## Components

### Section (`components/Section.tsx`)
The frame everything sits in: a bordered box, a tinted header strip, and a 3px
accent riding the panel's own top edge (not a separate bar inside it, so the box
stays one shape). Header carries a two-digit marker, the title at 28–36px, an
optional right-aligned note, and a description at reading size.

Section titles are set well above the body ramp deliberately — a reader
scrolling fast should be able to land on one without reading anything else.

### Masthead (`components/Header.tsx`)
Four bands:
1. An eight-segment colour strip — a legend for the category dots used
   throughout the page, not decoration.
2. Sidebar toggle · wordmark · **search, centred and full width** · dateline.
   The dateline is the one piece of chrome that says "this is today's edition",
   so it is set at reading size (17–20px), upright rather than italic.
3. A full-width search row between the masthead breakpoint and phone size.
   On a phone search stays in the drawer — a third sticky row costs too much.
4. Primary nav (India · World · Your desk · Sources) with the current page
   marked by a rule under it, plus the **jump links** on the right.

### Jump links (`components/SectionJump.tsx`)
One bordered box per section — Latest, Wrap, Lead, Pulse — each with its own
accent. They read as a set of doors out of the current section rather than as
another line of nav text. Which boxes appear is read off the rendered page, so
the World desk shows three and a category page two with no per-page wiring; the
box for the section you are in highlights as you scroll.

### Article registers (`components/ArticleRow.tsx`)
| Variant | Where | Treatment |
| --- | --- | --- |
| `lead` | The one story a page opens on | Display headline, full deck |
| `feature` | First story of a day | A step down, still with a deck |
| `card` | Feed grid tile | Headline, two lines of deck, byline |
| `row` | Narrow columns | One hairline-separated line |

### Filter panel (`components/FilterPanel.tsx`)
A framed, tinted panel with a header strip (label, match count, reset) and all
three controls — **period, month and sector — on one line**. Stacked as labelled
rows they cost four lines above every feed while leaving two thirds of each row
empty. The 25 sector chips are the only part that needs the room, so they alone
drop into a full-width drawer under the row when opened.

Sector selection is multiple-choice and driven entirely by links; each chip
toggles itself in the `tags` parameter.

## Layout

- Content column: `max-w-6xl`, `px-5` / `sm:px-8`.
- Vertical rhythm between sections: `gap-8`.
- Sections carry `scroll-mt-24` so a jump link clears the sticky masthead.
- `html { scroll-behavior: smooth }`, disabled under
  `prefers-reduced-motion: reduce`.
- Horizontal rails (`.rail`) use thin scrollbars so they do not eat vertical
  rhythm.

## Accessibility

- The current page and the active section carry `aria-current`.
- Sector chips are `aria-pressed` links; filters work without JavaScript.
- The typeahead is a proper `combobox` — `aria-expanded`, `aria-controls`,
  `aria-autocomplete`, arrow-key navigation, Escape to dismiss.
- Category colour is never the only carrier of meaning; a dot always sits beside
  a label.
- Decorative elements (the colour strip, icons beside text) are `aria-hidden`.
