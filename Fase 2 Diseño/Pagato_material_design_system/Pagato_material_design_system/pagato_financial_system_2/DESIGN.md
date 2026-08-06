---
name: PagaTo Financial System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#476083'
  primary: '#000613'
  on-primary: '#ffffff'
  primary-container: '#001f3f'
  on-primary-container: '#6f88ad'
  inverse-primary: '#afc8f0'
  secondary: '#545f72'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f7'
  on-secondary-container: '#586377'
  tertiary: '#170001'
  on-tertiary: '#ffffff'
  tertiary-container: '#470004'
  on-tertiary-container: '#f24846'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#afc8f0'
  on-primary-fixed: '#001c3a'
  on-primary-fixed-variant: '#2f486a'
  secondary-fixed: '#d8e3fa'
  secondary-fixed-dim: '#bcc7dd'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  nav-item:
    fontFamily: Roboto Flex
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  nav-width: 240px
  section-gap: 48px
  input-padding: 12px 16px
---

## Brand & Style
The design system for this financial platform is rooted in **Corporate Modernism** with a focus on precision, security, and high-density information management. The aesthetic is professional and systematic, prioritizing clarity over decoration. 

The brand personality is authoritative yet efficient, utilizing a "Surface-Container" architecture to organize complex data hierarchies. It evokes a sense of stability and institutional trust through a rigid grid, deliberate use of whitespace, and a disciplined monochromatic foundation punctuated by a deep navy primary tone.

## Colors
The palette is dominated by the primary brand color, **#001f3f**, used for core navigation, primary actions, and brand identification. 

- **Primary**: Used for active states, primary buttons, and global navigation.
- **Surface Tiers**: The "Surface-Container" logic uses progressively darker shades of cool gray to define depth without shadows. 
- **Danger Zone**: A specific red-tinted palette is reserved for destructive settings, providing a high-contrast visual warning.
- **Status Badges**: Use specific semantic tokens:
    - *Verified*: Primary Navy background with white text.
    - *Pending*: Amber-500 tint.
    - *Insecure/Action Required*: Tertiary Red.

## Typography
This design system exclusively utilizes **Roboto Flex** to leverage its variable weight and width properties for data-heavy interfaces.

- **Headlines**: Use heavier weights (600-700) for section titles in Settings to create clear landing points for the eye.
- **Labels**: Small-cap labels are used for form headers and non-interactive metadata to distinguish them from user input.
- **Navigation**: The secondary side nav uses a slightly condensed width and medium weight to maintain legibility in narrow columns.

## Layout & Spacing
The Settings module follows a **Dual-Pane Fixed Grid** layout.

1.  **Secondary Side Nav**: A fixed 240px vertical sidebar on the left of the content area.
2.  **Main Content**: A fluid container with a max-width of 800px to ensure optimal line length for form readability.
3.  **Form Grouping**: Related settings are grouped within `surface-container` blocks. Vertical spacing between these blocks is set to `section-gap` to prevent visual clutter.
4.  **Dividers**: Hairline 1px dividers (using `surface-container-high`) are used only *within* groups to separate individual line items.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** rather than shadows.

- **Level 0 (Base)**: The main background uses the `neutral` token (#f8fafc).
- **Level 1 (Card/Section)**: Settings groups are placed on white (`surface`) cards with a 1px `surface-container-high` border.
- **Internal Elements**: Embedded controls, such as segmented buttons or search inputs within settings, use `surface-container` to appear slightly recessed.
- **Active State**: Navigation items use a vertical 3px "Primary" bar on their leading edge to indicate the current selection, rather than an elevation change.

## Shapes
The shape language is **Soft (0.25rem)**. This subtle rounding maintains a professional, geometric feel while softening the "industrial" edges of the financial data.

- **Containers**: Cards and grouped containers use `rounded-lg` (0.5rem).
- **Controls**: Inputs, buttons, and toggle tracks use the base `rounded` (0.25rem).
- **Badges**: Use `rounded-xl` (0.75rem) or full pill-shape for verification status to distinguish them from interactive buttons.

## Components

### Internal Vertical Navigation (Secondary Nav)
- **State Styling**: Active items use `primary_color_hex` text with a subtle `surface-container` background. Inactive items use `secondary_color_hex`.
- **Layout**: Icons (20px) are mandatory for every nav item to facilitate rapid scanning.

### Form Grouping & Danger Zone
- **Standard Group**: White background, `surface-container-high` border. Include a `title-sm` header outside the box.
- **Danger Zone**: A separate container with `danger-zone-bg`. The border is `danger-zone-border`. Primary actions inside this zone must use the Tertiary Red color.

### Toggle Switches & Segmented Buttons
- **Toggle**: A 40mm x 20mm track. The "On" state uses `primary_color_hex`. The "Off" state uses `surface-container-high`.
- **Segmented Buttons**: A single container with `surface-container` background. The active segment is white with a subtle shadow to indicate it is "pressed" or "raised" above the recessed track.

### Status Badges
- **Security Verification**: Small-caps text inside a pill-shaped container.
- **Iconography**: Use a "Shield Check" icon for verified accounts and a "Shield Alert" for missing 2FA settings.

### Inputs
- **Field Style**: 1px solid border. Focus state uses a 2px `primary_color_hex` outline with 0px offset.
- **Helper Text**: Always positioned below the input using `body-sm` in `secondary_color_hex`.