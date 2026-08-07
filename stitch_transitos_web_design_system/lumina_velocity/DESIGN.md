---
name: Lumina Velocity
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#d1bcff'
  on-secondary: '#3c0090'
  secondary-container: '#7000ff'
  on-secondary-container: '#ddcdff'
  tertiary: '#ffeac0'
  on-tertiary: '#3e2e00'
  tertiary-container: '#fec931'
  on-tertiary-container: '#6f5500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d1bcff'
  on-secondary-fixed: '#23005b'
  on-secondary-fixed-variant: '#5700c9'
  tertiary-fixed: '#ffdf96'
  tertiary-fixed-dim: '#f3bf26'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stats-number:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system embodies a "Command Center" aesthetic—sophisticated, high-tech, and hyper-efficient. It is designed for the modern urban navigator who requires real-time data at a glance without cognitive overload. 

The visual style is a blend of **Glassmorphism** and **Corporate Modern**. By utilizing deep, light-absorbing backgrounds contrasted with vibrant, glowing data visualizations, the UI creates a sense of depth and priority. It feels like a premium digital cockpit, evoking feelings of reliability, speed, and futuristic precision. The use of transparency and blur ensures the interface feels lightweight despite the density of information.

## Colors

The palette is anchored by a "True Dark" foundation to maximize contrast and reduce eye strain in low-light transit environments. 

- **Primary Cyan:** Used exclusively for high-priority actions, active states, and "Live" indicators. It should appear to "glow" against the dark background.
- **Surface Strategy:** Instead of solid grays, we use semi-transparent white overlays on the base background. This creates a "glass" effect that maintains the deep black aesthetic while defining hierarchy.
- **Semantic Badges:** Line colors (Red, Violet, etc.) are strictly reserved for transit route identification. They should always be paired with high-contrast white or black text depending on the specific hue's luminosity.
- **Status Colors:** Use standard Green (Good Service), Yellow (Minor Delays), and Red (Suspended) for system health, distinct from transit line colors.

## Typography

This design system utilizes **Inter** for its exceptional legibility on digital screens and its neutral, modern character. 

- **Contrast:** High contrast between titles (SemiBold/Bold) and body text (Regular) is essential for rapid scanning.
- **Numerics:** Since transit data is heavy on numbers (times, distances, fares), ensure tabular lining is used where possible to align digits in lists.
- **Mobile Scaling:** On devices smaller than 768px, `display-lg` should scale down to 24px to ensure headers do not wrap excessively. 
- **Labels:** Use the `label-caps` style for section headers in sidebars and small metadata tags to provide a clear structural anchor.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a fixed left sidebar. 

- **Sidebar:** 260px wide (expanded) and 72px (collapsed). It uses a blurred glass effect to allow the background map or content to peak through slightly.
- **Top Navbar:** 64px height, pinned to the top. Contains global search and profile.
- **Grids:** A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Density:** The system uses "Medium Density" spacing. Information is packed tightly but separated by clear "glass" card containers to prevent visual clutter.

## Elevation & Depth

Hierarchy is defined through **Tonal Layering** and **Backdrop Blurs** rather than traditional drop shadows.

1.  **Level 0 (Base):** Deep background (#080C14). Used for the main canvas or map layer.
2.  **Level 1 (Surface):** Glass cards (4% White Overlay + 20px Backdrop Blur). Used for primary content sections and dashboard widgets.
3.  **Level 2 (Float):** Overlays and Popovers (8% White Overlay + 30px Backdrop Blur). Used for tooltips, dropdowns, and modal dialogs.
4.  **Accents:** A 1px inside border (stroke) with 10% white opacity is applied to all cards to define edges against the dark background. Active cards may feature a subtle Cyan outer glow (4px blur, 20% opacity).

## Shapes

The shape language is friendly yet structured. 

- **Cards:** Use a standard **16px** (rounded-lg) radius to create a soft, modern container.
- **Interactive Elements:** Buttons and input fields use **12px** radius.
- **Navigation/Status:** Tabs, line indicators, and "Live" badges are **Pill-shaped** (full radius) to distinguish them from structural content containers.
- **Visual Rhythm:** Consistent rounding across all nested elements is required; inner elements should have a radius 4px smaller than their parent container to maintain optical balance.

## Components

- **Buttons:** 
    - *Primary:* Solid Cyan background with black text. 
    - *Secondary:* Glass background with Cyan border and text. 
    - *Icon-only:* Circular glass surfaces.
- **Cards:** All cards must feature a `border: 1px solid rgba(255,255,255,0.1)` and `backdrop-filter: blur(20px)`.
- **Navigation Rail (Sidebar):** Icons are 24px. Active state is indicated by a vertical Cyan pill on the far left and the icon color switching to Cyan.
- **Tabs:** Pill-shaped toggle groups. The active tab has a solid light-glass background or a Cyan accent depending on the context.
- **Transit Badges:** Compact rectangular badges with fully rounded ends. Each contains the Line Name and an icon. Background color must match the specific Transit Line color token.
- **Inputs:** Darker than the surface (rgba(0,0,0,0.2)), with a Cyan focus ring.
- **Progress Bars:** Thin, 4px height. Track is dark glass; the filler is Cyan or the specific line color.