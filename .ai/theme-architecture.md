# Theme Architecture Guide

## Overview

The 10xCards application uses a **dual-attribute theme system** based on Tailwind CSS v4 and best practices from Astro.

### Key Concepts

- **`data-theme`**: Defines the color palette/style (e.g., `"default"`, `"forest"`, `"dim"`)
- **`data-mode`**: Defines the brightness mode (`"light"` or `"dark"`)
- **`dark:` variant**: Automatically works with `[data-mode="dark"]` thanks to `@custom-variant`

## Architecture

### How It Works

1. **Inline Script (Layout.astro)**
   - Runs **before first paint** to prevent FOUC (flash of unstyled content)
   - Reads `theme` and `mode` from localStorage
   - Sets `data-theme` and `data-mode` attributes on `<html>`
   - Listens to system preference changes (when mode is `"system"`)

2. **CSS Structure (global.css)**
   - All colors are defined as CSS custom properties (variables)
   - `@custom-variant dark` maps Tailwind's `dark:` prefix to `[data-mode="dark"]`
   - Multiple themes can coexist: `:root[data-theme="X"][data-mode="Y"]`

3. **Mode Toggle (ModeToggle.tsx)**
   - React component that lets users switch between `"light"`, `"dark"`, or `"system"`
   - Persists preference to localStorage
   - Updates `data-mode` attribute

4. **shadcn/ui Integration**
   - All shadcn/ui components use `dark:` variants
   - No changes needed—they work automatically with the new `@custom-variant`
   - Example: `dark:bg-input/30` → applies when `[data-mode="dark"]`

---

## Current State

### Default Theme Structure

```css
:root[data-theme="default"] {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... 20+ more variables ... */
}

:root[data-theme="default"][data-mode="dark"] {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... overrides for dark mode ... */
}
```

### localStorage Keys

```javascript
localStorage.getItem("theme"); // "default", "forest", etc.
localStorage.getItem("mode"); // "light", "dark", or "system"
```

---

## Adding a New Theme

### Step 1: Define CSS Variables

Add to `src/styles/global.css`:

```css
/* Light mode variant */
:root[data-theme="forest"] {
  --radius: 0.625rem;
  --background: oklch(0.9529 0.0146 102.4597);
  --foreground: oklch(0.4063 0.0255 40.3627);
  --card: oklch(0.9529 0.0146 102.4597);
  --card-foreground: oklch(0.4063 0.0255 40.3627);
  /* ... repeat all ~25 variables ... */
}

/* Dark mode variant */
:root[data-theme="forest"][data-mode="dark"] {
  --background: oklch(0.2721 0.0141 48.1783);
  --foreground: oklch(0.9529 0.0146 102.4597);
  /* ... override for dark mode ... */
}
```

### Step 2: Update ModeToggle.tsx (Optional)

If you want users to select themes, extend the toggle:

```tsx
type Mode = "light" | "dark" | "system";
type Theme = "default" | "forest" | "dim";

// Add theme state and switcher...
```

Or create a separate `ThemeSelector` component.

### Step 3: Test

1. Open DevTools → Elements
2. Check that `data-theme="forest"` and `data-mode="dark"` attributes are set
3. Verify colors update correctly
4. Check localStorage has keys `theme` and `mode`

---

## Tailwind Color Tokens

