---
name: Academic Horizon
colors:
  surface: '#f9f9ff'
  surface-dim: '#d1daf4'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#d9e2fc'
  on-surface: '#121b2e'
  on-surface-variant: '#424752'
  inverse-surface: '#273044'
  inverse-on-surface: '#edf0ff'
  outline: '#737784'
  outline-variant: '#c3c6d4'
  surface-tint: '#1d5bb9'
  primary: '#1858b7'
  on-primary: '#ffffff'
  primary-container: '#3c72d1'
  on-primary-container: '#fefcff'
  inverse-primary: '#aec6ff'
  secondary: '#2f5cab'
  on-secondary: '#ffffff'
  secondary-container: '#81aafe'
  on-secondary-container: '#003d87'
  tertiary: '#4648d4'
  on-tertiary: '#ffffff'
  tertiary-container: '#6063ee'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004396'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#0a4491'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f9f9ff'
  on-background: '#121b2e'
  surface-variant: '#d9e2fc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authoritative, streamlined, and modern aesthetic tailored for academic conferences, peer-reviewed symposiums, and professional engineering summits. Rooted in institutional clarity and digital precision, it balances the rigorous prestige of IEEE with the approachable efficiency required for multi-author registration, credential verification, and paper metadata tracking.

The design movement blends **Corporate / Modern** engineering elegance with **Tonal Layering and Soft Glass Accents**. Whitespace is generous, eliminating cognitive load for international researchers under strict submission deadlines. Structural containers utilize soft, contemporary radiuses and subtle, diffused illumination, evoking credibility, technological sophistication, and operational calm.

## Colors

The palette directly anchors to the official symposium identity while ensuring WCAG AAA legibility across academic portals.

- **Primary (`#4479D9`) & Primary Dark (`#2C5AA8`):** Form the foundational identity for focal interactions, primary actions, progress track indicators, and IEEE navigational structures. Primary Dark serves as the primary hover and focus boundary anchor.
- **Secondary & Accent Hues:**
  - **Indigo (`#6366F1`) & Violet (`#8B5CF6`):** Applied to track tags, computational domain chips (e.g., AI/ML, Communications, Power Systems), and paper track categories.
  - **Cyan (`#0EA5E9`):** Reserved for secondary metrics, informative tooltips, and interactive metadata pills.
  - **Accent Red (`#FF0000`):** Strictly reserved for destructive actions, validation alerts, deadline warnings, and mandatory field callouts.
  - **Success Green (`#28A745`):** Denotes verified author status, successful registration fee confirmation, camera-ready approvals, and completed document uploads.
- **Neutrals & Surfaces:**
  - **Background Canvas (`#F8FAFC`):** A crisp, low-glare cool surface establishing structural breathing room.
  - **Text Dark (`#172033`):** High-contrast base tone for headings and body typography.
  - **Text Muted (`#64748B`):** Supporting tone for author affiliations, secondary labels, metadata captions, and helper notes.
  - **Borders & Dividers:** Built using `#E2E8F0` at 1px width to delineate sections without visual heaviness.

## Typography

The typographic hierarchy relies on a high-legibility sans-serif engine (Inter with fallback stacks extending through Segoe UI and system-ui) optimized for dense data tables, scientific author lists, and multilingual names with diacritics.

- **Headlines:** Use tightened letter-spacing (`-0.01em` to `-0.02em`) with semi-bold to bold weights to establish an authoritative academic tone without visual noise.
- **Body:** Open line-heights (`1.5` to `1.6`) ensure long abstract passages, terms of submission, and copyright notices remain effortlessly readable.
- **Labels & Badges:** Use explicit medium-to-bold weights with slight letter-spacing expansion (`0.02em` to `0.04em`) to maintain sharp legibility at micro-scales (e.g., "IEEE MEMBER", "CORRESPONDING AUTHOR", "ORCID VERIFIED").

## Layout & Spacing

The layout is built upon an 8-point base spatial system using a responsive 12-column grid to organize multi-tier forms, step progressions, and author roster tables.

- **Desktop (>= 1200px):** 12-column grid with a maximum container boundary of `1280px`. Gutters remain `1.5rem` (24px) with margins fixed at `2rem` (32px). Two-column asymmetrical layouts (60/40) are utilized to separate form inputs from live badge and cost calculation sidebars.
- **Tablet (768px – 1199px):** 8-column layout. Asymmetrical sections collapse to vertically stacked flow with `1.5rem` row gaps.
- **Mobile (< 768px):** 4-column layout. Margins reduce to `1rem` (16px) with column gutters at `1rem`. Floating actions and step indicators dock to sticky horizontal strips.

