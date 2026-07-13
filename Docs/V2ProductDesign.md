# Market Briefing V2 — Product Design

This document supersedes the original MVP interaction design while retaining its browser-only deployment model.

## Design principle

The product uses progressive disclosure:

1. **Daily** exposes profiles, depth, and one primary generation action.
2. **Customize** exposes common one-run changes.
3. **Expert** exposes raw prompts, provider tool versions, backups, and destructive controls.

Functionality is not removed to simplify the interface; it is placed at the level where users need it.

## Information architecture

- **Briefing:** generation workspace and latest result
- **History:** search, lineage, and meaningful comparison
- **Settings:** profiles, connections, appearance, data/privacy, and expert controls
- **Help:** contextual dialog rather than a permanent navigation destination

## Briefing contract

Each briefing contains an executive pulse, stance, structured findings, catalysts, and watchlist items. Findings carry a stable ID, section, claim type, confidence, horizon, importance, decision implication, and retrieved source URLs.

If structured parsing fails, the application preserves the provider response in a clearly labeled low-confidence fallback rather than discarding it.

## Evidence behavior

The application extracts Anthropic web-search citations, Gemini grounding metadata, and OpenAI Responses API URL-citation annotations. A finding without a matched retrieved source displays an explicit unsourced state. The UI never invents a source label.

## Provider security boundaries

Anthropic, Gemini, and OpenAI all use the device-local browser connection model: the user's API key is stored in this browser's local storage and sent directly to the provider over HTTPS. An earlier design routed OpenAI through a same-origin Netlify relay; that relay was deliberately dropped in favor of the simpler direct model. The accepted tradeoff is that a browser-managed key is readable by any script that runs in the page, so the application relies on a strict Content-Security-Policy, consistent HTML escaping of provider and web-source content, and exclusion of keys from normal exports. Users should prefer scoped, revocable keys with spending limits.

## Deep-dive lineage

A deep dive is generated from a finding or section, saved as a child of the parent briefing, and shown distinctly in History. This prevents follow-up analysis from becoming an unrelated history entry.

## Comparison

Briefings are compared using stable finding IDs, with a text-similarity fallback for provider variation. Results are grouped into New, Changed, No longer active, and Unchanged.

## Data safety

Normal exports exclude API credentials and relay tokens. Sensitive connection backups require a separate action and explicit confirmation. Imports use a versioned format and reject incompatible or incomplete files.

## Accessibility and responsive behavior

The interface uses semantic navigation, native buttons and dialogs, associated labels, keyboard focus treatment, live status announcements, reduced-motion support, high-contrast actions, mobile-sized controls, and a compact bottom navigation on narrow screens.
