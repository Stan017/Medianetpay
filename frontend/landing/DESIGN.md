---
name: MedianetPay Pulse
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#424656'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#3b6188'
  on-secondary: '#ffffff'
  secondary-container: '#add2ff'
  on-secondary-container: '#345a81'
  tertiary: '#814e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a26400'
  on-tertiary-container: '#fff7f2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#d0e4ff'
  secondary-fixed-dim: '#a4caf7'
  on-secondary-fixed: '#001d35'
  on-secondary-fixed-variant: '#21496f'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#ffb866'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  medianet-blue: '#0066FF'
  electric-gradient-start: '#00C2FF'
  electric-gradient-end: '#0066FF'
  surface-glass: rgba(255, 255, 255, 0.7)
  deep-navy: '#003358'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1280px
  bento-gap: 16px
---

## Brand & Style
The brand personality is secure, frictionless, and technologically superior. It targets a market in Ecuador that demands global-standard financial tools with local reliability. The visual language fuses **Minimalism** and **Glassmorphism**, creating a "Premium Fintech" aesthetic.

The design system prioritizes clarity through generous whitespace and high-contrast typography, while injecting energy through vibrant gradients and translucent layers. The emotional response should be one of "effortless power"—a tool that feels as advanced as it is easy to use. Layouts follow a refined bento-grid structure, organizing complex data into digestible, beautiful modules.

## Colors
The palette is anchored by **Medianet Blue**, a vibrant, electric primary hue that signifies digital speed and innovation. This is supported by **Deep Navy** (from the original brand) for authoritative text and structural elements, and a **Vibrant Orange** used sparingly as a functional accent for alerts or high-priority calls to action.

The primary background is a crisp white, while deep blacks are used for "Dark Mode" surfaces or high-impact marketing sections. Gradients should be subtle, moving from a bright cyan-blue to the core Medianet Blue to simulate depth and light. Use translucent whites for glassmorphic surfaces to maintain a sense of lightness and layering.

## Typography
This design system utilizes **Inter** for its systematic, clean, and highly legible characteristics across all UI scales. For technical details and labels, **Geist** provides a precise, developer-friendly feel that aligns with the tech-forward narrative.

Headings must be set with tight tracking (negative letter-spacing) to achieve the Apple-inspired "compact" look. Large display type should be bold or extra-bold to create a strong hierarchy against the airy, minimalist layout. Line heights are generous for body text to ensure readability in data-heavy payment contexts.

## Layout & Spacing
The layout follows a **Fixed Grid** system for desktop (12 columns) and a **Fluid Grid** for mobile (4 columns). A "Bento Box" philosophy is applied to dashboards and feature highlights, using varied card sizes that snap to a consistent 16px or 24px gap.

Spacing follows a strict 8px base unit. Margins are intentionally wide on desktop to create a premium, editorial feel. Elements within cards should use nested padding (e.g., if a card has 32px padding, internal elements use 16px) to maintain visual rhythm.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Ambient Shadows**. Instead of traditional solid grey shadows, use low-opacity shadows tinted with the brand’s navy or blue to keep the UI feeling "clean."

1.  **Base Layer:** Solid white or very light grey (#F8FAFC).
2.  **Middling Layer (Bento Cards):** White background with a 1px "inner-glow" stroke (white at 40% opacity) and a soft, blurred drop shadow.
3.  **Floating Layer (Modals/Popovers):** Semi-transparent white with a `backdrop-filter: blur(20px)` and a subtle 1px border.
4.  **Interactive Depth:** Elements should appear to lift slightly on hover via a subtle increase in shadow spread and a scale-up of 1.02x.

## Shapes
The shape language is consistently **Rounded**. A 0.5rem (8px) radius is the standard for small components like inputs and buttons, while larger bento-grid cards and containers use 1rem (16px) or 1.5rem (24px) to feel friendly and modern. 

Icons should follow a 3D-rendered style with soft edges, or if 2D, use a medium stroke weight with rounded caps and corners.

## Components
- **Buttons:** Primary buttons use the Medianet Blue gradient with white text. They should have a slight "squish" animation on click. Secondary buttons use a glass-style background with a 1px border.
- **Bento Cards:** The core layout element. Features a subtle 1px border and 16px-24px padding. They can contain 3D icons, data visualizations, or large typography.
- **Inputs:** Clean, minimalist fields with 1px light grey borders that transition to Medianet Blue on focus. Use floating labels for a compact, modern look.
- **Chips/Badges:** Small, pill-shaped elements with low-saturation background tints and high-saturation text for status indicators (e.g., "Success" uses light green background with dark green text).
- **Payment Progress:** A slim, animated "pulse" line at the top of containers to indicate loading or transaction processing, utilizing the electric blue gradient.
- **Data Tables:** High-density but clear, using subtle row dividers and Geist for numerical data to ensure tabular alignment.