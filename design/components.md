# Design System: Components

Core UI elements are styled to maintain a dark "mission control" diagnostics terminal.

## Panel Containers

*   **Sidebar Panel**: Fixed-width navigation dashboard. Has border separators and backdrop blur filters.
*   **Station Inspector Drawer**: Slid-out panel displaying tabbed details of the target digital twin.
*   **Diagnostics HUD**: Simple fixed container overlay placed in the top-right corner, toggled on demand.

## Diagnostic Buttons

Buttons use high-contrast cyan or blue highlights for primary actions and zinc colors for secondary toggles:
-   `bg-zinc-800/40 hover:bg-zinc-700/50 text-zinc-100 border border-zinc-700/50` — Standard dashboard button.
-   `bg-sky-600/80 hover:bg-sky-500 text-white` — Primary submit/search action.
