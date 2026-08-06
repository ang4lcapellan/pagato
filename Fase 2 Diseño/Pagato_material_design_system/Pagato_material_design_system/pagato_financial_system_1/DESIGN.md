---
name: PagaTo Financial System
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#43474e'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#476083'
  primary: '#000613'
  on-primary: '#ffffff'
  primary-container: '#001f3f'
  on-primary-container: '#6f88ad'
  inverse-primary: '#afc8f0'
  secondary: '#565f71'
  on-secondary: '#ffffff'
  secondary-container: '#d7e0f5'
  on-secondary-container: '#5a6375'
  tertiary: '#000802'
  on-tertiary: '#ffffff'
  tertiary-container: '#002510'
  on-tertiary-container: '#559469'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#afc8f0'
  on-primary-fixed: '#001c3a'
  on-primary-fixed-variant: '#2f486a'
  secondary-fixed: '#dae3f8'
  secondary-fixed-dim: '#bec7db'
  on-secondary-fixed: '#131c2b'
  on-secondary-fixed-variant: '#3e4758'
  tertiary-fixed: '#b0f2c0'
  tertiary-fixed-dim: '#94d5a6'
  on-tertiary-fixed: '#00210e'
  on-tertiary-fixed-variant: '#0e512d'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  title-lg:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  column-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system follows a **Strict Material Design 3 (Material You)** philosophy, prioritizing stability, security, and organizational clarity for personal finance management. The aesthetic is professional and utilitarian, drawing inspiration from high-density financial tools like the Stripe Dashboard and Google Finance.

The UI is built on a foundation of tonal relationships rather than static colors, ensuring a cohesive experience across different lighting conditions. It utilizes the M3 "State Layer" system (hover, focus, pressed) to provide immediate, tactile feedback, reinforcing the sense of a responsive and secure platform.

## Colors
This design system employs the **Material 3 Tonal Palette** system. Surfaces are generated using primary, secondary, and tertiary containers.

- **Primary (#001F3F):** Represents security and institutional trust. Used for main actions and branding.
- **Secondary (Blue-grey):** Used for less prominent UI elements like utility bars and secondary chips.
- **Tertiary (Financial Green):** Dedicated to positive financial growth, "Income" indicators, and successful transaction states.
- **Surface Tint:** In dark mode, surfaces receive a primary-colored overlay based on elevation levels (0-5) to create depth without relying solely on shadows.

## Typography
The system uses a dual-font approach. **Roboto Flex** provides a systematic, highly legible foundation for headers and numerical displays (like account balances), benefiting from its variable weight axis. **Inter** is utilized for body text and labels to ensure maximum clarity in high-density data environments.

Numerical data in transaction lists should use `font-variant-numeric: tabular-nums` to ensure currency columns align perfectly for easy scanning.

## Layout & Spacing
The design system is built on an **8px baseline grid**. All spatial increments and component dimensions are multiples of 8 (or 4 for fine-grained adjustments).

- **Desktop (1240px+):** 12-column grid with a fixed Navigation Rail (80px) or Side Drawer (256px).
- **Tablet (600px - 1239px):** 8-column grid with a Navigation Rail.
- **Mobile (0px - 599px):** 4-column grid with 16px margins and a Bottom Navigation bar.

Financial data density is managed through the use of "List Item" standards: `56px` height for single-line items and `72px` for multi-line transaction rows.

## Elevation & Depth
Elevation is expressed through the **Material 3 Elevation System**, which uses both shadows and surface color tinting.

- **Level 0 (Flat):** Surface color. Used for the main background.
- **Level 1:** +5% Primary color tint. Used for cards and search bars.
- **Level 2:** +8% Primary color tint. Used for cards that contain interactive elements.
- **Level 3:** +11% Primary color tint. Default for Floating Action Buttons (FABs) and Dialogs.
- **Level 4/5:** Reserved for transient elements like menus and tooltips.

In Dark Mode, physical shadows are less visible; therefore, the tonal tint increase is the primary indicator of height.

## Shapes
The shape language follows the **Rounded** (Medium) category of Material 3.
- **Extra Small (4px):** Tooltips and subtle indicators.
- **Small (8px):** Text fields, buttons, and small chips.
- **Medium (12px):** Standard financial cards and transaction containers.
- **Large (16px):** Navigation drawers and primary dashboard modules.
- **Full (Pill):** Search bars, filter chips, and primary buttons.

## Components

### Buttons
- **Filled:** Used for the final primary action (e.g., "Confirm Transfer"). Background: Primary; Text: On-Primary.
- **Tonal:** Used for secondary high-emphasis actions. Background: Secondary Container; Text: On-Secondary-Container.
- **Outlined:** Used for medium-emphasis actions (e.g., "Edit Profile"). Border: Outline variant; Text: Primary.
- **Text:** Used for low-emphasis actions or within cards (e.g., "View All").

### Financial Cards
Dashboard cards utilize `Elevation Level 1`. They must include a clear `Title-md` for the header and use `Display-lg` for the primary balance figure. Backgrounds should be `Surface Container Low`.

### Transaction Rows
Designed for high-density scanning. 
- Left: Material Symbol (Rounded) in a 40x40 circle container.
- Center: `Body-lg` for merchant name, `Body-md` for category.
- Right: `Title-md` for the amount. Positive values use Tertiary (Green) text.

### TextFields & Selects
Use the MD3 **Filled** style with a bottom stroke for standard forms, or **Outlined** for high-density dashboards. All inputs must include a `Label-sm` as a supporting text element for accessibility.

### Charts Container
Charts are placed within an Elevation Level 1 card. Use a minimal 1px `Outline Variant` border. Grid lines within charts should use the `Neutral-variant 90` (Light) or `Neutral-variant 30` (Dark) to remain unobtrusive.