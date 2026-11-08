# MOCAB — Phase 15.0: Mobile UI/UX Audit Report
**Project:** MOCAB (Movie Cabin) — Beruang Sastra  
**Author:** Antigravity Architect & Senior Mobile UX Reviewer  
**Date:** November 2026  
**Status:** Complete Read-Only Audit (Baseline Established)  
**Deliverable File:** `docs/phase-15/PHASE_15_0_MOBILE_UI_AUDIT.md`  

---

## 1. Executive Summary

### 1.1 Mobile Readiness & UX Maturity Assessment
Movie Cabin (MOCAB) is a personalized cinematic library and creative research companion built for Beruang Sastra. The desktop and responsive foundations established through Phase 1 to Phase 14 achieve a distinctive **Retro VHS Cinema** aesthetic (70% Modern Cinematic UI, 20% Retro VHS Identity, 10% Pixel Art Decoration), complete with Fraunces editorial serif typography, DM Sans legibility, Silkscreen OSD badges, and Dark/Light dual modes.

However, a comprehensive mobile-first audit across viewports (**320px to 430px**) reveals that while the application is *technically responsive* (utilizing Tailwind breakpoints `sm:`, `md:`, `lg:` without hard desktop overflows), its mobile experience is predominantly a **linear collapse of desktop grids into single vertical columns**. 

This vertical stacking strategy produces severe mobile UX friction:
1. **Vertical Scroll Fatigue:** Key pages such as the Home Triple-Bill, Movie Detail, and Archive Dossier stack large media elements vertically, forcing users to scroll through 1,800px–2,500px of screen real estate before reaching core actions or textual insights.
2. **Component Occlusion & Fixed Element Collisions:** The fixed `BottomNav` (height ~60px–94px including iOS `safe-area-inset-bottom`) directly covers the bottom half of the global `Footer` because the footer sits outside the main padded container. Furthermore, `sticky bottom-4` action bars in creation and editor screens jump awkwardly over textareas when mobile virtual keyboards appear.
3. **Inverted Hierarchy on Mobile Details:** On `MovieDetailView`, the poster expands to 100% width (~540px high on a 390px screen), followed immediately by 3 action buttons. As a result, the movie title, release year, runtime, and synopsis are pushed completely below the first two viewport folds.
4. **Touch Target & Density Collisions:** On ultra-narrow viewports (320px–360px), two-column grid cards suffer from badge label collisions (`Rating X/10` vs `Potensi Y/10`), while tertiary inline text buttons lack the standard 44×44px touch envelope.

### 1.2 Viewport Test Matrix
All components and pages were systematically audited against standard mobile device profiles:
- **320 × 568 px:** iPhone SE (1st gen) / ultra-compact Android (worst-case boundary)
- **360 × 800 px:** Samsung Galaxy S / standard compact Android
- **375 × 812 px:** iPhone Mini / iPhone X / XS / 11 Pro
- **390 × 844 px:** iPhone 12 / 13 / 14 / 15 baseline
- **430 × 932 px:** iPhone 14/15/16 Pro Max / large Android flagships

---

## 2. Page-by-Page Mobile Audit

---

### Page 1: HomeView (`/`)

#### Visual Hierarchy & Layout Structure
- **Header & Hero:** Editorial masthead with OSD badges ("MOCAB TAPE // REC", "LATE NIGHT CURATION") and headline.
- **Triple-Bill Showcase:** 3 featured recommendations stacked vertically on mobile (`grid grid-cols-1 md:grid-cols-3`).
- **Stats Grid (Collection Overview):** 4 metric boxes rendered in a 2-column grid (`grid grid-cols-2 md:grid-cols-4`).
- **Mood Discovery Strip:** Flex wrap chip selector (`flex flex-wrap gap-2`).

#### Viewport Matrix Observations
- **320px:**
  - Stats boxes with `p-4` have only ~106px usable width. The large font-serif numbers (e.g. "128") crowd against small pixel labels ("TOTAL KOLEKSI"), risking multi-line breakage.
  - Hero card with `p-6` takes ~280px vertical space before any movie is visible.
- **360px – 390px:**
  - Triple-Bill cards render full-width `PosterCover` elements with `aspect-[2/3]`. On a 390px screen, each poster is ~342px wide by ~513px tall.
  - Adding padding and metadata, each card measures **~720px tall**. The 3 Triple-Bill cards alone require **~2,160px of continuous vertical scrolling** (over 2.5 full iPhone 14 screen heights) before reaching the Collection Overview.
- **430px:**
  - Posters expand to ~382px wide × ~573px tall, exacerbating the height inflation.

#### Identified Issues
1. **P1 — Extreme Triple-Bill Height Inflation:** Stacking 3 massive portrait posters vertically turns what should be a snappy curated preview into an exhausting vertical scroll marathon.
2. **P2 — Stats Grid Cramping on Narrow Screens:** 2-column stats layout at 320px creates awkward text-wrapping inside metric cards.
3. **P3 — Mood Discovery Wrap Density:** Unbounded flex-wrap creates uneven multi-line rags on mobile screens without horizontal momentum.

#### Proposed Stitch Mobile Direction
- Convert Triple-Bill into a **horizontal swipeable snap-carousel** (`overflow-x-auto snap-x flex`) with peek preview (85% card width visible + 15% next card peek), allowing the user to browse 3 recommendations in a single compact 380px tall module.
- Render the Collection Overview stats as a **single-row horizontal scroller** or 2×2 compact matrix with tighter internal padding (`p-3`).
- Keep the Mood Discovery chips as a horizontally scrolling pill bar with subtle fade masks on screen edges.

