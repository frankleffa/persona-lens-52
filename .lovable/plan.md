

## Plan: Replace theme toggle with sky-toggle component

The current toggle is a simple button with Sun/Moon icons. We'll replace it with the animated sky-toggle component, but **without `styled-components`** — we'll convert the CSS to a plain CSS file to avoid adding a heavy dependency.

### 1. Create `src/components/ui/sky-toggle.tsx`

Convert the styled-components CSS into a separate CSS file and rewrite the component as plain React:
- Import a `sky-toggle.css` file instead of using `styled-components`
- Accept an `checked` prop (dark mode = checked) and `onChange` callback
- The checkbox `checked` state maps to: checked = dark mode (night sky), unchecked = light mode (day sky)
- Keep all the HTML structure (checkbox, circle-container, sun-moon, clouds, stars SVG)

### 2. Create `src/components/ui/sky-toggle.css`

Move all the styled-components CSS into a plain CSS file. No changes to the actual styles — just extract them verbatim from the `StyledWrapper`.

### 3. Update `src/components/AppSidebar.tsx`

Replace the current button toggle (lines 146-151) with:
```tsx
<SkyToggle checked={!isLight} onChange={() => setIsLight(!isLight)} />
```
- `checked={!isLight}` because checked = dark/night mode
- Remove the Sun/Moon icon imports if no longer used elsewhere

**No `styled-components` dependency needed.** No logic changes. No other files affected.