All shadcn/ui colors map to CSS variables:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-destructive: var(--destructive);
  /* ... etc ... */
}
```

This means any Tailwind class (e.g., `bg-background`, `text-foreground`) automatically inherits from your theme's CSS variables.

---

## Best Practices

1. **Use OKLCH for colors** — Better perceptual uniformity across light/dark
2. **Always define pairs** — Light and dark variants of each theme
3. **Test with system preference** — Verify "system" mode responds to OS setting
4. **Maintain contrast ratios** — Ensure WCAG AA/AAA compliance
5. **Keep variable names consistent** — Use the same set across all themes

---

## Files Modified

- `src/styles/global.css` — Theme definitions + `@custom-variant`
- `src/layouts/Layout.astro` — Inline script + attribute setup
- `src/components/ModeToggle.tsx` — Mode switcher logic
- `src/components/ModeToggle.tsx` — (Updated type hints)

---

## FAQ

**Q: Can I have more than 2 modes per theme?**  
A: The current system supports `light` and `dark`. For additional modes (e.g., "high-contrast"), extend `data-mode` to accept those values.

**Q: Do I need to update shadcn/ui components?**  
A: No. The `dark:` prefix in components works automatically thanks to `@custom-variant`.

**Q: What about per-component theme overrides?**  
A: Use `[data-theme="X"]` selectors in component styles to scope colors to specific themes.

**Q: How do I generate OKLCH color palettes?**  
A: Use tools like [Huetone](https://huetone.ardov.me/) or [Peecher](https://peecher.dev/).

---

## Example: Adding "Dim" Theme

```css
:root[data-theme="dim"] {
  --background: oklch(0.98 0.002 70);
  --foreground: oklch(0.3 0.008 70);
  --primary: oklch(0.5 0.1 260);
  /* ... */
}

:root[data-theme="dim"][data-mode="dark"] {
  --background: oklch(0.2 0.002 70);
  --foreground: oklch(0.95 0.001 70);
  --primary: oklch(0.65 0.12 260);
  /* ... */
}
```

That's it! No other files need changes.

---

## 🎨 Color Token Usage Patterns (CRITICAL FOR COMPONENTS)

### The Principle: Use Semantic Tokens, Never Hardcoded Colors

**Why?** When you use semantic tokens (e.g., `bg-background`), the component automatically adapts to theme changes. Hardcoded colors (e.g., `bg-slate-200`) are "frozen" and don't respond to theme changes.

```tsx
// ✅ CORRECT - Theme-aware
<div className="bg-background text-foreground border border-border">

// ❌ WRONG - Theme-blind
<div className="bg-slate-200 text-slate-900 border border-slate-300">
```

---

### Status Tokens (Success/Info/Warning)

**New semantic tokens for state-based feedback:**

- **`success`** — Positive state (form validation passed, operation completed)
- **`info`** — Informational state (loading, general info)
- **`warning`** — Cautionary state (warnings, important notices)

Each has 4 variants:

- `text-success` / `border-success` — Bold state
- `bg-success-soft` / `text-success-soft-foreground` — Soft alert background
- `text-info`, `border-info`, `bg-info-soft`, etc.
- `text-warning`, `border-warning`, `bg-warning-soft`, etc.

**Usage:**

```tsx
// Success validation
<div className="text-success flex items-center gap-1">
  <CheckCircle2 /> Pole poprawne
</div>

// Info alert
<Alert className="border-info bg-info-soft">
  <AlertTitle className="text-info-soft-foreground">Ładowanie...</AlertTitle>
</Alert>

// Warning alert
<Alert className="border-warning bg-warning-soft">
  <AlertTitle className="text-warning-soft-foreground">Uwaga</AlertTitle>
</Alert>
```

---

### Color Token Hierarchy

Every shadcn/ui color token serves a specific purpose. Use the right token for the right situation:

#### **Layer 1: Structural (Background & Container)**

```tsx
// Main page/section background
<div className="bg-background text-foreground">Content</div>

// Cards, modals, containers
<Card className="bg-card text-card-foreground">
  <CardContent>Info here</CardContent>
</Card>

// Dropdown/popover backgrounds
<Popover className="bg-popover text-popover-foreground">
```

#### **Layer 2: Content (Secondary, Disabled, Borders)**

```tsx
// Secondary text (hints, disabled state, metadata)
<span className="text-muted-foreground">Disabled or secondary info</span>

// All borders
<div className="border border-border">

// Form inputs background
<Input className="bg-input border border-border" />

// Form field backgrounds
<textarea className="bg-input" />
```

#### **Layer 3: Actions (CTA, Dangerous, Highlights)**

```tsx
// PRIMARY - Main call-to-action button
<Button className="bg-primary text-primary-foreground">Save</Button>

// SECONDARY - Alternative action
<Button className="bg-secondary text-secondary-foreground">Cancel</Button>

