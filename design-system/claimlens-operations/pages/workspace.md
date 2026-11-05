# Workspace page override

Single route: `app/page.tsx` → `ClaimWorkspace`.

## Shell

Sticky 56px header on `$primary` ink:

- Left: Shield + ClaimLens AI + sentence-case product title
- Centre (desktop): live status region (`role="status"` atomic) — Idle / Running
  specialists / Awaiting approval / Completed / Failed
- Right: mode chip (`fake` vs `live`) and the always-visible provisional label

Header text on ink must stay ≥4.5:1. Status region must not steal focus.

## Grid

Desktop ≥960px: two columns, `minmax(0, 22rem)` form + `minmax(0, 1fr)` outcome.
Align start. Form column is the stable intake; outcome column is the working
surface.

Below 960px: stack form → status → result → trace → approval. Sticky HITL bar
at the viewport bottom when `suspended`, with `scroll-padding-bottom` so focus
is not covered (WCAG 2.2 focus-not-obscured).

## Form (left)

One legend: Claim details. Inline errors plus a linked error summary at the
top; after failed submit, focus `#claim-error-summary`. Keep 44px control
height. Example loaders are secondary buttons, not links.

Submit label: Run triage / Running specialists… with `aria-busy` on the form
while the run is live.

## Outcome (right)

1. **Result card** — classification chip + failure reason + evidence list +
   verbatim citations. Empty state is a short instruction, not a skeleton
   graveyard.
2. **Trace** — activity feed, not a raw JSON dump. Group by agent. Show tool
   name in monospace. Token usage is a compact footer, not a second card.
3. **Approval bar** — only when `suspended`. Sticky to the outcome column
   (desktop) or viewport (mobile). Approve = accent, Request changes =
   secondary, Decline = destructive. Note field labelled.

## Live region rules

One status message for run state. Do not attach `aria-live` to every trace
row. Trace is a log; the header status is the announcement.

## Focus

3px `$ring` offset 2px on every control, including sticky bar buttons. Tab
order: header skip-link → form → result → trace → approval.
