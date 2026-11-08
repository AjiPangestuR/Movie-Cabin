# MOCAB --- Phase 15 UI/UX Implementation Brief

**Document type:** Product & Frontend Implementation Specification\
**Version:** 1.0\
**Status:** Design approved; implementation pending\
**Project:** MOCAB (Movie Cabin)\
**Baseline commit:** `b92200ad423323620cf6c56afe169c7d2186024b`
(`b92200a`)\
**Target implementer:** Antigravity\
**Date:** 8 November 2026

------------------------------------------------------------------------

## 1. Purpose

This document is the implementation source of truth for MOCAB Phase 15,
a mobile-first UI/UX refinement based on the designs approved in Stitch.

The objective is to improve the mobile experience while preserving
existing application behavior, routes, database models, authentication,
integrations, and working features.

**This is a UI/UX implementation phase, not a rebuild or
feature-expansion phase.**

Antigravity should inspect the current repository before editing and map
each approved design to the actual existing routes, components,
services, and data contracts. Do not infer that a design element is
already supported merely because it appears in a mockup.

## 2. Project Context and Guardrails

### 2.1 Known project baseline

-   Application: MOCAB (Movie Cabin).
-   Framework: Next.js App Router, React, TypeScript, Tailwind CSS.
-   Data services: Supabase and TMDB integration.
-   Git branch at the recorded baseline: `master`.
-   Recorded baseline commit: `b92200a`.
-   Phase 14 Journal and Notes features were implemented and their
    migration was applied to Supabase Production by the user.
-   Phase 14 included Journal, Personal Notes, navigation entry points,
    and creation drawer behavior.

The baseline above is historical project context. Before implementation,
Antigravity must verify the actual checked-out branch, commit, working
tree, package versions, and current repository state. If the repository
differs, report the discrepancy before proceeding.

### 2.2 Non-negotiable constraints

1.  Preserve existing routes and working flows unless a specific change
    is explicitly approved.
2.  Do not rebuild MOCAB from scratch.
3.  Do not add database tables, columns, migrations, or storage buckets
    for decorative design elements.
4.  Do not invent metrics, user information, movie metadata, journal
    content, or note content.
5.  Do not claim capabilities that do not exist (for example encryption,
    local-only persistence, synchronization, audio playback, or trash
    recovery).
6.  Do not replace real data with hardcoded mock data in production
    components.
7.  Do not remove existing functionality simply to match a screenshot.
8.  Keep desktop behavior functional while prioritizing the mobile
    experience.
9.  Avoid unrelated refactors and dependency upgrades.
10. Do not commit, push, deploy, or apply database migrations unless the
    user explicitly authorizes those actions.

## 3. Approved Design System

### 3.1 Visual direction

MOCAB uses a Retro VHS Cinema visual language:

-   70% Modern Cinematic UI
-   20% Retro VHS Identity
-   10% Pixel Art Decoration

The interface should feel cinematic and editorial, not like a heavily
decorated retro dashboard. VHS and pixel details are accents, not the
main content.

### 3.2 Typography

-   Fraunces: editorial headings.
-   DM Sans: body text and interface labels.
-   Silkscreen: small technical labels, badges, and restrained
    decorative details only.

Use the fonts already configured in the repository. Do not introduce
duplicate font loading or a new typography system without need.

### 3.3 Color tokens

**Dark mode** - Background: `#0B0812` - Surface: `#15101F` - Elevated:
`#21152E` - Hover: `#2C1C3D` - Primary: `#9B35E8` - Bright: `#C16BFF` -
Magenta: `#F044C8` - Lavender: `#D9B0FF` - Text: `#F8F0FF` - Muted:
`#A99AB8` - Border: `#352044`

**Light mode** - Background: `#F7F1FC` - Surface: `#FFFFFF` - Elevated:
`#EFE3F8` - Hover: `#E6D3F2` - Primary: `#792DB5` - Bright: `#9B35E8` -
Magenta: `#D82EAA` - Lavender: `#6A4A87` - Text: `#291536` - Muted:
`#796783` - Border: `#E2D0ED`

Prefer existing design tokens and shared components over introducing
parallel styles. Verify actual token names and theme implementation in
the repository before changing them.

## 4. Scope and Approved Screens

Phase 15 design approval covers Groups A, B, and C. The approved Stitch
exports/screenshots are the visual references. This brief records the
design intent and implementation constraints; it does not replace the
actual visual assets. Keep the approved Stitch exports available to
Antigravity during implementation.

### Group A --- Core Cinema Engine

#### A1. Home Dashboard

Intent: - Preserve the MOCAB cinematic home experience. - Improve mobile
information hierarchy and reduce excessive vertical consumption. - Keep
existing home sections and actions functional.