// ACCENT - Highlights, hover states, indicators
<div className="hover:bg-accent hover:text-accent-foreground">Hover me</div>

// DESTRUCTIVE - Delete, remove, dangerous actions
<Button className="bg-destructive text-destructive-foreground">Delete</Button>
```

---

### Complete Example: Refactored Component

```tsx
// BEFORE (❌ Hardcoded, theme-blind)
export const Card = ({ isAccepted, isDirty, onDelete }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="text-slate-900 dark:text-slate-50">Title</div>
      <div className="text-slate-600 dark:text-slate-400">Description</div>

      <button className="hover:bg-green-100 dark:hover:bg-green-950">Accept</button>
      <button className="hover:bg-blue-100 dark:hover:bg-blue-950">Edit</button>
      <button className="text-red-600 dark:text-red-400 hover:bg-red-100">Delete</button>
    </div>
  );
};

// AFTER (✅ Theme-aware semantic tokens)
export const Card = ({ isAccepted, isDirty, onDelete }) => {
  return (
    <div className="bg-card border border-border">
      <div className="text-card-foreground font-medium">Title</div>
      <div className="text-muted-foreground">Description</div>

      <button className="hover:bg-accent hover:text-accent-foreground">Accept</button>
      <button className="hover:bg-secondary hover:text-secondary-foreground">Edit</button>
      <button className="text-destructive hover:bg-destructive/10">Delete</button>
    </div>
  );
};
```

---

### Token Reference Table

| Token                                            | Purpose                     | Usage                                 |
| ------------------------------------------------ | --------------------------- | ------------------------------------- |
| `bg-background` / `text-foreground`              | Page/main background + text | Page containers, body text            |
| `bg-card` / `text-card-foreground`               | Card containers             | Cards, boxes, panels                  |
| `text-muted-foreground`                          | Secondary text              | Labels, hints, disabled state         |
| `border-border`                                  | All borders                 | Dividers, card borders, input borders |
| `bg-input` / `border-input`                      | Form fields                 | Input, textarea, select               |
| `bg-primary` / `text-primary-foreground`         | Main action button          | "Save", "Submit", CTA buttons         |
| `bg-secondary` / `text-secondary-foreground`     | Alternative action          | "Cancel", "Skip", secondary buttons   |
| `bg-accent` / `text-accent-foreground`           | Highlights, hover           | Hover states, indicators, badges      |
| `bg-destructive` / `text-destructive-foreground` | Dangerous action            | "Delete", "Remove" buttons            |
| `bg-ring`                                        | Focus state outline         | Form focus, keyboard navigation       |
| `border-success` / `bg-success-soft`             | Success state               | Valid form fields, completion alerts  |
| `text-success` / `text-success-soft-foreground`  | Success text                | Checkmarks, success messages          |
| `border-info` / `bg-info-soft`                   | Informational state         | Loading alerts, info messages         |
| `text-info` / `text-info-soft-foreground`        | Info text                   | Info icons, status indicators         |
| `border-warning` / `bg-warning-soft`             | Warning state               | Caution alerts, important notices     |
| `text-warning` / `text-warning-soft-foreground`  | Warning text                | Warning icons, caution messages       |

---

### Anti-Patterns (AVOID These)

```tsx
// ❌ Mixing semantic tokens with hardcoded colors
<div className="bg-background text-red-500">
  {/* Background responds to theme, but text is always red */}
</div>

// ❌ Using Tailwind's arbitrary color names for UI
<div className="bg-slate-200 dark:bg-slate-800">
  {/* This is OKAY for data visualization charts, BAD for UI */}
</div>

// ❌ Duplicating dark: variants when tokens handle it
<div className="bg-primary dark:bg-blue-700">
  {/* Wrong! bg-primary already has dark mode colors */}
</div>

// ❌ Per-component color definitions
// In ComponentA.tsx
const colors = {
  bg: "bg-blue-100 dark:bg-blue-900",
  text: "text-blue-900 dark:text-blue-100",
};
// Problem: Every component reinvents colors, inconsistency!
```

---

### Pro Patterns (DO THIS)

```tsx
// ✅ Semantic consistency
const StatCard = () => (
  <div className="bg-card text-card-foreground border border-border p-4">
    <h3 className="font-semibold">Stat</h3>
    <p className="text-muted-foreground">123 items</p>
  </div>
);

