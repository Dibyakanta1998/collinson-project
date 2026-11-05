# ClaimLens Operations — Master

Handler-facing delayed-baggage triage console. Provisional results are never
presented as a final claim decision. Prefer dense, readable operations UI over
marketing chrome.

**Dials:** variance 6 · motion 3 · density 8
**Stack:** Next.js App Router, React, SCSS modules, existing `_colors.scss` tokens
**Do not add:** GSAP, Phosphor/Lucide packages, Tailwind, new UI libraries

When building a page, check `pages/[page].md` first. If it exists, it overrides
this file.

---

## Colour

Map these into `src/styles/_colors.scss`. Do not hardcode hex in components.

| Role | Hex | SCSS |
|------|-----|------|
| Primary (ink, header) | `#0F172A` | `$primary` |
| On primary | `#FFFFFF` | `$on-primary` |
| Accent / CTA | `#0369A1` | `$accent` |
| On accent | `#FFFFFF` | `$on-accent` |
| Secondary | `#334155` | `$secondary` |
| Background | `#F8FAFC` | `$background` |
| Foreground | `#020617` | `$foreground` |
| Card | `#FFFFFF` | `$card` |
| Muted fill | `#E8ECF1` | `$muted` |
| Muted text | `#475569` | `$muted-foreground` |
| Border | `#E2E8F0` | `$border` |
| Ring | `#0369A1` | `$ring` |
| Destructive | `#DC2626` | `$destructive` |
| On destructive | `#FFFFFF` | `$on-destructive` |
| Covered | `#15803D` | `$success` |
| Covered surface | `#F0FDF4` | `$success-surface` |
| Review | `#B45309` | `$warning` |
| Review surface | `#FFF7ED` | `$warning-surface` |
| Failed surface | `#FEF2F2` | `$danger-surface` |
| Running surface | `#EFF6FF` | `$info-surface` |

Keep `$accent` for the primary action (Run triage). Keep status green/amber/red
for classification chips only — never as the page brand.

Dark mode is optional later. Light is the interview default.

## Typography

Keep **IBM Plex Sans** via `next/font/google` (already in `layout.tsx`). Do not
switch to Outfit / Work Sans — insurance trust pairing, one font file, no extra
dependency.

- Body 16px / 1.5
- Labels 13px / 600
- Eyebrow 11px / 700 / 0.08em uppercase
- Headings sentence case
- Tabular numbers for delay hours and token counts

## Spacing

8px rhythm, dense dashboard scale:

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 24px |

Page padding 16px; desktop 24px. Panel padding 16px. Form row gap 12px.

## Motion

CSS only. 150–200ms colour / opacity / border. No translateY on hover (layout
shift). No GSAP. `prefers-reduced-motion: reduce` disables timeline pulse.

## Icons

Inline 20px outline SVGs, 1.5px stroke, currentColor. Same family on every
control. Decorative icons beside text: `aria-hidden="true"`. Icon-only buttons
need a visible or `aria-label` name.

Glyphs: Shield (product), CheckCircle (covered / approve), Warning (review),
XCircle (failed / decline), Clock (running), Info (disclaimer).

No emoji as structure.

## Anti-patterns

- AI purple / pink gradients
- Card hover lift / scale
- Colour as the only status signal (always pair chip text)
- Adjudication language: pay, deny, award, settle
- New npm UI or icon packages
- Invisible focus (`outline: none` without a 3px ring)