Implementation constraints: - All collection summaries and counts must
use real application data. - Do not invent metrics or add unsupported
analytics. - Keep the existing Home route and behavior unless repository
inspection proves a route correction is necessary.

#### A2. Movie Bank

Intent: - Improve movie collection browsing, scanning, and filtering. -
Maintain clear poster/title hierarchy and compact mobile cards.

Implementation constraints: - Preserve existing filters, sorting,
statuses, and movie actions. - Rating badges must not collide at narrow
widths (especially 320--360px). - Avoid horizontal page overflow. - Use
actual movie data and existing TMDB fields only.

#### A3. Movie Detail

Intent: - Make essential movie information easier to discover without
requiring excessive scrolling. - Preserve the cinematic poster
treatment.

Implementation constraints: - Reduce the oversized poster's dominance on
mobile where needed. - Keep title, metadata, and synopsis discoverable
earlier in the page. - Only show Journal Kurator/related journal content
when a real related journal exists. - Do not invent metadata such as
aspect ratio, soundtrack, visual palette, or film format if not
supported by the existing model/API. - Destructive Delete action must
remain confirmation-protected and accessible.

### Group B --- Personal Writing Suite

#### B1. My Journal --- `/journal`

Intent: - Compact, readable journal stream. - Search and mood filters
should be easy to scan. - Journal cards should use concise previews.

Constraints: - Counts, index labels, dates, and word counts must be
dynamic if shown. - Use existing mood presets. - Related movie
information appears only when a relation exists. - Preview length should
be controlled without hiding the path to the full entry. - Mood filters
should scroll horizontally without causing page-level overflow.

#### B2. Chronicle Vault --- `/journal/archive`

Intent: - Chronological archive grouped by year and month. - Clear year
selection and compact archive entries. - Scalable for long-running
journals.

Constraints: - Prefer years with actual entries. - Year/month counts
must be computed from real data. - Correct any badge wrapping/clipping
seen in the design reference. - Preserve chronological ordering and
support large result sets. - Do not fabricate archive entries or
statistics.

#### B3. Journal Editor --- `/journal/new`, `/journal/[id]/edit`

Intent: - Distraction-free writing canvas with compact metadata
controls.

Existing supported journal capabilities: - Multiple entries per day. -
Optional mood. - Optional tags. - Optional related movie. - Private by
default. - Draft/published status.

Constraints: - Do not add image, video, or audio uploads. - Do not add
soundtrack players, media galleries, or unsupported formatting. -
Metadata should be compact, collapsible, or otherwise secondary to the
writing canvas. - Save/publish controls must not cover the active cursor
or text when the mobile virtual keyboard is open. - Do not claim
encryption or local-only persistence unless verified in the actual
implementation. - Save status must reflect the actual persistence
mechanism and request result.

#### B4. Personal Notes --- `/notes`

Intent: - Practical, compact collection of short thoughts, ideas, and
notes. - Search, pinned notes, and tags should remain easy to use.

Existing supported note capabilities: - Optional title. - Required
content. - Optional tags. - Pinned status. - Created/updated
timestamps. - Private notes.

Constraints: - Quick Scratchpad must create a normal `personal_notes`
record through the existing Notes flow; it must not create a second
storage system. - Remove special quote-card behavior; quote text is an
ordinary note. - Do not add image, audio, video, mood, or scrapbook
functionality. - Remove mobile-irrelevant keyboard hints such as `ESC`
where they do not apply. - Note and pinned counts must be dynamic. - Do
not assign example tags automatically to new notes. - Tag filters must
not cause horizontal overflow. - The interface must remain usable with
dozens or hundreds of notes.

#### B5. Note Editor --- `/notes/new`, `/notes/[id]`

Intent: - Lightweight, immediate note-taking interface.

Constraints: - Title remains optional. - Content remains required. -
Tags remain optional. - Pin/unpin must use existing behavior. - No image
attachments, galleries, mood selectors, audio/video, or unsupported
rich-text functionality. - Avoid a prominent word-count dashboard. -
Ensure long titles can be edited and displayed without clipping. - Do
not claim notes move to a Trash folder unless a real Trash feature
exists. - Save state must reflect actual persistence. - Keyboard must
not obscure the active editor or save controls.

### Group C --- Global System Overlays

#### C1. Bottom Navigation

Mobile navigation must retain exactly five slots:

1.  Home (design may use the approved Cabin label)
2.  Bank
3.  Create (+)
4.  Archive
5.  Profile (design may use the approved Curator label)

Constraints: - Do not add Journal or Notes as extra bottom-nav slots. -
Preserve actual route destinations and navigation behavior. - A label
change does not authorize a route change. - Respect mobile safe areas. -
Ensure fixed navigation does not obscure the last content/footer area. -
The known footer overlap issue from Phase 15.0 must be addressed:
provide sufficient content bottom padding or an equivalent layout
correction so footer content and links remain visible and clickable
above the fixed navigation.

