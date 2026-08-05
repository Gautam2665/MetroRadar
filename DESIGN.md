# Stitch Design Tokens & Layout Rules (DESIGN.md)

## 1. System Design Tokens

### Color Palette
- **Primary Background**: `#080C14` (Deep Space Dark)
- **Glass Panel Surface**: `#1c2028` / `#181c24` (`bg-[#1c2028]/90 border border-white/10 backdrop-blur-md`)
- **Card Fill**: `#0f131c` / `#181c24`
- **Primary Accent / Cyber Cyan**: `#00e5ff` (`#00daf3`, `#c3f5ff`)
- **Status Accents**:
  - Success / Good Service: `#10B981` / `#4ade80` (Emerald Green)
  - Warning / Minor Delays: `#fec931` / `#F59E0B` (Amber Yellow)
  - Alert / Critical: `#EF4444` (Coral Red)
  - Line Badges: Red (`#EF4444`), Yellow (`#EAB308`), Violet (`#8B5CF6`), Blue (`#3B82F6`), Pink (`#EC4899`), Magenta (`#D946EF`), Airport Orange (`#F97316`), Cyan (`#00e5ff`)
- **Text Hierarchy**:
  - Primary Text: `#dfe2ee`
  - Secondary / Muted Text: `#bac9cc`
  - Dark Contrast Text (on Cyan/Yellow buttons): `#00363d` / `#000000`

### Typography & Icons
- **Font Family**: `Inter`, sans-serif
- **Icon Set**: Google `Material Symbols Outlined`

---

## 2. Layout Shell Contracts

- **Sidebar**: Fixed Desktop Sidebar (`w-[260px]`, `fixed left-0 top-0 bottom-0 z-30`)
- **Header Bar**: Sticky Top Header (`h-16`, `sticky top-0 z-40`, `bg-[#080C14]/90 backdrop-blur-md border-b border-white/10`)
- **Main Viewport**: Responsive Content Container (`md:ml-[260px]`, `flex-1 flex flex-col h-screen overflow-hidden`)
- **Bento Grid Panels**:
  - Map Canvas: `md:col-span-8` (Left Column)
  - Control / Inspector Panel: `md:col-span-4` (Right Column)
- **Drawers & Modals**: Floating overlay drawers (`absolute right-0 top-0 h-full w-96 z-50 bg-[#1c2028]/95 backdrop-blur-xl border-l border-white/10`)

---

## 3. Structural Split & Container Contract Workflow

To ensure zero "Design-to-Code Context Collapse" and eliminate CSS layout breakage:

### Step 1: Design System & Tokens (`DESIGN.md`)
- Enforce layout boundaries, grid columns, z-index stacking order, and Tailwind token rules.

### Step 2: Presentational Component Split (`src/components/ui/`)
- Paste or split Stitch export HTML/JSX into isolated presentational View components:
  - `SidebarView.tsx`
  - `DigitalTwinInspectorView.tsx`
  - `JourneyPlannerView.tsx`
  - `StationHeaderView.tsx`
- **Rule**: Lock CSS flex/grid layout context inside View files. Convert static text strings into strict TypeScript `Props` interfaces.

### Step 3: Container State & API Binding (`src/containers/`)
- Wrap Presentational Views inside Container hooks:
  - `SidebarContainer.tsx`
  - `DigitalTwinInspectorContainer.tsx`
  - `JourneyPlannerContainer.tsx`
- **Rule**: Containers handle NestJS API fetches (`http://localhost:3001`), state management, and pass typed props down to View components without touching or altering CSS classes.