// ✅ Proper action styling
const ActionButtons = () => (
  <div className="flex gap-2">
    <button className="bg-primary text-primary-foreground">Primary</button>
    <button className="bg-secondary text-secondary-foreground">Secondary</button>
    <button className="text-destructive hover:bg-destructive/10">Delete</button>
  </div>
);

// ✅ Hover/Focus using accent
const InteractiveItem = () => (
  <div className="hover:bg-accent hover:text-accent-foreground transition-colors">Hover me</div>
);

// ✅ Form fields
const FormField = () => (
  <input className="bg-input border border-border text-foreground focus:ring-2 focus:ring-ring" />
);

// ✅ Status alerts (Success/Info/Warning)
const StatusAlerts = () => (
  <div className="space-y-3">
    {/* Success - form validation, completion */}
    <Alert className="border-success bg-success-soft">
      <CheckCircle2 className="h-4 w-4 text-success-soft-foreground" />
      <AlertTitle className="text-success-soft-foreground">Zapis udany</AlertTitle>
      <AlertDescription className="text-success-soft-foreground">Dane zostały pomyślnie zapisane.</AlertDescription>
    </Alert>

    {/* Info - loading, informational messages */}
    <Alert className="border-info bg-info-soft">
      <Loader2 className="h-4 w-4 animate-spin text-info-soft-foreground" />
      <AlertTitle className="text-info-soft-foreground">Przetwarzanie</AlertTitle>
      <AlertDescription className="text-info-soft-foreground">Proszę czekać, trwa przetwarzanie...</AlertDescription>
    </Alert>

    {/* Warning - caution, important notices */}
    <Alert className="border-warning bg-warning-soft">
      <AlertTriangle className="h-4 w-4 text-warning-soft-foreground" />
      <AlertTitle className="text-warning-soft-foreground">Uwaga</AlertTitle>
      <AlertDescription className="text-warning-soft-foreground">Ta akcja nie może być cofnięta.</AlertDescription>
    </Alert>

    {/* Error - destructive, errors */}
    <Alert className="border-destructive bg-destructive/10">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-destructive">Błąd</AlertTitle>
      <AlertDescription className="text-destructive/80">Coś poszło nie tak.</AlertDescription>
    </Alert>
  </div>
);

// ✅ Form validation feedback
const FormValidation = ({ hasError, isValid }) => (
  <div className="space-y-2">
    <input className="bg-input border border-border w-full px-3 py-2" />
    {isValid && (
      <p className="text-sm text-success flex items-center gap-1">
        <CheckCircle2 className="h-4 w-4" /> Poprawne
      </p>
    )}
    {hasError && (
      <p className="text-sm text-destructive flex items-center gap-1">
        <AlertCircle className="h-4 w-4" /> Błąd walidacji
      </p>
    )}
  </div>
);
```

---

### When to Use Tailwind's Default Colors

You can use Tailwind colors in specific cases:

1. **Data Visualization** (charts, graphs)

   ```tsx
   <div className="bg-chart-1">Chart bar</div>
   ```

2. **Temporary/Debug Styling** (will be refactored)

   ```tsx
   <div className="bg-yellow-100">TODO: Style this</div>
   ```

3. **Outside the UI system** (brand illustrations, backgrounds)
   - Don't use `bg-slate-200` for UI buttons

---

## Refactoring Checklist

When converting a component to use semantic tokens:

- [ ] Replace `bg-slate-*` → `bg-background` or `bg-card`
- [ ] Replace `text-slate-*` → `text-foreground` or `text-muted-foreground`
- [ ] Replace `border-slate-*` → `border-border`
- [ ] Replace hover colors with `hover:bg-accent` or `hover:bg-secondary`
- [ ] Replace `dark:` variants (they're now automatic!)
- [ ] Test with theme toggle in DevTools
- [ ] Verify component looks correct in light + dark modes

---

## Adding a New Theme (Complete Workflow)

When you want to add a new theme (e.g., "tangerine", "forest"), follow these steps:

### Step 1: Define CSS Variables in `global.css`

Add light and dark mode variants:

```css
/* Light mode */
:root[data-theme="tangerine"],
:root:not([data-theme="default"])[data-theme="tangerine"] {
  --background: oklch(0.98 0.01 50); /* warm light bg */
  --foreground: oklch(0.2 0.08 40); /* warm dark text */
  --primary: oklch(0.65 0.18 40); /* tangerine/orange */
  --primary-foreground: oklch(1 0 0);
  --card: oklch(0.96 0.015 55);
  /* ... define all 25+ variables ... */
}