#### C2. Creation Drawer

Actions, exactly: - Add Movie - New Journal - Quick Note

Behavior: - Opens as a bottom-sheet overlay above the current page. -
Underlying page remains visible under a subtle dark backdrop. - Has a
clear close/dismiss action. - Supports backdrop dismissal and Escape
where applicable. - Uses the existing creation flows/routes. - Respects
safe areas and does not consume unnecessary vertical space. - Decorative
labels such as audio-track or tape-ready indicators must not become fake
audio features.

Accessibility: - Manage focus when opened and restore focus when
closed. - Expose dialog/sheet semantics and an accessible name. - Ensure
touch targets are usable.

#### C3. Global Search

Search categories: - Movies - Journal entries - Personal Notes

Result presentation: - Movie: poster, title, release year when
available. - Journal: title, short preview, entry date, optional mood. -
Note: optional title, short preview, updated date, optional pinned
indicator.

Constraints: - Search must query actual content, not only titles, for
Journal and Notes. - Reuse existing services/API patterns where
possible. - Do not add a recent-search persistence feature unless one
already exists. - Counts must be dynamic. - Category tabs may scroll
horizontally without page-level overflow. - Provide empty, loading,
results, and no-results states. - Handle errors without presenting an
empty result as a successful search.

#### C4. Curator Profile

Intent: - Profile as a personal film-curation archive, not a social
network.

Potential supported content: - Avatar/profile image, display name,
bio/handle only if existing account model supports them. - Collection
overview such as total movies, watched, watchlist, journal entries,
notes, only if those metrics can be computed accurately. - Existing
settings and account actions.

Constraints: - No follower/following counts, public activity feed,
gamification, or invented achievements. - Do not add profile fields
solely to match a mockup. - Only show favorites/curated collections if a
real feature and data source exist. - Do not display unsupported
format/timecode settings. - Do not claim local-only storage, encryption,
or synchronization unless verified. - Preserve actual authentication and
logout behavior.

## 5. Known Mobile Audit Findings to Address

The Phase 15.0 audit identified these issues:

  -----------------------------------------------------------------------
  Priority                Finding                 Required treatment
  ----------------------- ----------------------- -----------------------
  P0/P1                   Footer partially        Fix bottom
                          obscured by fixed       spacing/layout so all
                          BottomNav               footer content is
                                                  visible and clickable

  P1                      Movie Detail poster     Rebalance poster and
                          consumes excessive      essential information
                          vertical space          hierarchy

  P1                      Home Triple-Bill cards  Reduce mobile vertical
                          create excessive page   consumption while
                          height                  preserving feature

  P1                      Journal Editor sticky   Implement keyboard-safe
                          action bar overlaps     behavior
                          cursor when keyboard    
                          opens                   

  P2                      MovieCard rating badges Reflow/compact badges
                          collide at 320--360px   

  P2                      Journal filters are too Compact filter controls
                          dense before first      and reduce initial
                          entry                   vertical footprint
  -----------------------------------------------------------------------

Do not treat the audit findings as permission to remove features. Fix
the layout and interaction problems while preserving functionality.

## 6. Technical Implementation Requirements

### 6.1 Repository reconnaissance first

Before editing, inspect and report: - Current branch, commit, and
`git status`. - `package.json` scripts and installed versions. -
Existing route tree. - Shared layout, Header, BottomNav, Footer,
Creation Drawer, Search Modal, Profile components. - Journal and Notes
components, hooks, services, and types. - Supabase schema/types/RLS
assumptions already represented in code. - TMDB route/service usage. -
Existing tests and test commands. - Existing theme tokens and responsive
breakpoints.

Create a route-to-component mapping based on actual repository files. Do
not guess filenames.

### 6.2 Preserve architecture

-   Prefer updating existing components over duplicating them.
-   Extract shared components only when it reduces duplication and fits
    current conventions.
-   Keep server/client boundaries valid in Next.js App Router.
-   Preserve TypeScript strictness and current lint conventions.
-   Do not introduce a new state-management or UI library for this phase
    without explicit approval.
-   Avoid unnecessary dependencies.

### 6.3 Data integrity

-   Use existing Supabase services and data models.
-   Respect existing Row Level Security and ownership boundaries.
-   Never expose private Journal or Notes content to another user.
-   Avoid N+1 requests where a batched query or existing service can
    provide the same data.
-   Treat loading, empty, error, and unauthorized states distinctly.
-   Do not use sample data in production paths.

### 6.4 Responsive and accessible behavior

