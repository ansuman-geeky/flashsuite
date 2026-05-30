---
name: Flash Modern SaaS
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#524151'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#857182'
  outline-variant: '#d7c0d3'
  surface-tint: '#a400b7'
  primary: '#9e00b1'
  on-primary: '#ffffff'
  primary-container: '#c026d3'
  on-primary-container: '#fffafa'
  inverse-primary: '#fda9ff'
  secondary: '#545f6e'
  on-secondary: '#ffffff'
  secondary-container: '#d8e3f5'
  on-secondary-container: '#5a6574'
  tertiary: '#b4005d'
  on-tertiary: '#ffffff'
  tertiary-container: '#d92575'
  on-tertiary-container: '#fffafa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd6fb'
  primary-fixed-dim: '#fda9ff'
  on-primary-fixed: '#36003d'
  on-primary-fixed-variant: '#7d008c'
  secondary-fixed: '#d8e3f5'
  secondary-fixed-dim: '#bcc7d8'
  on-secondary-fixed: '#121c29'
  on-secondary-fixed-variant: '#3d4855'
  tertiary-fixed: '#ffd9e2'
  tertiary-fixed-dim: '#ffb1c7'
  on-tertiary-fixed: '#3f001c'
  on-tertiary-fixed-variant: '#8e0048'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  deep-navy: '#0B1622'
  vibrant-fuchsia: '#C026D3'
  power-pink: '#DB2777'
  surface-light: '#F8F9FA'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  baseline: 4px
  gutter-mobile: 16px
  gutter-desktop: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style

This design system is built for a high-performance SaaS environment, blending the structural logic of **Material 3 (M3)** with a high-contrast, professional aesthetic. The brand personality is reliable yet energetic, utilizing deep, "dark-mode-first" navy tones contrasted against vibrant neon accents to signal innovation and speed.

The visual style follows a **Corporate / Modern** approach with **Glassmorphic** influences. It emphasizes clarity through generous white space, rigorous tonal consistency, and large-radius rounded corners that soften the technical nature of the software. The interface should feel premium, responsive, and deeply integrated into the modern web ecosystem.

## Colors

The palette is derived from the core brand identity: a foundation of **Deep Navy** (#0B1622) for authority and a **Vibrant Fuchsia** (#C026D3) for action and focus. 

The design system utilizes **M3 Tonal Palettes**. Every key color generates a range of 13 tones (0-100). 
- **Primary:** Fuchsia is used for high-emphasis actions and brand moments.
- **Secondary:** Deep Navy is used for structural elements, sidebars, and primary navigation backgrounds.
- **Tertiary:** Power Pink is used for supporting accents, success states, or data visualization highlights.
- **Neutral:** A cool-toned gray scale derived from the Deep Navy hue ensures the UI feels cohesive rather than utilizing generic blacks/grays.

Use `on-primary` (White) and `primary-container` (soft fuchsia tints) for complex component states.

## Typography

This design system uses **Inter** exclusively to maintain a clean, systematic, and highly legible appearance across all resolutions. 

- **Weight Usage:** Use *Bold (700)* or *Semi-Bold (600)* for headlines to create a strong visual hierarchy against the deep background colors. Use *Regular (400)* for all body text to ensure maximum readability in dense SaaS data views.
- **Scaling:** For mobile devices, headlines scale down slightly to prevent awkward line breaks. 
- **Letter Spacing:** Headlines utilize a slight negative tracking (-1% to -2%) for a more "designed" and tight editorial feel. Labels and captions use a positive tracking (+1%) to improve legibility at small sizes.

## Layout & Spacing

The layout is based on a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **Spacing Rhythm:** An 8px linear scale is the standard (e.g., 8, 16, 24, 32, 48, 64). For internal component padding (like buttons or inputs), a 4px "half-step" is permitted.
- **Desktop:** 1280px max-width container, centered. Large margins (64px) create a premium, un-cluttered feel.
- **Reflow:** On tablet/mobile, side-by-side card layouts should stack vertically. Horizontal scrolling is reserved for data tables and "chip" groups.
- **Density:** High-density views (dashboards) may scale spacing down to a 4px rhythm, while marketing pages (landing) should use the 8px rhythm to maximize whitespace.

## Elevation & Depth

This design system adheres to the **Material 3 Elevation** model but introduces "Tonal Layering."

1.  **Level 0 (Surface):** The base background color.
2.  **Level 1 (Tonal Offset):** Cards and containers use a slightly lighter/darker tint of the background instead of a shadow.
3.  **Level 2+ (Shadows):** For floating elements (modals, dropdowns, FABs), use **Ambient Shadows**. These are extra-diffused (24px+ blur), low-opacity (10-15%), and tinted with the `deep-navy` color to prevent them from looking "dirty" on colored backgrounds.
4.  **Glassmorphism:** Use a 12px-20px backdrop blur for fixed navigation bars and overlay menus to maintain context of the content beneath.

## Shapes

The shape language is characterized by **Extra-Large Roundedness** to create a friendly, modern SaaS aesthetic.

- **Standard Elements:** Buttons, input fields, and small cards use `rounded-lg` (16px).
- **Large Containers:** Hero sections, primary dashboard cards, and modals use `rounded-xl` (24px - 32px).
- **Special Elements:** Chips and Search bars should always be **Pill-shaped** (fully rounded) to differentiate them from actionable containers.
- **Consistency:** Never mix sharp corners with rounded corners. If a container is nested, the inner corner radius should be slightly smaller than the outer radius to maintain geometric harmony.

## Components

- **Buttons:** Primary buttons use the Fuchsia gradient or solid fill with White text. Secondary buttons use a Deep Navy outline or a subtle tonal tint. All buttons have a minimum height of 48px for accessibility.
- **Cards:** Dashboard cards should feature a 1px stroke (Deep Navy at 10% opacity) and use the Tonal Layering system for depth.
- **Input Fields:** Use the M3 "Filled" or "Outlined" style with a 16px corner radius. The active state should be highlighted by a 2px Fuchsia border.
- **Chips:** Used for filtering and tags. These are pill-shaped with a light tint of the secondary color.
- **Lists:** Use horizontal dividers sparingly; rely on 8px spacing between list items to define boundaries.
- **Navigation:** The sidebar uses a "Rail" or "Drawer" pattern from M3. Active states are indicated by a "Pill" background behind the icon in the Primary Fuchsia color.