/* Dark mode */
:root[data-theme="tangerine"][data-mode="dark"],
:root:not([data-theme="default"])[data-theme="tangerine"][data-mode="dark"] {
  --background: oklch(0.15 0.01 50);
  --foreground: oklch(0.95 0.008 60);
  --primary: oklch(0.7 0.2 40);
  /* ... override for dark mode ... */
}
```

### Step 2: Update `ThemeSelector.tsx`

Add your theme to the `AVAILABLE_THEMES` array:

```tsx
type Theme = "default" | "tangerine" | "forest"; // Add "forest" here

const AVAILABLE_THEMES: Array<{ id: Theme; label: string }> = [
  { id: "default", label: "Default" },
  { id: "tangerine", label: "Tangerine" }, // Add this line
  { id: "forest", label: "Forest" }, // And this
];
```

### Step 3: Test

1. Refresh the page
2. Click the palette icon (Theme Selector)
3. Select your new theme
4. Verify colors change correctly
5. Switch light/dark mode — should work independently
6. Check DevTools: `data-theme="tangerine"` should be set

---

## Architecture Summary: Theme vs Mode

### Understanding the Data Flow

```
User clicks Theme Selector (Palette icon)
         ↓
ThemeSelector.tsx captures click
         ↓
setThemeState("tangerine")
         ↓
useEffect triggers:
  - localStorage.setItem("theme", "tangerine")
  - document.documentElement.setAttribute("data-theme", "tangerine")
         ↓
CSS matches :root[data-theme="tangerine"]
         ↓
All --color-* variables update
         ↓
Tailwind classes (bg-primary, text-foreground, etc.) see new values
         ↓
Browser repaints components with new colors
         ↓
Page refreshes: Layout.astro script reads localStorage["theme"] = "tangerine"
         ↓
Attributes are set BEFORE first paint (no FOUC)
```

### Key Differences

| Aspect               | Mode (Light/Dark)                  | Theme (Style)                          |
| -------------------- | ---------------------------------- | -------------------------------------- |
| **Component**        | ModeToggle                         | ThemeSelector                          |
| **Attribute**        | `data-mode`                        | `data-theme`                           |
| **localStorage key** | `mode`                             | `theme`                                |
| **Possible values**  | light, dark, system                | default, tangerine, forest, etc.       |
| **Affects**          | Brightness of current theme        | Entire color palette                   |
| **Independent?**     | Yes                                | Yes                                    |
| **Can combine?**     | Yes (default light + default dark) | Yes (tangerine light + tangerine dark) |

### Real Combinations

```
data-theme="default" + data-mode="light"   → Default Light
data-theme="default" + data-mode="dark"    → Default Dark
data-theme="tangerine" + data-mode="light" → Tangerine Light
data-theme="tangerine" + data-mode="dark"  → Tangerine Dark
```

---

## Files for Theme System

### Layout Files

- `src/layouts/Layout.astro` — Inline script that initializes theme + mode from localStorage

### Component Files

- `src/components/ModeToggle.tsx` — Light/Dark/System selector (brightness)
- `src/components/ThemeSelector.tsx` — Theme selector (color palette)

### Style Files

- `src/styles/global.css` — All CSS variables and `@theme inline` definitions

### Documentation

- `.ai/theme-architecture.md` — This file (guides and patterns)