## Elevation & Depth

Visual hierarchy leverages ambient, tinted drop shadows and clean surface separation rather than heavy physical skeuomorphism:

- **Level 0 (Flat/Substrate):** `#F8FAFC` base application background.
- **Level 1 (Card Base):** Pure white (`#FFFFFF`) card surfaces resting with a soft modern shadow: `box-shadow: 0 4px 20px -2px rgba(23, 32, 51, 0.05), 0 2px 6px -1px rgba(23, 32, 51, 0.03);` bordered by a 1px solid stroke in `#E2E8F0`.
- **Level 2 (Active/Hover Cards & Dropdowns):** Subtle upward elevation on interactive co-author tiles: `box-shadow: 0 12px 30px -4px rgba(44, 90, 168, 0.12), 0 4px 12px -2px rgba(23, 32, 51, 0.04);`.
- **Level 3 (Modals & Verification Dialogs):** High-prominence surface with an IEEE Blue ambient tint: `box-shadow: 0 20px 40px -8px rgba(23, 32, 51, 0.18), 0 8px 16px -4px rgba(68, 121, 217, 0.08);`.

## Shapes

The geometric signature uses a defined 20px radius (`rounded-xl` / 1.25rem) specifically tailored for content-holding cards, conference identity modules, and registration containers, as designated by the visual identity.

- **Cards & Primary Modules:** Fixed at `20px` to create a distinctive, approachable academic framework.
- **Form Controls & Inputs:** Styled with `8px` (`0.5rem`) corner radiuses to maintain clean alignment and crisp scanning alongside dense text labels.
- **Buttons:** Unified at `8px` for standard controls, or fully rounded pill styles (`9999px`) strictly for meta-chips, IEEE membership validation tags, and quick-status markers.

## Components

### Buttons
- **Primary:** Filled `#4479D9` with `#FFFFFF` text. Hover state shifts to `#2C5AA8` with a 150ms ease transition. Height: 44px (touch-compliant), padding: 0 20px, font weight: 600, border-radius: 8px.
- **Secondary / Outline:** 1.5px border `#4479D9` with `#4479D9` text. Hover fills with 8% opacity primary blue.
- **Danger (Remove Co-Author):** Background transparent, text `#FF0000`, hovering to a soft `#FEE2E2` tint.

### Cards
- **Co-Author Card:** `#FFFFFF` background, exactly `20px` border-radius, 1px `#E2E8F0` border, soft Level 1 shadow. Header contains author sequence badge ("Author 02"), affiliation field, and primary contact toggle.

### Inputs & Select Fields
- Height: 42px, radius: 8px, background `#FFFFFF`, border: 1px solid `#CBD5E1`.
- Focused state: 1.5px solid `#4479D9` accompanied by a soft focus ring (`box-shadow: 0 0 0 3px rgba(68, 121, 217, 0.18)`).
- Label position: Top-aligned, 12px label-md in `#172033` with mandatory asterisks tinted in Accent Red (`#FF0000`).

### Chips & Badges
- **Conference Badge:** Displays IEEE and i-COSTE 2026 insignia. Pill radius (`9999px`), padding: 4px 12px. Background `#EEF2FF`, border 1px solid `#C7D2FE`, text `#2C5AA8` (font-size: 11px, weight: 700).
- **Status Chips:**
  - *IEEE Member Verified:* Background `#DCFCE7`, text `#166534`, border 1px solid `#86EFAC`.
  - *Pending Verification:* Background `#FEF3C7`, text `#92400E`, border 1px solid `#FCD34D`.
  - *Student Track:* Background `#F0FDF4`, text `#15803D`.

### Checkboxes & Radios
- Size: 18x18px. Active checked fill is `#4479D9` with an inset white checkmark. Unchecked border is 1.5px `#94A3B8`. Hover introduces a 3px ambient ring of `rgba(68, 121, 217, 0.15)`.

### Co-Author Roster List
- Clean horizontal stack with drag-reorder handles for reassigning authorship order (First Author, Co-Author, Corresponding Author). Left-side color-coded bar (`4px` wide) indicates verification status (Green for complete, Indigo for pending details).