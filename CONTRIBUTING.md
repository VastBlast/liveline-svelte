# Contributing to liveline-svelte

Thanks for your interest in contributing!

`liveline-svelte` is an independent Svelte 5 chart library maintained by VastBlast. It began as a fork of Benji Taylor's Liveline and now has its own API, priorities, and release cycle. Contributions are evaluated for this library's Svelte use cases; matching the original project 1:1 is not a requirement.

## Local Development

Keep library code in `src/lib/` and demo-only code in `src/routes/`. See the [development guide](README.md#development) for setup, validation commands, and Cloudflare deployment settings.

## Before You Start

Open an issue first, especially for larger changes. It helps talk through the approach and avoids wasted effort.

## What's Welcome

- **Bug fixes** — Always welcome.
- **Performance improvements** — This is a 60fps canvas library. Faster is always better.
- **Small, focused features** — Things that solve common charting problems without adding complexity.
- **Visual and animation improvements** — Welcome, but have a high bar. Open an issue to discuss first.

## What's Harder to Merge

- **New props and options** — The API surface is intentionally small. New props need to earn their place.
- **Redundant configuration** — Prefer focused options that solve real use cases and leave application-specific decisions to consumers.
- **Non-canvas rendering** — Liveline is canvas-only by design.

## Code Style

- Match existing patterns
- Keep PRs focused (one change per PR)
- No external runtime dependencies beyond Svelte

## Questions?

Open an issue. Happy to talk through ideas.
