# Médiathèque — how to build with this library

A shared media library for a small private circle: members track films, séries, livres,
mangas & BD and jeux vidéo, and see what the people they follow did with the same works.

**All UI copy must be written in French.** The library ships French labels ("À voir",
"En cours", "Terminé", "Du neuf", "Possédé") and there is no i18n layer — mixing English
copy into a screen breaks it visually and semantically.

## Wrapping

Nine components are pure props-in/markup-out and need no context:
`Cover`, `EmptyState`, `ErrorNotice`, `IdentityDot`, `MediaMetadata`, `NewContentBadge`,
`ProgressBar`, `Screenshots`, `StatusBadge`.

Seven read React Query, the router, or the session and **throw or render empty without a
provider**: `AppShell`, `FollowButton`, `FollowedTrackings`, `PeopleDisclosure`,
`SeasonList`, `TrackingPanel`, `VolumeGrid`. Wrap those in `DesignPreviewProvider` — the
only non-component export in the bundle, provided for exactly this purpose. It supplies a
query cache, an in-memory router and a signed-in demo account in one wrapper; those inner
providers are bundled inside it and are not importable on their own:

```jsx
<DesignPreviewProvider>
  <AppShell />
</DesignPreviewProvider>
```

These seven fetch from an API that isn't reachable in a design. They will render their
loading or error state — that is correct behaviour, not a bug to hide.

## Styling idiom: CSS custom properties, no class vocabulary

Component styles are CSS Modules compiled to hashed class names (`_wrapper_oo9lu_1`).
**There is no utility-class or BEM vocabulary to reuse — never invent class names and
never try to restyle a component's internals.** Style your own layout with the tokens,
via inline styles or your own stylesheet:

| Family | Tokens |
|---|---|
| Ground | `--bg` `--bg-2` `--surface` `--sunken` |
| Ink | `--ink` `--ink-2` `--muted` `--faint`, plus `--voice` for human writing |
| Rules | `--rule` (strong) `--rule-soft` (quiet) |
| Structure | `--amber` — section words, eyebrows. Never an action. |
| Action | `--gold` to fill (with `--gold-ink`), `--gold-text` to set type |
| Medium gels | `--gel-livres` `--gel-films` `--gel-series` `--gel-manga` `--gel-jeux` `--gel-musique`, text on them is `--gel-ink`; `--gel-*-text` to set type |
| Status | `--status-todo` `--status-doing` `--status-done` |
| Signals | `--signal-new` `--danger` |
| Type | `--font-serif` (Cormorant Garamond) `--font-mono` (IBM Plex Mono), sizes `--text-xs` → `--text-3xl` |
| Spacing | `--space-1` → `--space-8` |
| Shape | every radius is `0`; `--block` (offset, no blur) for small chrome, `--lift` (blurred drop) for content |
| Measure | `--measure` (68ch reading width) |

**Two worlds, not one theme and its inverse.** Night is the natural state, day the
variant; night is a cinema (cold blue-black), day is paper (warm cream). The mode lives on
`data-mode` on `<html>`, set before first paint. Never hardcode a hex, and never name a
mode in a component — name a role.

**The colour rules that define this system.** `--amber` is structure and atmosphere;
`--gold` is action, and **a gold element that is not actionable is a bug**. The six medium
gels appear in exactly two places — the masthead rayon nav and medium labels — and nowhere
else. A rayon is a **filled** box with near-black text; a member is a **bordered** chip in
their own ink. That difference is shape, not hue, and it is what keeps the two colour
systems readable side by side; never invert it.

Older token names (`--paper*`, `--surface-page`, `--ink-soft`, `--ink-faint`, `--accent`,
`--type-movie`…) still resolve, but only as a **compatibility scaffold** for screens not
yet reworked. Do not reach for them in new work. `--rule-strong` is gone: `--rule` is now
the strong hairline and `--rule-soft` the quiet one.

## Identity colour is a prop, not a theme

Each account carries a free-form `identity_color` hex. It is how a reader tells members
apart — pass it through: `<ProgressBar color={user.identity_color} />`,
`<IdentityDot account={user} withName />`. Two accounts may legitimately share a hue.

## Data shapes that catch people out

- `progress` is `{checked, total}`. When `total` is `0`, `ProgressBar` **renders nothing**
  by design — never a `NaN%`. Leave room for it to be absent.
- `Cover` fills its cell at every size but `sm` — `base` and `lg` are both `width: 100%`,
  so give them a constrained container. `lg` differs only in the type it sets the fallback
  title in, which is the size that actually matters when `cover_url` is null. `sm` is the
  one fixed width, 46px, for a thumbnail in a row of text.
- `cover_url` and `avatar_url` are usually null, and often point at images that fail.
  `Cover` and `IdentityDot` fall back on their own; that fallback is the common case.
- `MediaMetadata` takes the whole `detail` object, a union discriminated on `type`
  (`movie` | `tv` | `book` | `comic_series` | `game`) — each type shows different rows.
  `metadata.cast` is `Array<{name, character}>`, not strings.
- A `null` tracking means "does not follow this work" — not "à voir". The distinction is
  real and the copy must respect it.

## Where the truth lives

Read `_ds/<folder>/styles.css` and its `@import` closure for the full token and component
CSS, and each component's `<Name>.prompt.md` / `<Name>.d.ts` for its exact props before
composing it.

## An idiomatic screen fragment

```jsx
<div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 'var(--measure)' }}>
  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)' }}>Séries</h2>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 132px)', gap: 'var(--space-4)' }}>
    <Cover url={null} title="Kaamelott" type="tv" />
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
    <IdentityDot account={alice} withName />
    <StatusBadge status="doing" />
    <NewContentBadge />
  </div>
  <ProgressBar progress={{ checked: 7, total: 24 }} color={alice.identity_color} />
</div>
```
