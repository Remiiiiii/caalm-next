# Landing / marketing — page overrides

> Overrides [`MASTER.md`](../MASTER.md) for marketing surfaces (`Hero`, `Features`, `Pricing`, `Header`, `AuthForm`).

## CTA hierarchy (Enterprise Gateway)

- **Primary:** Sign In / Get Started → `/sign-in` using `.primary-btn`
- **Secondary:** Contact Sales → `#contact` using outline button
- Header and Hero must both expose this pair on desktop

## Glass on marketing

- Feature cards: `glass-card` + `glass-card-cap`
- Pricing cards: `glass-card` (no `scale-*` or translate-Y hover that shifts layout)
- Keep Poppins and brand gradient text; do not adopt Fira fonts

## Density

- Hero: one headline, one short supporting line, one CTA group, one visual
- Avoid stacking equal-weight CTAs; primary action should read first
