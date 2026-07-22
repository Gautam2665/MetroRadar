# Design System: Animations

MetroRadar enforces smooth, non-abrupt transitions to ensure the GIS digital twin platform behaves elegantly.

## Timing Variables

-   **Fast Transitions**: `150ms` (hover events on cards/buttons).
-   **Standard Transitions**: `300ms` (sidebar toggle slide, tab panels fade-in).
-   **Eased Flying**: `1500ms` - `2500ms` (smooth MapLibre viewport fly animations when focusing on search results).

## Easing Easing Functions

-   Use custom cubic-bezier properties where possible for smooth acceleration/deceleration:
    `cubic-bezier(0.4, 0, 0.2, 1)` (standard default ease-in-out).

## Dynamic Elements

-   **Pulse Nodes**: Active stations gently pulse with `animate-pulse` status glows.
-   **Loading state**: Use slate skeletons (`animate-pulse` block layout overlays) instead of empty white screens.
