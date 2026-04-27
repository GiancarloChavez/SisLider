# SisLider — Dashboard & Sidebar Design Spec

**Date:** 2026-04-26
**Status:** Approved
**Register:** Product

---

## Context

Single-user internal system for a school secretary. Used daily on desktop in a lit office environment. The interface must be efficient for repetitive tasks: registering payments, checking attendance, enrolling students. Design philosophy: the interface recedes, the data leads.

---

## Design Decisions

### Style
**Dark Mode OLED sidebar + Minimalism Swiss content area.**
Sidebar anchors navigation with deep contrast. Content area is light and neutral, optimized for reading data all day without fatigue.

### Color Strategy: Restrained
One accent (`oklch(52% 0.19 248)` — blue) used only for primary actions, current selection, and links. All neutrals tinted toward the brand hue (chroma 0.005–0.02). No pure black or white.

### Typography
**Inter** — single family, weight as the primary differentiator.
- Scale ratio: 1.125 between steps
- Labels: 10–10.5px, 500–600, uppercase, letter-spacing 0.6–1.3px
- Body/table: 12.5–13px, 400–500
- Stats: 28px, 700, letter-spacing -1px, tabular-nums

---

## Color Tokens (OKLCH)

```css
/* Sidebar */
--sidebar-bg:       oklch(8%  0.012 248);   /* deep blue-black */
--sidebar-hover:    oklch(13% 0.018 248);
--sidebar-active:   oklch(19% 0.04  248);
--sidebar-text:     oklch(44% 0.02  248);
--sidebar-text-act: oklch(82% 0.06  220);
--sidebar-label:    oklch(32% 0.016 248);

/* Content surface */
--bg:               oklch(96.5% 0.006 248);
--surface:          oklch(99%   0.003 248);
--surface-raised:   oklch(98%   0.004 248);
--border:           oklch(91%   0.01  248);
--border-subtle:    oklch(94%   0.007 248);

/* Text */
--text-primary:     oklch(16%  0.018 248);
--text-secondary:   oklch(46%  0.016 248);
--text-muted:       oklch(62%  0.012 248);

/* Accent */
--accent:           oklch(52%  0.19  248);
--accent-bg:        oklch(95%  0.04  248);

/* Semantic */
--amber:            oklch(72%  0.16   75);
--amber-text:       oklch(48%  0.12   60);
--red:              oklch(54%  0.21   25);
--red-text:         oklch(40%  0.16   25);
--red-bg:           oklch(97%  0.03   25);
```

---

## Spacing Scale

8px base. Named variables: `--s1: 4px` through `--s8: 32px`.

---

## Components

### Sidebar (210px fixed)

- **Logo:** 22px square mark (accent blue) + wordmark, 52px tall header
- **Nav items:** 7px/10px padding, 14px Lucide icon, 13px text, 6px radius
- **Section groups:** 9px uppercase label (1.3px tracking) + full-width 1px line
- **Active state:** `--sidebar-active` background, `--sidebar-text-act` color — no border accents
- **Footer:** avatar (26px circle) + name/role + logout icon

### Topbar (52px)

- Title (14px, 600) + date (11.5px, muted) left-aligned
- Bell + Settings icon buttons (30px hit area) right-aligned

### Stat Strip

Single container (`border-radius: 10px`, 1px border), 4-column grid. Vertical 1px dividers via `::before` pseudo-element on each stat except the first. No colored accent borders.

Each stat:
- Label: 10.5px, 500, uppercase, muted, with 12px Lucide icon
- Value: 28px, 700, tabular-nums. Amber/red color only for actionable alerts (pending payments count)
- Meta: 11px, muted. Only the overdue count uses a red tag (background `--red-bg`)

### Pending Payments Table

- Header row: surface-raised background, 10px uppercase labels
- Body rows: 11px padding, subtle hover (`oklch(97.5% 0.007 248)`), 1px separator
- Amounts: tabular-nums, 13px, 600. Color: amber for pending, red for overdue
- Status: dot (6px circle) + text only — no background pills
- Action: link-style button (no border, no background), accent color + Lucide icon

---

## Icons

**Lucide** (Linear-style, stroke-based). Never emoji.

| Location | Icon |
|---|---|
| Logo mark | `zap` |
| Dashboard | `layout-dashboard` |
| Alumnos | `users` |
| Matrículas | `clipboard-list` |
| Asistencias | `calendar-check` |
| Clases | `book-open` |
| Pagos | `credit-card` |
| Logout | `log-out` |
| Stat: Alumnos | `users` |
| Stat: Matrículas | `clipboard-list` |
| Stat: Pagos pend. | `clock` |
| Stat: Ingresos | `banknote` |

---

## Anti-patterns Avoided

- No side-stripe colored borders (`border-left` accent) — banned by impeccable
- No hero-metric template (big number + gradient accent card grid)
- No emoji icons
- No pure `#000` / `#fff` — all neutrals tinted
- No identical card grids — stat strip uses single container with dividers
- No heavy badge backgrounds — dot-only status indicators

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (210px)     │  Main (flex: 1)                      │
│                      │  ┌─ Topbar (52px) ─────────────────┐ │
│  Logo                │  │  Dashboard    Sábado 26 abr      │ │
│  ─────────           │  └──────────────────────────────────┘ │
│  Dashboard (active)  │                                      │ │
│                      │  ┌─ Stat Strip ─────────────────────┐ │
│  ACADÉMICO ────      │  │ Alumnos│Matrículas│Pagos│Ingresos│ │
│  Alumnos             │  └──────────────────────────────────┘ │
│  Matrículas          │                                      │ │
│  Asistencias         │  ┌─ Pending Payments Table ──────────┐ │
│  Clases              │  │  Header                          │ │
│                      │  │  Row × n                         │ │
│  FINANZAS ────       │  └──────────────────────────────────┘ │
│  Pagos               │                                      │ │
│                      │                                        │
│  [S] Secretaria      │                                        │
└──────────────────────┴────────────────────────────────────────┘
```

---

## Reference Mockup

`.superpowers/brainstorm/880-1777224473/content/mockup-polished.html`
