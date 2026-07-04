---
name: Hive Design System
colors:
  surface: '#FFFFFF'
  surface-dim: '#FFFDF5'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#FFFDF5'
  surface-container: '#FFF3CC'
  surface-container-high: '#F0E4C8'
  surface-container-highest: '#FFF3CC'
  on-surface: '#2C1E00'
  on-surface-variant: '#8C7A5A'
  inverse-surface: '#1A1200'
  inverse-on-surface: '#FFFDF5'
  outline: '#F0E4C8'
  outline-variant: '#FFF3CC'
  surface-tint: '#d4af37'
  primary: '#d4af37'
  on-primary: '#1A1200'
  primary-container: '#FFF3CC'
  on-primary-container: '#E8890C'
  inverse-primary: '#E8890C'
  secondary: '#E8890C'
  on-secondary: '#FFFFFF'
  secondary-container: '#FFF3CC'
  on-secondary-container: '#2C1E00'
  tertiary: '#8C7A5A'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#FFFDF5'
  on-tertiary-container: '#2C1E00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#FFFDF5'
  on-background: '#2C1E00'
  surface-variant: '#FFFDF5'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 20px
  gutter: 16px
  section-gap: 48px
---

## Brand & Style

The Hive design system is structured for an **editorial-first hyperlocal marketplace** connecting customers with local boutique fashion stores. The brand style is **Warm Minimalist**, prioritizing premium fashion photography, generous whitespace, and warm, tactile tones over cold, clinical UI layouts.

The design invokes a sense of localized, high-end craftsmanship, blending the rich heritage of boutique fashion with the modern efficiency of same-day delivery.

## Colors

The color palette is built on warm, organic earth tones and luxurious accents:
- **Hive Gold (`#d4af37`):** The primary brand accent, used selectively for active navigation states, call-to-action buttons, stars, and promotional highlights.
- **Hive Amber (`#E8890C`):** A deep, high-visibility orange used for progress states, warning badges, and notification alerts.
- **Hive Dark (`#1A1200`):** A deep charcoal black with a warm brown undertone, used for high-contrast headers, typography, and dark mode layouts.
- **Hive Cream (`#FFFDF5`):** The brand’s default canvas color—a light, warm cream that replaces stark whites for secondary areas.
- **Hive Border (`#F0E4C8`):** A soft, low-contrast border color for cards, dividers, and input borders.
- **Hive Comb (`#FFF3CC`):** A light honey-yellow background tint for chips and selected state backgrounds.

## Typography

Hive exclusively utilizes **Manrope** as its primary typeface for both serif and sans-serif contexts. This provides a unified, contemporary reading experience.
- **Headers:** Set with extra-bold weights and tight letter spacing to create high-impact editorial headings.
- **Body & Labels:** Use medium/regular weights with standard letter-spacing for high legibility across product specifications, order updates, and merchant interfaces.

## Layout & Spacing

The layout is built on a 4px fluid grid system.
- **Mobile Viewports:** Uses a fluid 4-column layout with 20px margins and 16px gutters to adapt to diverse screen ratios.
- **Desktop Viewports:** Centers content within a 12-column layout with a maximum container width of 1280px.
- **Vertical Rythm:** Relies on spacious section gaps (48px+) to allow visual sections and photography to stand out.

## Elevation & Depth

Depth is established primarily using **Tonal Layering** and clean border separations rather than dark drop-shadows.
- **Base (Level 0):** Hive Cream (`#FFFDF5`) or White (`#FFFFFF`).
- **Containers (Level 1):** Outlined with soft borders (`#F0E4C8`) and subtle background shifts.
- **Modals & Overlays (Level 2):** Uses backdrop blurs (backdrop-blur-md) with low-opacity white backdrops to feel integrated yet elevated.

## Shapes

Shapes utilize organic, rounded geometry to mirror the soft texture of boutique fabrics:
- **UI Elements:** Buttons and input fields use a standard `0.5rem` (8px) radius.
- **Product Cards & Images:** Large display images use a `1rem` (16px) or `1.5rem` (24px) radius.
- **Interactive Badges:** Wishlist buttons, close icons, and notification counters use a circular (`full`) radius.

## Components

### Bottom Navigation
- **Customer Mobile Nav:** A persistent white bottom bar displaying Home, Shop, Wishlist, Orders, and Account. Uses thin linear icons with yellow-gold highlight accents.
- **Boutique Mobile Nav:** Displaying Dashboard, Products, Inventory, Orders, and Profile. Uses outline icons that transition to amber-colored stroke outlines when active.

### Buttons
- **Primary Action:** Solid Hive Gold background, dark text, rounded corners, uppercase labels.
- **Secondary Action:** Transparent background with a `1.5px` border in Hive Dark or Hive Border.