---

### Page 2: BankView (`/bank`)

#### Visual Hierarchy & Layout Structure
- **Header Ledger:** Title ("Movie Bank"), filter summary, and view mode toggle (grid vs compact list).
- **Search & Filter Console:** Search input, status tab switcher (All, Watchlist, Watched), and mood selector chips.
- **Movie Grid:** 2-column grid on mobile (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5`).

#### Viewport Matrix Observations
- **320px:**
  - Usable card width is only **~136px**.
  - The card footer strip (`Rating X/10` and `Potensi Y/10`) collides or forces awkward line wraps.
  - View switcher buttons (Grid vs List) in the header ledger crowd against the count badge.
- **360px – 390px:**
  - 2-column grid feels balanced and visually rich. Tap targets on cards are generous.
  - Filter bar stacks vertically: Search input (44px) + Status tabs (40px) + Mood chips (~80px across 2 lines). Filter console occupies ~200px before movie cards start.
- **430px:**
  - 2-column cards become quite large (~190px wide); posters look crisp, but card spacing could be tightened to show more items per fold.

#### Identified Issues
1. **P2 — Filter Console Vertical Real Estate Consumption:** Filter controls occupy ~25% of initial viewport height, pushing first movie posters below fold on smaller devices.
2. **P2 — Badge Text Collisions on 320px:** Sub-labels inside cards collide due to lack of minimum container width safeguards.
3. **P3 — Sticky Filter Absence:** When scrolling past 50+ movies, the user has to scroll all the way back to the top to change filters or search.

#### Proposed Stitch Mobile Direction
- Implement a **compact sticky filter bar** below header with: Search icon button + active filter chips + a dedicated "Filter" pill button that opens a bottom drawer for deep filtering (Mood, Status, Sort).
- Maintain 2-column grid for standard view, but introduce a **compact list mode** tailored specifically for mobile (horizontal row with 60×90px poster, title, year, rating, and quick status toggle).

---

### Page 3: MovieCard (Shared Card Component)

#### Visual Hierarchy & Layout Structure
- `aspect-[2/3]` poster container with overlay badges (Done stamp, watchlist badge).
- Title line with `truncate` or `line-clamp-2`.
- Sub-row: Year, runtime, mood tag.
- Bottom strip: Rating and Content Potential badges.

#### Viewport Matrix Observations
- **320px:**
  - `Rating 8/10` (~65px) and `Potensi 9/10` (~72px) in `flex items-center justify-between text-[11px]` require 137px minimum plus gap. At 136px column width, badges clip or wrap into 2 rows, distorting card heights unevenly.
- **360px – 430px:**
  - Cards render cleanly; card hover styles gracefully degrade to touch `:active` state.

#### Identified Issues
1. **P2 — Grid Height Misalignment from Badge Wrapping:** When some cards wrap rating badges to a second line while others don't, cards in the same row become uneven.
2. **P3 — Tiny Status Indicator Tap Zone:** The quick-check "watched" status button is small (~28px) on mobile cards, risking mis-taps.

#### Proposed Stitch Mobile Direction
- Simplify mobile badge strip: Replace `Rating X/10` and `Potensi Y/10` with compact icon badges: `★ 8` and `⚡ 9` on ultra-narrow viewports, saving ~50% horizontal space and preventing line wraps.
- Ensure minimum tap targets on any embedded action buttons are at least 44×44px.

---

### Page 4: MovieDetailView (`/bank/[id]`)

#### Visual Hierarchy & Layout Structure
- Breadcrumb navigation (`← Kembali ke Movie Bank`).
- Desktop 2-column layout (`grid grid-cols-1 md:grid-cols-12 gap-8`):
  - Left column (4 cols): Poster cover, streaming watch button, "Catat Setelah Nonton" button, delete trigger.
  - Right column (8 cols): Title, release year, runtime, mood badges, synopsis, research log dossier (if watched).

#### Viewport Matrix Observations
- **320px – 430px (All Mobile Breakpoints):**
  - Stacks into 1 column. Left column is rendered *first* in DOM order.
  - **The poster expands to 100% width** (`PosterCover big` with `aspect-[2/3]`). On a 390px screen, the poster alone is **~540px tall**.
  - Directly underneath the poster sit 3 action buttons: "Buka Tautan Nonton" (48px), "Catat Setelah Nonton" (48px), and "Hapus Film" (40px).
  - Together with breadcrumbs and padding, this action block spans **~740px vertical height**.
  - **Result:** The user cannot see the movie title, year, director, runtime, mood tags, or synopsis without scrolling past a full screen and a half!

#### Identified Issues
1. **P1 — Inverted Mobile Information Hierarchy:** Actions and huge poster precede the essential identity of the movie (Title, Year, Synopsis). The user is asked to "Buka Tautan" or "Catat Setelah Nonton" before even seeing what film they are viewing!
2. **P2 — Poster Oversizing on Mobile:** A 540px tall poster dominates the mobile screen needlessly, mimicking desktop sidebar scaling rather than a mobile movie detail standard.
3. **P3 — Sticky Column Desktop Remnant:** Sticky positioning rules intended for desktop sidebars cause minor jumpiness during mobile scrolling.

#### Proposed Stitch Mobile Direction
- Re-architect mobile detail into an **editorial cinematic header**:
  - Full-width blurred backdrop banner (or compact 120×180px poster floated alongside Title, Year, Runtime, and Mood tags).
  - Synopsis and Creator Research Dossier immediately follow the title header.
  - Transform the primary actions ("Nonton", "Catat") into a **clean sticky bottom action bar** or high-priority button pair docked right under the title.

---

### Page 5: CatatView (`/bank/[id]/catat`)

#### Visual Hierarchy & Layout Structure
- Breadcrumb cancellation link (`Batal (Kembali ke detail film)`).
- Editorial header: "AFTER WATCH // Refleksi Sinematik" + Movie Title.
- Reflection form:
  - 1–10 Rating scale (`NumberScale`).
  - 1–10 Content Potential scale (`NumberScale`).
  - Text inputs: Central Theme, Memorable Scene, Content Angle, Analytical Notes.
  - Submit button.

#### Viewport Matrix Observations
- **320px – 430px:**
  - `NumberScale` uses `grid grid-cols-5 sm:grid-cols-10 gap-2`, rendering as 2 tidy rows of 5 numbered buttons. Touch targets are ~44px tall and responsive.
  - Text input fields and textareas have clear focus rings and legible font sizes (`text-sm` / `text-base` preventing iOS auto-zoom).
  - On 320px, input labels with pixel subtext wrap nicely.

#### Identified Issues
1. **P2 — Long Form Scrolling Without Section Progress:** The form has 6 distinct input fields that require ~800px of vertical scrolling. On mobile, users lose context of the movie title while scrolling down to "Catatan Analisis".
2. **P3 — Submit Button Below Fold:** Save button sits at the absolute bottom of the page, requiring full scroll completion even if the user only wanted to quickly log rating and potential.

#### Proposed Stitch Mobile Direction
- Introduce a **mini sticky header** showing movie title and progress dots (Rating → Potensi → Angle).
- Alternatively, offer a **sticky submit bar** at the bottom of the screen once required fields (Rating & Potensi) are selected.

---

### Page 6: AddMovieView (`/add`)

#### Visual Hierarchy & Layout Structure
- Intake Console: TMDB Search input + manual entry toggle.
- TMDB search results dropdown / grid.
- Manual fallback form with poster URL, title, year, runtime, streaming link, and mood selectors.

#### Viewport Matrix Observations
- **320px – 430px:**
  - Search input is large and accessible.
  - TMDB result cards render as vertical list items with poster thumbnail (40×60px) + title + year + "+ Tambah" button.
  - When the virtual keyboard opens, the search results container shrinks. If the user scrolls, the keyboard may dismiss or overlap results.
  - Manual entry mode expands a long form with multiple inputs.

#### Identified Issues
1. **P2 — Search Results Truncation Behind Keyboard:** On mobile devices, when the virtual keyboard is active (~300px height), only 1–2 TMDB search results fit on screen without manual scroll.
2. **P3 — Small "+ Tambah" Button Touch Target:** In TMDB results, the "+ Tambah" button has ~32px tap height, requiring precise touch accuracy.

#### Proposed Stitch Mobile Direction
- Optimize TMDB search on mobile: Automatically collapse the brand masthead when search input is focused, maximizing screen real estate for search results.
- Full card tap target: Tapping anywhere on a TMDB result card selects it, eliminating the need to hit a small "+ Tambah" button.

---

### Page 7: ArchiveView (`/archive`)

#### Visual Hierarchy & Layout Structure
- Header: "Arsip Creator" + count badge ("X ARSIP TERSIMPAN").
- Film strip divider.
- Dossier list: Array of cards displaying watched movies with creative research logs (`rating`, `contentPotential`, `angle`, `theme`, `scene`, `notes`).

#### Viewport Matrix Observations
- **320px – 430px:**
  - Card layout uses `flex flex-col md:flex-row gap-6 items-start`.
  - On mobile (<768px), it collapses to `flex-col`.
  - The poster thumbnail container is `<div className="w-28 sm:w-36 flex-none self-start">` (112px wide).
  - Because it is `flex-col`, the 112px poster sits alone on the left with **~250px of empty, wasted space to its right**, and then the title, ratings, and research fields render below it.
  - As a result, each dossier card is **~550px–680px tall**. Scrolling through 10 dossiers requires scrolling ~6,000px.
  - In card footers, "Edit Catatan Riset" and "Buka Dossier Lengkap →" are plain text links with tap heights of only ~18px.

#### Identified Issues
1. **P2 — Awkward Mobile Poster Stacking & Empty Space:** In flex-col mode, the 112px poster creates an unbalanced row with dead space to the right, inflating card height.
2. **P2 — Low Touch Target on Dossier Action Links:** Footer links ("Edit Catatan Riset", "Buka Dossier") lack touch padding and fail the 44px touch target guideline.

#### Proposed Stitch Mobile Direction
- Redesign mobile dossier card into a **compact media object header**:
  - Horizontal top row: 72×108px poster on left, Title + Year + Rating/Potential pills on the right.
  - Collapsible research content: Display the "Angle Konten" as a prominent quote box, with "Tema" and "Adegan" expandable via an accordion or clean card body.
  - Footer actions converted to full-width or segmented button bars with 44px tap height.

---

### Page 8: ProfileView (`/profile`)

#### Visual Hierarchy & Layout Structure
- Section A: Account identity with Paw avatar, user email, verified badge.
- Section B: Cinema collection stats (Total Movies, Watched, Mood Spectrum).
- Section C: Appearance theme switcher (Dark / Light).
- Section C.2: PWA Installation card (Standalone badge or "Pasang ke Layar Utama" button + iOS Safari instructions).
- Section D: About MOCAB manifesto.
- Section E: Logout action button.

#### Viewport Matrix Observations
- **320px:**
  - Avatar card wraps cleanly (`flex items-center gap-4` with email `break-all`).
  - Stats render as a single column (`grid-cols-1`), which is legible and spacious.
  - Logout button has `w-full`, providing a massive 48px tap target.
- **360px – 430px:**
  - Layout is clean, readable, and well-proportioned.
  - PWA install guide for iOS Safari expands neatly without layout shifts.

#### Identified Issues
1. **P3 — Theme Toggle Grouping on Mobile:** The theme toggle is housed in a small `p-2 rounded-xl` container with label "Ganti Tema:". On mobile, this feels slightly detached compared to a native toggle row.
2. **P3 — Redundant Bottom Spacing:** Profile view already has `pb-8` plus layout `pb-[100px]`, creating a large white/dark gap above BottomNav.

#### Proposed Stitch Mobile Direction
- Refine Profile into a **native-feeling settings screen**:
  - Full-width settings list items (Theme row with instant switch, PWA install row, About modal trigger).
  - Keep stats as a clean 3-column mini summary or horizontal swipe cards.

---

### Page 9: JournalListView — Stream Mode (`/journal`)

#### Visual Hierarchy & Layout Structure
- Editorial header: "My Journal // DIARI PRIBADI" + "Tulis Jurnal Baru" primary button + "Arsip Kronologis →" link.
- Quick stats strip: Total, Terbit, Draft.
- Filter console: Search input, date picker, status filter (Semua, Terbit, Draft), mood chips, tag chips.
- Chronological entry cards stream (`JournalCard`).

#### Viewport Matrix Observations
- **320px – 430px:**
  - The filter console is packed: Search input + Date input + Status pills + 8 Mood chips + Tag chips.
  - On mobile, this filter section occupies **~380px–440px of vertical height**, nearly half an iPhone screen, before the first journal card appears.
  - The "Tulis Jurnal Baru" gradient button in the header is well-styled, but when scrolled down, the user must rely on the central `BottomNav` "+" button.

#### Identified Issues
1. **P2 — Filter Section Overcrowding:** The stacked search, date, status, mood, and tag filters take up too much vertical space on mobile screens.
2. **P3 — Date Picker Native Styling Variance:** Native `<input type="date">` renders differently across iOS Safari and Android Chrome, occasionally overflowing on 320px.

#### Proposed Stitch Mobile Direction
- Consolidate mobile filters: A single compact search bar with a horizontal scrollable row of mood/status chips. Move date range filtering into a dedicated bottom sheet.
- Emphasize empty state and stream cards with generous breathing room.

---

### Page 10: JournalListView — Archive Mode (`/journal/archive`)

#### Visual Hierarchy & Layout Structure
- Header: "CHRONICLE VAULT // Jurnal Arsip".
- Switcher: "← Aliran Jurnal" + "Tulis Jurnal Baru".
- Filter bar: Search input + Year jumper dropdown (`select`) + Mood chips.
- Grouped entries: Grouped by Month & Year (e.g., "November 2026") separated by `FilmStripDivider`.

#### Viewport Matrix Observations
- **320px – 430px:**
  - Grouping by month works very well on mobile, giving clear chronological milestones.
  - The `FilmStripDivider` renders with a retro OSD look, anchoring each month section.
  - Year jumper dropdown is simple and accessible.

#### Identified Issues
1. **P3 — Year Jumper Alignment on 320px:** When search input and year dropdown sit on the same row, they can wrap awkwardly on screens under 360px.

#### Proposed Stitch Mobile Direction
- Maintain the monthly group structure. Provide a quick sticky month/year timeline jumper on the right edge or a top horizontal pill strip for quick navigation across years.

---

### Page 11: JournalCard & MoodSelector (Shared Components)

#### Visual Hierarchy & Layout Structure
- Top OSD row: Status badge (`DRAFT` / `PUBLISHED`), date label, Tape index, Mood badge.
- Editorial title (`font-serif font-bold text-xl`).
- Content excerpt (`line-clamp-3`).
- Attached movie pill (poster thumbnail + movie title + resonance quote).
- Tags strip (`#tag`).
- Footer: Word count, read time, "Edit", "Buka →".

#### Viewport Matrix Observations
- **320px:**
  - Top OSD row with status badge, date, and mood badge wraps into 2–3 rows.
  - Attached movie pill: With long movie titles and resonance notes, the text truncates properly (`truncate`), avoiding overflow.
  - Footer actions: "Edit" and "Buka →" have tap targets of ~22px height.
- **360px – 430px:**
  - Card looks editorial, atmospheric, and highly readable.
  - MoodBadge colors and micro-indicators look distinctive.

#### Identified Issues
1. **P2 — Header Wrap Density on 320px:** Multiple micro-badges in the card header wrap awkwardly on narrow widths.
2. **P2 — Small Action Tap Envelopes:** Footer "Edit" link is a small text target (`px-2 py-1 text-xs`).

#### Proposed Stitch Mobile Direction
- Streamline mobile card header: Keep Date + Status on the left, Mood badge on the right. Hide secondary OSD text (`TAPE: YYYY.MM.DD`) on screens <375px.
- Make the entire card body clickable to open detail, with a distinct, padded 44px edit button.

---

### Page 12: JournalDetailView (`/journal/[id]`)

#### Visual Hierarchy & Layout Structure
- Breadcrumb nav (`← Kembali ke Jurnal`) + Status badge + "Edit Jurnal" button.
- Editorial header: OSD Tape index, Date, Mood badge, large serif headline (`text-3xl sm:text-5xl`), reading time, tag chips.
- Narrative prose body (`prose text-text-subtle text-base sm:text-lg space-y-6`).
- Attached movie section: Card with movie poster, title, year, runtime, and resonance blockquote.
- Footer actions: Back link + Edit button + `ConfirmInline` delete button.

#### Viewport Matrix Observations
- **320px – 430px:**
  - Prose typography is exceptional: `leading-relaxed`, comfortable line length, and warm contrast against dark/light backgrounds.
  - Attached movie card renders nicely on mobile (`flex-col sm:flex-row`).
  - Delete confirmation inline widget (`ConfirmInline`) expands horizontally and wraps on 320px, occasionally bumping the edit button.

#### Identified Issues
1. **P2 — Delete Inline Confirmation Width Collision on 320px:** When confirming deletion, the prompt "Hapus entri jurnal ini selamanya?" + "Ya, hapus" + "Batal" spans ~290px, causing wrapping collisions in narrow viewports.
2. **P3 — Top Navigation Clutter:** Breadcrumbs, status badge, and edit button in a single row crowd together on 320px.

#### Proposed Stitch Mobile Direction
- Clean editorial reading canvas: Move edit and delete controls into an unobtrusive top-right menu or sticky bottom control bar.
- On mobile, replace inline delete expansion with a standard, safe bottom confirmation sheet.

---

### Page 13: JournalEditorView & MovieAttachmentDrawer (`/journal/new`, `/journal/[id]/edit`)

#### Visual Hierarchy & Layout Structure
- Top toolbar: Back button, mode badge ("TULIS BARU" / "MODE EDIT"), word/minute counter.
- Writing canvas: Borderless title input + expandable content textarea (`min-h-[360px]`).
- Collapsible metadata drawer: Date picker, Mood selector, Tag manager, Movie attachment drawer.
- Sticky bottom action bar (`sticky bottom-4 z-20`): "Simpan Draf" + "Publikasikan Jurnal".

#### Viewport Matrix Observations
- **320px – 430px:**
  - Writing canvas has clean, distraction-free aesthetic.
  - **Virtual Keyboard Collision (Critical):** The sticky bottom bar (`sticky bottom-4 z-20`) sits inside the scrollable document. On iOS Safari and Chrome Android, when the virtual keyboard pops up to type in the textarea, the browser view shrinks. The sticky bar jumps upward, frequently docking directly over the active typing area, covering what the user is typing!
  - Movie Attachment Drawer: Searching for a movie within the collapsible drawer expands a nested scroll container (`max-h-48`). Inside an already collapsed drawer on mobile, this creates "scroll-within-a-scroll" friction.

#### Identified Issues
1. **P1 — Sticky Action Bar Collides with Virtual Keyboard:** Sticky bottom action bar obscures the typing cursor when the software keyboard opens on mobile devices.
2. **P2 — Nested Scroll in Movie Attachment Drawer:** Inside mobile viewports, scrolling through search results inside a drawer causes accidental parent page scrolling.
3. **P3 — Tag Input Mobile Keydown:** Mobile virtual keyboards do not always dispatch standard `Enter` key events cleanly for tag insertion; tapping "Tambah Tag" is necessary.

#### Proposed Stitch Mobile Direction
- Keyboard-aware action bar: On mobile, dock the action buttons either into a fixed top bar (like native iOS Notes / Medium) or use a non-sticky footer that remains at the bottom of the content flow, preventing keyboard collisions.
- Full-screen or bottom-sheet movie picker: Opening the movie attachment should trigger a dedicated bottom sheet with instant search, rather than a nested dropdown.

---

### Page 14: NotesListView & NoteCard (`/notes`)

#### Visual Hierarchy & Layout Structure
- Header: "PAPAN IDE // PERSONAL SCRATCHPAD" + "+ Catatan Baru" button.
- Quick stats: Total Catatan, Disematkan.
- Inline quick scratchpad (`⚡ Tangkap Ide Kilat` input + "+ Simpan Cepat").
- Filter console: Search input, filter tabs (Semua vs Disematkan), tag chips.
- Notes grid: 1 column on mobile, 2 on md, 3 on lg (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`).
- `NoteCard`: Pinned badge, date, pin toggle button, title, content (line-clamp-5), tags, footer actions.

#### Viewport Matrix Observations
- **320px – 430px:**
  - 1-column grid on mobile looks like a tactile memo board.
  - Inline quick scratchpad is responsive and convenient for fast captures.
  - Pin button on top right of each card is easy to tap.
  - Delete inline confirmation inside card footer is tight on 320px.

#### Identified Issues
1. **P2 — Quick Scratchpad Button Wrap on 320px:** On 320px, the inline quick scratchpad input and "+ Simpan Cepat" button wrap into 2 rows, which works but takes extra vertical space.
2. **P2 — Delete Confirmation Width Collision in Card Footer:** `ConfirmInline` in `NoteCard` footer can overflow on narrow widths.

#### Proposed Stitch Mobile Direction
- Refine quick scratchpad into a sleek, docked quick-add bar at the bottom or top of the memo board.
- Convert note cards into masonry or clean staggered cards with swipe-to-pin or swipe-to-delete gestures.

---

### Page 15: NoteEditorView (`/notes/new`, `/notes/[id]`)

#### Visual Hierarchy & Layout Structure
- Top navigation: Back button, mode badge, timestamp.
- Note writing canvas: Optional title input + required content textarea (`min-h-[260px]`).
- Word count and character indicator (`X / 10.000 karakter`).
- Memo settings: Pin toggle button + tag input and chips.
- Bottom action footer: "Batal", "Hapus Catatan" (if edit), "Simpan Catatan".

#### Viewport Matrix Observations
- **320px – 430px:**
  - Form is simple and lightweight.
  - Because actions are in a regular document-flow footer (not sticky), it behaves better with virtual keyboards than `JournalEditorView`.
  - On 320px, the bottom footer flexes into 2 rows cleanly.

#### Identified Issues
1. **P2 — Pin Toggle Button Discoverability:** The pin toggle is placed inside an expandable-looking panel below the textarea. On mobile, users might miss it without scrolling.
2. **P3 — Height of Textarea on Small Screens:** `min-h-[260px]` plus title and settings pushes the save button far below fold on 320px screens.

#### Proposed Stitch Mobile Direction
- Pin toggle as an icon button in the top navigation bar (like Apple Notes pin icon).
- Auto-expanding textarea that grows with content without imposing artificial minimum heights.

---

### Global Layer Audit: Layout, Header, Footer & Overlays

#### `layout.tsx` + `Footer.tsx` + `BottomNav.tsx`
- **Critical Finding (P0 / P1):**
  - In `src/app/layout.tsx`:
    ```tsx
    <div id="app" className="min-h-screen flex flex-col pb-[100px] md:pb-0">
      <Header />
      <main id="main-content" className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
    <Footer />
    <BottomNav />
    ```
  - `div#app` has `pb-[100px]` to clear the mobile bottom nav.
  - **However, `<Footer />` is placed *outside* `div#app`**, directly preceding `<BottomNav />`.
  - `<BottomNav />` is `fixed bottom-0` with height ~60px–94px (including `safe-area-inset-bottom`).
  - `<Footer />` only has `py-8` (32px bottom padding).
  - **Consequence:** The bottom 30px–60px of the footer (including the TMDB API attribution link and OSD status ledger) is directly covered and obscured by `BottomNav` on all mobile viewports!
  - Users attempting to read the TMDB attribution or click links in the footer find them inaccessible or intercepted by the `BottomNav` buttons.

#### `CreationDrawer.tsx` (Bottom Sheet)
- Bottom sheet trigger from `BottomNav` "+" button.
- Smooth backdrop blur and slide-up animation.
- Safe-area bottom inset handling: `pb-[calc(24px+env(safe-area-inset-bottom))]`.
- 3 creation cards: "Rekam Film Baru", "Tulis Jurnal", "Catatan Cepat".
- **Finding:** Touch targets are large (>56px height) and well-spaced. Lacks touch-drag gesture (swipe down to dismiss), relying solely on backdrop tap or 'X' button.

#### `Header.tsx` & `SearchModal.tsx`
- Header is sticky (`sticky top-0 z-30`). On mobile, it displays the logo, mobile search icon, theme toggle, and logout button.
- Navigation links (`Home`, `Movie Bank`, `Archive`, `Journal`, `Notes`) are hidden on mobile (`hidden md:flex`), which is correct since they are handled by `BottomNav` and drawers.
- **Finding:** In `SearchModal`, `max-h-[82vh]` combined with mobile software keyboards leaves only ~200px of visible search results. Keyboard shortcut guides (`↑↓ Navigasi`, `Enter`, `Esc`) in modal footer are desktop-centric and can be hidden on mobile.

#### `LoginPage.tsx` & `OfflinePage.tsx`
- Both pages are well-centered, responsive, and performant on mobile.
- `LoginPage` hides `BottomNav` cleanly via path check.
- `OfflinePage` provides clear retry buttons and retro OSD status without horizontal scroll.

---

## 3. Issue Prioritization Matrix

| Defect ID | Component / Page | Category | Severity | Description | Proposed Solution |
|---|---|---|---|---|---|
| **MOB-01** | `layout.tsx` / `Footer.tsx` | Layout / Occlusion | **P0** | Global Footer is positioned outside padded container; bottom 30–60px (TMDB attribution, OSD links) is obscured by fixed `BottomNav`. | Move `<Footer />` inside `div#app` or add `pb-[calc(80px+env(safe-area-inset-bottom))]` to `Footer.tsx`. |
| **MOB-02** | `MovieDetailView.tsx` | Information Hierarchy | **P1** | Poster expands to 100% width (~540px high on 390px), followed by 3 buttons before Title, Year, or Synopsis are visible. | Re-architect mobile layout: float compact poster thumbnail beside title, or use cinematic backdrop header with sticky action bar. |
| **MOB-03** | `HomeView.tsx` | Vertical Scroll Bloat | **P1** | Triple-Bill recommendations stack 3 full-size posters vertically (~2,160px height), creating extreme scroll fatigue. | Convert Triple-Bill into a horizontal snap-carousel with 85% card width peek preview. |
| **MOB-04** | `JournalEditorView.tsx` | Virtual Keyboard Collision | **P1** | Sticky bottom action bar (`sticky bottom-4`) jumps over textarea when mobile keyboard opens, blocking the active typing line. | Dock action buttons to top navigation bar or keep them in natural document flow without sticky overlay. |
| **MOB-05** | `MovieCard.tsx` / `BankView.tsx` | Layout & Wrapping | **P2** | On 320px–360px screens, `Rating X/10` and `Potensi Y/10` badges collide or wrap into two lines, distorting grid card heights. | Replace verbose badge text with compact icon badges (`★ 8` and `⚡ 9`) on ultra-narrow viewports. |
| **MOB-06** | `ArchiveView.tsx` | Layout Imbalance | **P2** | 112px poster sits alone in flex-col with ~250px dead space to its right; cards are unnecessarily tall (~600px). | Switch to compact media object layout: 72×108px poster on left, Title + Scores on right. |
| **MOB-07** | `JournalListView.tsx` | Density / Space Bloat | **P2** | Stacked filter bar (Search + Date + Status + 8 Moods + Tags) takes ~420px height before any journal entry appears. | Compress into single search row + horizontal scrolling chip strip + bottom sheet for advanced filters. |
| **MOB-08** | `JournalCard.tsx` / `NoteCard.tsx` | Accessibility / Touch | **P2** | Secondary text links ("Edit", "Buka Dossier", "Hapus") have tap heights under 24px, failing WCAG 44×44px standards. | Increase touch envelope to minimum 44×44px with transparent hit padding or pill containers. |
| **MOB-09** | `SearchModal.tsx` | Viewport Constraint | **P3** | When mobile virtual keyboard opens, `max-h-[82vh]` modal shrinks drastically, showing only 1–2 search results. | Optimize modal top padding on mobile and hide desktop keyboard shortcut hints. |
| **MOB-10** | `CreationDrawer.tsx` | Interaction Polish | **P3** | Bottom sheet has a drag handle bar but lacks touch swipe-down gesture to dismiss. | Implement touch gesture listeners for natural pull-down dismissal. |

---

## 4. Cross-Page Consistency Analysis

### 4.1 Typography Scaling & Reading Measures
- **Serif Headings (Fraunces):** Responsive classes `text-2xl sm:text-4xl` scale smoothly across all views. On 320px viewports, long titles (e.g. Indonesian journal titles) occasionally wrap into 3–4 lines. A base scale of `text-2xl` on mobile with tight line-height (`leading-tight`) is effective.
- **Body Text (DM Sans):** The `16px` (`text-base`) body size in `JournalDetailView` and `MovieDetailView` is ideal for mobile legibility and prevents iOS Safari automatic zoom-on-focus.
- **Pixel Art Labels (Silkscreen):** Consistently applied for OSD status bars (`text-[10px] uppercase tracking-wider`). Excellent brand consistency across all pages.

### 4.2 Card Architectures & Padding Patterns
- Desktop views utilize `p-6 sm:p-8`, which is automatically reduced to `p-4 sm:p-5` on mobile.
- In `ArchiveView` and `NotesListView`, card padding is comfortable. However, in `HomeView` and `BankView`, card margins on 320px screens leave only ~136px column width, requiring compact internal badge padding (`px-1.5 py-0.5`).

### 4.3 Filter Bars & Search Inputs
- Currently, four different filter designs exist across pages:
  1. `BankView`: Search input + Status tab row + Mood chips.
  2. `JournalListView`: Search input + Date input + Status pills + Mood chips + Tag chips.
  3. `NotesListView`: Search input + Filter tabs (Semua vs Disematkan) + Tag chips.
  4. `SearchModal`: Standalone global popup with live query filtering.
- **Consistency Recommendation:** Unify all mobile list views into a shared **Mobile Filter Pattern**: A sticky or docked search input with a single horizontal swipeable chip tray for moods/tags, with advanced filters in a bottom drawer.

### 4.4 Button & Action Bar Paradigms
- Three distinct action bar strategies are currently mixed:
  - Floating sticky bottom bar (`sticky bottom-4` in `JournalEditorView`)
  - Inline footer buttons (in `NoteEditorView` and `CatatView`)
  - Action stacked beneath media (in `MovieDetailView`)
- **Consistency Recommendation:** Establish two strict mobile action paradigms:
  1. **Browsing / Reading:** Fixed `BottomNav` with prominent central "+" trigger.
  2. **Editing / Authoring:** Fixed top navigation bar with "Batal" (left) and "Simpan / Terbitkan" (right), matching standard iOS/Android editor patterns and completely avoiding virtual keyboard collisions.

---

## 5. Recommended Stitch Design Scope

Before implementing code changes, a targeted mobile redesign exploration in **Google Stitch** should be executed. Rather than redesigning all 15 screens from scratch, screens should be grouped into **3 core visual packages** and anchored by a set of **shared mobile design components**.

### 5.1 Screen Design Groups for Google Stitch

#### Group A: Core Cinema Experience (3 Screens)
1. **Mobile Home View:**
   - Hero editorial card.
   - Horizontal snap-carousel for Triple-Bill recommendations (swipeable with card peek).
   - Compact 2×2 or swipeable Collection Overview stats.
   - Horizontal mood spectrum scroller.
2. **Mobile Bank & Filter View:**
   - Sticky search header with compact status pills.
   - Refined 2-column card grid with `★` and `⚡` icon badges.
   - Bottom sheet filter console mockup.
3. **Mobile Movie Detail & Dossier:**
   - Cinematic header with compact poster and immediate title/year/synopsis visibility.
   - High-contrast primary action buttons ("Nonton", "Catat").
   - Integrated Writer's Room research dossier.

#### Group B: Personal Writing & Reflection Suite (3 Screens)
4. **Mobile Journal Stream & Chronicle Vault:**
   - Editorial date-stamped stream cards with compact OSD headers.
   - Month/Year chronological jumpers for Archive mode.
   - Attached movie resonance card layout.
5. **Mobile Journal Editor & Movie Attachment Sheet:**
   - Distraction-free mobile writing canvas with top-bar save controls (keyboard-safe).
   - Bottom sheet movie search & attachment drawer.
   - Mood selector chip grid.
6. **Mobile Notes Board & Quick Capture:**
   - Tactile memo board with pinned note hierarchy.
   - Docked quick-capture bar with 1-tap save.

#### Group C: System Shell & Interactive Overlays (2 Screens)
7. **Mobile BottomNav & Creation Action Sheet:**
   - 5-slot bottom bar with central elevated gradient button.
   - Full-fidelity Creation Drawer bottom sheet with smooth drag handle.
8. **Mobile Search & Profile Console:**
   - Keyboard-friendly global movie search sheet.
   - Clean settings & PWA management profile view.

### 5.2 Shared Mobile Design Tokens & Specs
- **Minimum Touch Target:** `44 × 44 pt` (WCAG 2.5.5 / 2.5.8 compliant).
- **Mobile Container Padding:** `16px` outer gutters (`px-4`), `12px` card gaps (`gap-3`).
- **Screen Ratio Safe Zones:** Bottom clearance of `calc(64px + env(safe-area-inset-bottom))`.
- **Card Badge System:** Maximum 2 compact badges per card on mobile, using icon prefixes to prevent line wraps.

---

## 6. Implementation Risk & Protected Foundations

During any future implementation phase resulting from the Stitch designs, the following structural, security, and architectural baselines **must be strictly protected and preserved without regression**:

1. **Database Schema & RLS Policies (Phase 14.1):**
   - Tables: `journal_entries`, `journal_movie_relations`, `personal_notes`.
   - Security Definer function `validate_journal_movie_ownership()` with `SET search_path = ''`.
   - Strict `auth.uid() = user_id` row-level security on all operations.
2. **Data Services & Server Actions (Phase 14.2):**
   - Clean separation of business logic in `src/lib/journal.ts`, `src/lib/notes.ts`, and `src/app/actions/`.
   - Empty draft permissions vs published content constraints.
   - Atomic revalidation tags (`revalidatePath('/journal')`, `revalidatePath('/notes')`).
3. **Retro VHS Cinema Brand Identity (Phase 13 & 14):**
   - Color tokens: Dark `#0B0812` background, Light Retro Lavender `#F7F1FC`.
   - Fraunces serif headlines, DM Sans body text, Silkscreen pixel art OSD accents.
   - Beruang Sastra paw stamp iconography and scanline atmosphere.
4. **Offline PWA Capabilities (Phase 12):**
   - Web app manifest, standalone display mode detection (`useSyncExternalStore`), and Service Worker registration.
   - Dedicated offline fallback page (`/offline`).
5. **Passing Automated Test Suite:**
   - All 165 existing tests (Unit, Service, Validation, and Component tests) must remain 100% passing across any UI restructuring.

---

## 7. Final Recommendation & Prioritized Redesign Roadmap

### Phase Roadmap Overview

```
Phase 15.0: Mobile UI/UX Audit (Complete Read-Only Baseline)
     │
     ▼
Phase 15.1: Google Stitch Mobile Design Direction (Visual Prototyping)
     ├── Group A: Core Cinema Engine (Home, Bank, Movie Detail)
     ├── Group B: Writing Suite (Journal Stream, Editor, Notes Board)
     └── Group C: Navigation Shell (BottomNav, Creation Sheet, Search)
     │
     ▼
Phase 15.2: Mobile Layout & Shell Reconciliation (Implementation)
     ├── Fix P0 Footer Obscuration in layout.tsx
     ├── Mobile Triple-Bill Snap Carousel in HomeView
     ├── Movie Detail Editorial Hierarchy Reordering
     └── Keyboard-Safe Action Bar for Journal & Note Editors
     │
     ▼
Phase 15.3: Verification, Cross-Device Testing & Test Suite Maintenance
```

### Immediate Next Steps
1. **User Sign-Off on Phase 15.0 Audit:** Present this audit report and review the P0/P1/P2 priorities.
2. **Proceed to Phase 15.1 (Google Stitch Exploration):** Design the approved screen groups in Stitch adhering to the Retro VHS design tokens and mobile-first constraints outlined in Section 5.
3. **No Code Modifications Until Design Approval:** Maintain the codebase in its clean, verified state (`master` branch commit `b92200a`, 165/165 tests passing) until visual alignment is complete.

---
*Report concluded. MOCAB Phase 15.0 Read-Only Mobile UI/UX Audit is complete.*
