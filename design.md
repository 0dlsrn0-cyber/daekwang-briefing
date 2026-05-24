# HousingOps Design Guide

Reference source: `C:\Users\0dlsr\Desktop\.cursor\완료\홈페이지`

This guide captures the reusable visual system from the HousingOps homepage so it can be applied to this briefing app and other internal tools without changing business logic.

## Design Direction

The UI should feel like a quiet internal operations portal: structured, readable, and work-focused. Avoid marketing-heavy hero sections, oversized decorative cards, and loud gradients. The first screen should show the actual tool or workflow, with branding and context supporting it.

Core traits:

- Off-white operational background with white work surfaces.
- Deep navy as the primary action and identity color.
- Muted gray text hierarchy with restrained gold accents.
- Sticky top navigation for app identity and quick movement.
- Compact cards, tables, form controls, and status badges.
- 8px base radius, 12px only for large surfaces.
- Light shadows only for hierarchy, not decoration.

## Tokens

Use these CSS variables as the base theme:

```css
:root {
  --bg: #fbf9f8;
  --surface: #ffffff;
  --surface-soft: #f6f3f2;
  --surface-muted: #f0eded;
  --line: #d8d5d3;
  --line-strong: #c5c6cf;
  --text: #1b1c1c;
  --muted: #44474e;
  --subtle: #75777f;
  --primary: #031635;
  --primary-soft: #1a2b4b;
  --primary-tint: #eef3ff;
  --gold: #775a19;
  --success: #1b5e20;
  --warn: #785a1a;
  --danger: #93000a;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-soft: 0 4px 12px rgba(26, 43, 75, 0.08);
  --shadow-card: 0 10px 24px rgba(26, 43, 75, 0.08);
  --font-display: "Hanken Grotesk", "Noto Sans KR", system-ui, sans-serif;
  --font-body: "Noto Sans KR", "Pretendard", system-ui, sans-serif;
}
```

## Layout

Topbar:

- Sticky, 64px high on desktop.
- Left brand mark and wordmark.
- Center navigation links with the active item underlined.
- Right primary action, usually admin/settings/account.
- On mobile, wrap navigation under the brand row and allow horizontal scrolling.

Main content:

- Max width: `1280px`.
- Desktop padding: `40px clamp(20px, 4vw, 32px) 72px`.
- Tool-first hero: left side explains the workflow, right side contains the actual form or active tool panel.
- Use a subtle bitmap or real product image in the hero background when available. Current asset: `/design/housingops-line-art.jpeg`.

Cards:

- Border: `1px solid var(--line-strong)`.
- Radius: `12px` for large panels, `8px` for controls.
- Header background: `var(--surface-soft)`.
- Body padding: `24px` desktop, `20px` mobile.
- Do not nest decorative cards. Use cards only for forms, results, tables, repeated items, and modals.

## Components

Buttons:

- Primary: navy fill, white text.
- Secondary: white fill, strong border, navy text.
- Height: `42-46px`.
- Hover: darken navy or apply `var(--primary-tint)`.
- Keep labels short and action-oriented.

Inputs:

- Height: `44px`.
- White background, strong neutral border.
- Focus ring: `0 0 0 3px rgba(26, 43, 75, 0.1)`.
- Labels are uppercase, 12px, bold, muted gray.

KPI and metrics:

- Use tabular numbers.
- Small uppercase label above a large navy value.
- Optional left border in navy or gold.

Tables:

- Header background navy for dense report tables.
- Use thin neutral borders.
- Right-align numeric values.
- Keep row hover subtle with `var(--surface-soft)`.

Status:

- Success: green text on pale green.
- Warning: brown/gold text on pale yellow.
- Error: red text on pale red.
- Pills should be compact, 10-12px text, 4-6px radius.

## Typography

- Display: Hanken Grotesk for English wordmarks, large headings, and numeric metrics.
- Body: Noto Sans KR or Pretendard for Korean content.
- Mono: IBM Plex Mono or Consolas for timestamps, IDs, and logs.
- Avoid negative letter spacing except large display headings where `-0.02em` to `-0.035em` is acceptable.
- Korean paragraph copy should use `word-break: keep-all` where line breaks matter.

## Application Rules

When applying this design to another site:

1. Preserve existing functional components, API calls, state, and data contracts.
2. Replace only layout wrappers, CSS tokens, component styling, and static design assets.
3. Keep primary workflows on the first screen; do not turn tools into landing pages.
4. Use the same topbar, card, form, button, table, KPI, and status patterns.
5. Keep mobile layouts single-column and avoid horizontal overflow except intentional nav scrolling.
6. Verify with desktop and mobile screenshots after styling changes.

## Current Implementation Notes

This project now uses:

- `app/globals.css` for the HousingOps design tokens and component styles.
- `components/HomeView.tsx` for the topbar plus tool-first hero layout.
- `public/design/briefing-ambient.mp4` as the feathered hero background video.
- `public/design/housingops-line-art.jpeg` as a fallback/reference still asset copied from the reference site.

No briefing API logic, form submission behavior, session storage behavior, email sending behavior, or admin routing logic should be changed as part of this design layer.
