# 📱 RESPONSIVENESS_GUIDE.md
(Custom CSS · Next.js · Mobile-First)

## 1. Purpose
This document defines strict, unambiguous rules for converting an existing **Desktop-first Next.js UI** into a **fully responsive, Mobile-First application** using **Custom CSS only**.

This file is the **single source of truth** for all responsiveness-related changes, for both humans and AI tools.

---

## 2. Project Context
- Framework: Next.js
- Styling: Custom CSS / CSS Modules
- UI System: Google Antigravity
- Scope: Responsiveness, layout, spacing, sizing ONLY

---

## 3. Hard Constraints (Non-Negotiable)
- ❌ Do NOT redesign the UI
- ❌ Do NOT change colors, fonts, branding, or backgrounds
- ❌ Do NOT change content or application logic
- ❌ Do NOT use Tailwind or utility frameworks
- ❌ Do NOT use `max-width` media queries (Desktop-first)

✅ Only layout, spacing, scaling, and responsive behavior may be changed.

---

## 4. Core Philosophy: Mobile-First
- All **base CSS applies to Mobile by default**
- Enhancements happen using `min-width` media queries
- Layout complexity increases progressively
- Avoid device-specific hacks
- Prefer flexible systems over fixed values

---

## 5. Breakpoints (Strictly Enforced)

| Device | Media Query | Layout Behavior |
|------|------------|----------------|
| **Mobile** | Default (< 768px) | Single column, stacked layout, 100% width, hamburger menu |
| **Tablet** | `@media (min-width: 768px)` | 2-column grids, increased padding |
| **Desktop** | `@media (min-width: 1024px)` | Full layout, visible nav/sidebars |
| **Large Screens** | `@media (min-width: 1440px)` | Centered layout with max-width |

⚠️ Do NOT introduce additional breakpoints unless required.

---

## 6. Layout System Rules

### Containers
- Use `max-width` only at large screen sizes
- Center layouts using `margin-inline: auto`
- Always include safe horizontal padding

Example:
```css
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 1440px) {
  .container {
    max-width: 1200px;
    margin-inline: auto;
  }
}
7. CSS Module Structure (MANDATORY)
Every .module.css file must follow this order:

/* 1. Mobile Styles (Base) */
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 1rem;
}

/* 2. Tablet Adjustments */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* 3. Desktop Layout */
@media (min-width: 1024px) {
  .container {
    flex-direction: row;
  }
}
Do NOT mix breakpoints or reorder sections.

8. Grid & Flex Rules
Page layout → CSS Grid

Components → Flexbox

Mobile grids must collapse to 1fr

Desktop grids may expand

Example:

.grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
9. Spacing & Units
Use:

rem for spacing and fonts

%, fr, auto for layout

clamp() for scalable typography

Avoid:

Fixed heights

Pixel-locked layouts

Magic numbers

10. Typography Rules
Maintain original hierarchy

Text must never overflow or clip

Line-height must scale naturally

Example:

h1 {
  font-size: clamp(1.75rem, 4vw, 3rem);
}
11. Images & Media
Must never overflow viewport

Must scale with container

Must maintain aspect ratio

Rules:

img {
  max-width: 100%;
  height: auto;
}
No fixed heights on mobile.

12. Component Patterns
Navigation
Mobile

Hide links

Show hamburger icon

Toggle menu using boolean state (isOpen)

Drawer or full-screen menu allowed

Desktop

Hide hamburger

Show horizontal navigation

Cards & Lists
Stack vertically on mobile

Grid layout on tablet+

Consistent spacing across breakpoints

Buttons & Links
Minimum touch height: 44px

Adequate spacing between actions

No hover-only interactions on mobile

13. Forms
Inputs must be full-width on mobile

Labels always visible

Error states must not break layout

14. Safety Rules
❌ No horizontal scrolling

Apply overflow-x: hidden to root layout

❌ No branding changes

❌ No color or font modifications

15. Performance
Avoid loading large images on mobile

Lazy-load media when possible

Prevent layout shifts

16. Accessibility
Maintain contrast ratios

Keyboard navigation required

Touch-friendly spacing

17. Testing Checklist
Responsiveness is valid only if:

 No horizontal scroll

 Layout stable on resize

 Text readable on all devices

 Buttons usable by thumb

 Navigation works on mobile & desktop

18. Non-Goals
No redesign

No animation changes

No content rewriting

No logic refactoring

19. Completion Criteria
Responsiveness is complete when:

All breakpoints pass testing

UI matches original design intent

No visual regressions exist


---

## ✅ FINAL AI PROMPT (USE WITH THIS FILE)

```text
I have attached a file named RESPONSIVENESS_GUIDE.md.

This file is the single source of truth.

Your task:
- Refactor the existing Next.js project to be fully responsive
- Use Custom CSS / CSS Modules only
- Follow a strict Mobile-First approach

Hard rules:
- Do NOT redesign UI
- Do NOT change colors, fonts, branding, or backgrounds
- Do NOT change content or logic
- Do NOT use Tailwind
- Do NOT use max-width media queries

Requirements:
- Mobile styles first (default)
- Use min-width media queries only
- Follow the exact CSS module structure defined in the guide
- Fix overflow, clipping, and layout breaks
- Ensure no horizontal scrolling

Output rules:
- Provide only necessary CSS or layout changes
- No explanations unless required
- No unrelated suggestions

Treat RESPONSIVENESS_GUIDE.md as mandatory and final.