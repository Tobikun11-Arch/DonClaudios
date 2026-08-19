

## 1. What's wrong with the current version

The current section is functional but visually flat — three plain cards in a row on a white background. It has no visual anchor, no hierarchy, and blends into the section above it ("Our Story"), which is also white. It reads like a placeholder rather than a finished, designed section.

We're moving to a new layout direction based on the attached reference: a **split layout** with a large photo on one side and a grid of review cards on the other, rather than a flat row of cards.

---

## 2. Copy (keep exactly as-is)

- **Heading:** What Our Customers Say
- **Subheading:** Real stories from families who celebrated with our lechon
- Optional small label above the heading, e.g. "Testimonials" — nice to have if it fits the site's type system, not required.

---

## 3. Layout direction

**Left side:** one large, tall photo (a happy customer, the food, or the restaurant — something warm and human). At the bottom-left corner of this photo, overlay a featured review — a short quote in a card sitting on top of the image, with a large decorative quotation mark, the customer's name, and their tag (e.g. "Fiesta Order"). This gives the section a strong visual focal point instead of starting straight into cards.

**Right side:** a 2×2 grid of four review cards. Each card includes, top to bottom:
1. A row of 5 gold stars
2. A short quote (2–3 lines)
3. A thin divider line
4. A small round avatar, the customer's name (bold), and a short tag underneath (location, "Regular Customer," "Fiesta Order," etc.)

This means **five reviews total** — one featured on the photo, four in the grid — instead of the current three.

The overall layout should feel like one unified card sitting on the page: rounded corners, generous internal spacing, photo and grid side by side at roughly 40/60 width split.

---

## 4. Responsive behavior

- **Desktop:** photo and grid sit side by side as described above.
- **Tablet:** photo moves to the top at a fixed height, grid stays as a 2×2 (or collapses to one column if it feels cramped).
- **Mobile:** photo on top at a shorter height, featured quote either stays on the photo if it fits or drops below it as a normal card. The four grid reviews stack into a single column, one after another. No swipe or carousel needed — simple vertical stacking is fine here since it's only four cards.

---

## 5. Section sizing

This section should feel like a full "page" as you scroll — it should take up the full height of the screen when it comes into view, with the content (heading, photo, cards) comfortably centered within that space, not just hugging the top. On smaller screens where the stacked content naturally runs longer than the screen height, that's fine — it just shouldn't feel like a cramped strip squeezed between two other sections, which is how it feels now.

---

## 6. Background color

Right now this section and the "Our Story" section above it are both plain white, so they blend together with no separation.

Give the Reviews section its own distinct background — a soft, muted tone rather than white. A light sage/green tint would work well since it ties back to the deep green used in the hero and footer without repeating it directly, and it hasn't been used anywhere else on the page yet (the other sections use white, yellow, and beige).

Within that tinted background, the review cards themselves should be a lighter shade (close to white) so they visually lift off the background — similar to how the reference image uses a white outer panel with light gray cards inside it.

---

## 7. Navigation

Add "Reviews" as a new item in the top navigation menu, in the same position it appears on the page — after "About" and before "Contact," since that's the current page order (Home → Highlights → Promo → About → Reviews → Contact). Clicking it should jump straight to this section.

---

## 8. Images

Photos (the large feature photo and the small customer avatars) are placeholders for now — no real images yet. What matters is that the space reserved for each image is locked in at its final size now, so that when real photos are added later, nothing in the layout shifts, resizes, or breaks. Use a neutral placeholder background (soft gray or muted green) in place of each image until real photos are added.

---

## 9. Content status

All five reviews are still made-up placeholder content, the same as before. Down the line, this section will pull real reviews from actual customer accounts, most likely with more than five and some way to browse through them. Nothing needs to be built for that yet — just keep in mind that today's five hardcoded reviews are a stand-in, not final content.

---

## 10. Summary checklist

- [ ] Replace the flat 3-card row with a split layout: large photo on one side, 2×2 review grid on the other
- [ ] Keep the heading and subheading copy exactly as written above
- [ ] Featured review overlays the bottom-left corner of the photo, with a decorative quote mark
- [ ] Four more reviews fill the grid, each with stars, quote, divider, avatar, name, and tag
- [ ] Five total reviews (up from three)
- [ ] Mobile stacks photo then reviews vertically — no swipe/carousel
- [ ] Section takes up a full screen's height, content centered within it
- [ ] Background changed to a soft sage/green tint, distinct from the white "Our Story" section above it; cards inside stay lighter to stand out from that background
- [ ] "Reviews" added to the top nav, positioned between "About" and "Contact"
- [ ] Image areas locked to final size now so nothing shifts once real photos are added later