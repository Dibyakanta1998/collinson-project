# ClaimLens Operations UI

Locked direction: **operations console** (dense split workspace, sticky HITL,
live status). Visual source of truth:
`design-system/claimlens-operations/MASTER.md` plus
`design-system/claimlens-operations/pages/workspace.md`.

This is a visual/interaction redesign of the existing handler workspace. It
does not change triage behaviour, APIs, or Mastra agents.

## Why

The current page is a pale-blue two-card form. It reads as a demo, not as a
claims-handler console: no app shell, no live status that a screen reader can
trust, HITL is just another block, and the trace is a flat event list.

## Constraints

- SCSS modules + `_colors.scss` / `_mixins.scss` tokens only
- IBM Plex Sans stays (`next/font`)
- No new npm packages (no GSAP, Phosphor, Tailwind)
- Copy stays in `src/content/workspace.ts`
- Keep existing components: `ClaimWorkspace`, `ClaimForm`, `ResultPanel`,
  `TracePanel`, `ApprovalBar`
- Browser-verify after implementation: idle, running, suspended HITL, completed,
  validation error, 375px and 1440px

## Token delta

Retheme `_colors.scss` to the operations palette (slate ink + sky CTA). Keep
semantic surfaces for covered / review / failed / running. `$ring` stays
visible 3px on light cards (`#0369A1`), not navy-on-navy.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [shield] ClaimLens AI     status: Running     [live] [prov.] │
├─────────────────────────┬────────────────────────────────────┤
│ Claim details           │ Provisional result                 │
│ fields + examples       │ chip + evidence + citations        │
│ [Run triage]            │ Agent / tool activity              │
│                         │ usage footer                       │
│                         │ ┌ sticky HITL when suspended ────┐ │
│                         │ │ note  [Approve] [Changes] [No] │ │
│                         │ └────────────────────────────────┘ │
└─────────────────────────┴────────────────────────────────────┘
```

## Motion and a11y

- 150–200ms colour/opacity only; no hover translate
- One `role="status"` for run state; form `aria-busy` while running
- Error summary focused after invalid submit; inline errors retained
- Sticky HITL must not cover focused controls (`scroll-padding`)
- Reduced motion: no pulse on the running chip

## Out of scope

Auth, claim queue, Studio embedding, dark mode, extra routes.

## Implementation slices

1. Tokens + `globals.scss` + header shell
2. Grid + form density
3. Result chip / empty / live status wiring
4. Trace as activity feed
5. Sticky HITL + focus/scroll-padding
6. Browser pass on the six states above