Test at minimum: - 320 × 700 - 360 × 800 - 390 × 844 - 430 × 932 -
Desktop viewport used by the existing project

Check: - No horizontal overflow. - Fixed elements do not cover
content. - Touch targets are comfortably usable. - Text remains readable
at narrow widths. - Dialog/drawer focus and dismissal behavior. -
Virtual keyboard behavior in Journal and Note editors. - Reduced-motion
preference where animations are used. - Contrast and visible focus
states.

## 7. Recommended Implementation Sequence

Implement in small, reviewable batches. Do not change every screen in
one massive pass.

### Batch 0 --- Baseline and mapping

-   Verify repository state.
-   Run current tests, TypeScript, lint, and build.
-   Create route/component/data mapping.
-   Record pre-existing failures separately.
-   No design changes in this batch.

### Batch 1 --- Shared shell and global overlays

-   Footer/BottomNav overlap correction.
-   Bottom Navigation responsive refinements.
-   Creation Drawer overlay behavior and accessibility.
-   Global Search states and category result layout.
-   Curator Profile layout using supported data.

### Batch 2 --- Core Cinema Engine

-   Home mobile hierarchy.
-   Movie Bank cards, filters, and rating badge layout.
-   Movie Detail mobile hierarchy.

### Batch 3 --- Journal

-   My Journal stream and filters.
-   Chronicle Vault year/month navigation and entries.
-   Journal Editor metadata layout and keyboard-safe actions.

### Batch 4 --- Personal Notes

-   Personal Notes list, pinned section, search, tags, Quick Scratchpad.
-   Note Editor layout, title handling, pin action, keyboard-safe
    behavior.

### Batch 5 --- Consolidation and regression

-   Cross-screen visual consistency.
-   Responsive checks.
-   Accessibility checks.
-   Functional regression.
-   Full test/type/lint/build suite.

The sequence is recommended; Antigravity may propose a dependency-based
adjustment after reconnaissance, but must explain it before changing the
sequence.

## 8. Testing and Acceptance Criteria

A batch is not complete merely because the page visually resembles
Stitch.

### Functional acceptance

-   Existing actions still work.
-   Existing routes still resolve.
-   Search categories return the correct type of content.
-   Journal and Notes preserve privacy and ownership behavior.
-   Create actions open the correct existing flows.
-   Profile/logout behavior remains intact.
-   No decorative control appears interactive unless it has a real
    action.

### Visual acceptance

-   Approved Stitch hierarchy is followed.
-   MOCAB typography and color tokens are consistent.
-   Mobile spacing is comfortable.
-   No clipping, collisions, or horizontal overflow.
-   Fixed navigation and footer do not overlap.
-   Editor keyboard behavior is usable.

### Engineering acceptance

-   TypeScript check passes.
-   ESLint passes according to current project conventions.
-   Existing automated tests pass.
-   New tests cover changed behavior and regressions.
-   Production build passes.
-   No unexpected dependency or schema changes.
-   No unrelated files or features are modified.

If a check fails, report the exact command, failure, and whether it was
pre-existing or introduced by the current batch. Do not hide or silently
bypass failures.

## 9. Required Antigravity Deliverables

At the end of each batch, provide:

1.  Summary of changes.
2.  Files created/modified.
3.  Routes and components affected.
4.  Data/API behavior changed, if any.
5.  Tests and commands executed with results.
6.  Screenshots at relevant mobile widths.
7.  Known issues and deviations from Stitch.
8.  Confirmation that no database migration, commit, push, or deployment
    was performed unless explicitly authorized.

Do not proceed automatically to the next batch. Stop and present the
result for review.

## 10. Out of Scope

Unless separately approved, Phase 15 does not include:

-   New database tables or columns.
-   New media upload/storage capabilities for Journal or Notes.
-   Trash/recycle-bin functionality for Notes.
-   Audio or soundtrack playback.
-   New analytics or fabricated metrics.
-   Social networking, followers, or public activity.
-   New account/profile fields.
-   Rebuilding authentication.
-   Replacing Supabase or TMDB integrations.
-   Full redesign of desktop UI.
-   Deployment or production database changes.

## 11. Final Definition of Done

Phase 15 is complete when:

-   All approved screens are implemented consistently.
-   Existing application behavior and data contracts are preserved.
-   Mobile audit issues are addressed.
-   Journal and Notes remain private and functional.
-   Search, navigation, drawer, and profile use real supported
    capabilities.
-   Responsive, keyboard, accessibility, and regression checks pass.
-   The user has reviewed and approved the implementation batches.

**Implementation principle:** Follow the approved design where it is
supported by the product. Where a mockup implies unsupported data or
behavior, preserve the existing product contract and adapt the UI rather
than inventing functionality.
