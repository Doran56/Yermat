# Graph Report - /Users/dorangouron/Desktop/yermat-mobile  (2026-05-21)

## Corpus Check
- Corpus is ~25,450 words - fits in a single context window. You may not need a graph.

## Summary
- 168 nodes · 125 edges · 66 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_XP & Gamification Engine|XP & Gamification Engine]]
- [[_COMMUNITY_Social Follow System|Social Follow System]]
- [[_COMMUNITY_App Brand & Config|App Brand & Config]]
- [[_COMMUNITY_Performance Data Layer|Performance Data Layer]]
- [[_COMMUNITY_Recording & Submission Flow|Recording & Submission Flow]]
- [[_COMMUNITY_Yermats Reaction System|Yermats Reaction System]]
- [[_COMMUNITY_Admin Moderation|Admin Moderation]]
- [[_COMMUNITY_Profile & Medal Stats|Profile & Medal Stats]]
- [[_COMMUNITY_Push Notifications|Push Notifications]]
- [[_COMMUNITY_Comments|Comments]]
- [[_COMMUNITY_Bar Data|Bar Data]]
- [[_COMMUNITY_OTP Verification|OTP Verification]]
- [[_COMMUNITY_Utility Functions|Utility Functions]]
- [[_COMMUNITY_Map Screen|Map Screen]]
- [[_COMMUNITY_Admin Screen|Admin Screen]]
- [[_COMMUNITY_Monthly Medal Award|Monthly Medal Award]]
- [[_COMMUNITY_Auth & Session|Auth & Session]]
- [[_COMMUNITY_Bar Stats|Bar Stats]]
- [[_COMMUNITY_Root Layout & Deep Links|Root Layout & Deep Links]]
- [[_COMMUNITY_Profile Screen|Profile Screen]]
- [[_COMMUNITY_Tab Navigation|Tab Navigation]]
- [[_COMMUNITY_Admin Layout|Admin Layout]]
- [[_COMMUNITY_Bar Detail Screen|Bar Detail Screen]]
- [[_COMMUNITY_Email Auth Screen|Email Auth Screen]]
- [[_COMMUNITY_Auth Layout|Auth Layout]]
- [[_COMMUNITY_Card Component|Card Component]]
- [[_COMMUNITY_ListRow Component|ListRow Component]]
- [[_COMMUNITY_StatusBadge Component|StatusBadge Component]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_EmptyState Component|EmptyState Component]]
- [[_COMMUNITY_FilterChip Component|FilterChip Component]]
- [[_COMMUNITY_FeedCard Component|FeedCard Component]]
- [[_COMMUNITY_Performance Sheet|Performance Sheet]]
- [[_COMMUNITY_Challenge Types|Challenge Types]]
- [[_COMMUNITY_Push Notification Hook|Push Notification Hook]]
- [[_COMMUNITY_Leaderboard Hook|Leaderboard Hook]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Expo Env Types|Expo Env Types]]
- [[_COMMUNITY_NativeWind Env Types|NativeWind Env Types]]
- [[_COMMUNITY_Metro Config|Metro Config]]
- [[_COMMUNITY_Babel Config|Babel Config]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_DB Type Definitions|DB Type Definitions]]
- [[_COMMUNITY_Feed Screen|Feed Screen]]
- [[_COMMUNITY_Classement Screen|Classement Screen]]
- [[_COMMUNITY_Performance Detail Screen|Performance Detail Screen]]
- [[_COMMUNITY_Colors Constants|Colors Constants]]
- [[_COMMUNITY_Radius Constants|Radius Constants]]
- [[_COMMUNITY_Shadows Constants|Shadows Constants]]
- [[_COMMUNITY_Animation Constants|Animation Constants]]
- [[_COMMUNITY_Constants Barrel|Constants Barrel]]
- [[_COMMUNITY_Typography Constants|Typography Constants]]
- [[_COMMUNITY_Spacing Constants|Spacing Constants]]
- [[_COMMUNITY_Notify Followers Function|Notify Followers Function]]
- [[_COMMUNITY_Send Push Function|Send Push Function]]
- [[_COMMUNITY_Search Places Function|Search Places Function]]
- [[_COMMUNITY_Maps Key Function|Maps Key Function]]
- [[_COMMUNITY_Submit Performance Function|Submit Performance Function]]
- [[_COMMUNITY_Supabase Types|Supabase Types]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_ScreenHeader Component|ScreenHeader Component]]
- [[_COMMUNITY_Loading Screen|Loading Screen]]
- [[_COMMUNITY_TimeBadge Component|TimeBadge Component]]
- [[_COMMUNITY_Avatar Component|Avatar Component]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Input Component|Input Component]]

## God Nodes (most connected - your core abstractions)
1. `useFollows()` - 7 edges
2. `Yermat Mobile App` - 6 edges
3. `useYermats()` - 4 edges
4. `App Icon — Concentric Circles on Light Grid Background` - 4 edges
5. `Concentric Circles — Brand Visual Motif` - 4 edges
6. `usePerformanceYermats()` - 3 edges
7. `useUserFollows()` - 3 edges
8. `useBarFollows()` - 3 edges
9. `Expo v54.0.0 Versioned Docs Requirement` - 3 edges
10. `Adaptive Icon — Concentric Circles on White Background (Android)` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Yermat Mobile App` --references--> `Favicon — Default Expo Cube Logo`  [INFERRED]
  AGENTS.md → assets/favicon.png
- `Yermat Mobile App` --references--> `App Icon — Concentric Circles on Light Grid Background`  [INFERRED]
  AGENTS.md → assets/icon.png
- `Favicon — Default Expo Cube Logo` --conceptually_related_to--> `Expo Platform (React Native Framework)`  [INFERRED]
  assets/favicon.png → AGENTS.md
- `Yermat Mobile App` --references--> `Adaptive Icon — Concentric Circles on White Background (Android)`  [INFERRED]
  AGENTS.md → assets/adaptive-icon.png
- `Yermat Mobile App` --references--> `Splash Icon — Concentric Circles on White Background`  [INFERRED]
  AGENTS.md → assets/splash-icon.png

## Hyperedges (group relationships)
- **Yermat Mobile Brand Asset Set** — icon_png_app_icon, adaptive_icon_png_app_icon, splash_icon_png_splash, favicon_png_expo_default, concentric_circles_brand_motif [INFERRED 0.85]
- **Expo v54 Documentation Constraint** — agents_md_expo_changed_rationale, agents_md_expo_v54, expo_platform, yermat_mobile_app [EXTRACTED 1.00]

## Communities

### Community 0 - "XP & Gamification Engine"
Cohesion: 0.18
Nodes (2): computeLevel(), computeXpProgress()

### Community 1 - "Social Follow System"
Cohesion: 0.38
Nodes (9): useBarFollows(), useFollowBar(), useFollows(), useFollowUser(), useIsFollowingBar(), useIsFollowingUser(), useUnfollowBar(), useUnfollowUser() (+1 more)

### Community 2 - "App Brand & Config"
Cohesion: 0.33
Nodes (10): Adaptive Icon — Concentric Circles on White Background (Android), Expo Has Changed — Rationale for Consulting Versioned Docs, Expo v54.0.0 Versioned Docs Requirement, CLAUDE.md — References AGENTS.md, Concentric Circles — Brand Visual Motif, Expo Platform (React Native Framework), Favicon — Default Expo Cube Logo, App Icon — Concentric Circles on Light Grid Background (+2 more)

### Community 3 - "Performance Data Layer"
Cohesion: 0.25
Nodes (0): 

### Community 4 - "Recording & Submission Flow"
Cohesion: 0.33
Nodes (2): handlePublish(), triggerRevealAnimations()

### Community 5 - "Yermats Reaction System"
Cohesion: 0.6
Nodes (5): useHasYermated(), usePerformanceYermats(), useToggleYermat(), useYermatCount(), useYermats()

### Community 6 - "Admin Moderation"
Cohesion: 0.33
Nodes (0): 

### Community 7 - "Profile & Medal Stats"
Cohesion: 0.4
Nodes (0): 

### Community 8 - "Push Notifications"
Cohesion: 0.5
Nodes (2): useNotifications(), useUnreadNotificationCount()

### Community 9 - "Comments"
Cohesion: 0.5
Nodes (2): useCommentCount(), useComments()

### Community 10 - "Bar Data"
Cohesion: 0.4
Nodes (0): 

### Community 11 - "OTP Verification"
Cohesion: 0.67
Nodes (2): handleChange(), verify()

### Community 12 - "Utility Functions"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "Map Screen"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Admin Screen"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Monthly Medal Award"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Auth & Session"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "Bar Stats"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Root Layout & Deep Links"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Profile Screen"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Tab Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Admin Layout"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Bar Detail Screen"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Email Auth Screen"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Auth Layout"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Card Component"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "ListRow Component"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "StatusBadge Component"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Button Component"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "EmptyState Component"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "FilterChip Component"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "FeedCard Component"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Performance Sheet"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Challenge Types"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Push Notification Hook"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Leaderboard Hook"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Expo Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "NativeWind Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Metro Config"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Babel Config"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "App Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "DB Type Definitions"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Feed Screen"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Classement Screen"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Performance Detail Screen"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Colors Constants"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Radius Constants"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Shadows Constants"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Animation Constants"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Constants Barrel"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Typography Constants"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Spacing Constants"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Notify Followers Function"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Send Push Function"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Search Places Function"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Maps Key Function"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Submit Performance Function"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Supabase Types"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "ScreenHeader Component"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Loading Screen"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "TimeBadge Component"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Avatar Component"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Badge Component"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Input Component"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **2 isolated node(s):** `Expo Has Changed — Rationale for Consulting Versioned Docs`, `CLAUDE.md — References AGENTS.md`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout & Deep Links`** (2 nodes): `handleUrl()`, `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Screen`** (2 nodes): `ProfileScreen()`, `profile.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tab Navigation`** (2 nodes): `TabIcon()`, `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Layout`** (2 nodes): `AdminLayout()`, `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bar Detail Screen`** (2 nodes): `handleFollow()`, `[barId].tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Email Auth Screen`** (2 nodes): `handleSend()`, `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Layout`** (2 nodes): `AuthLayout()`, `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Component`** (2 nodes): `Card()`, `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ListRow Component`** (2 nodes): `ListRow()`, `ListRow.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `StatusBadge Component`** (2 nodes): `StatusBadge()`, `StatusBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button Component`** (2 nodes): `Button()`, `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EmptyState Component`** (2 nodes): `EmptyState()`, `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FilterChip Component`** (2 nodes): `FilterChip()`, `FilterChip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FeedCard Component`** (2 nodes): `handleYermat()`, `FeedCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Performance Sheet`** (2 nodes): `submit()`, `PerformanceSheet.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Challenge Types`** (2 nodes): `useChallengeTypes()`, `useChallengeTypes.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Push Notification Hook`** (2 nodes): `usePushNotifications()`, `usePushNotifications.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Leaderboard Hook`** (2 nodes): `useClassement()`, `useClassement.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Expo Env Types`** (1 nodes): `expo-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `NativeWind Env Types`** (1 nodes): `nativewind-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Metro Config`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Babel Config`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Entry Point`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Type Definitions`** (1 nodes): `database.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Screen`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Classement Screen`** (1 nodes): `classement.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Performance Detail Screen`** (1 nodes): `[id].tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Colors Constants`** (1 nodes): `colors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Radius Constants`** (1 nodes): `radius.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shadows Constants`** (1 nodes): `shadows.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Animation Constants`** (1 nodes): `animation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Constants Barrel`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Typography Constants`** (1 nodes): `typography.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spacing Constants`** (1 nodes): `spacing.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notify Followers Function`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Send Push Function`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Search Places Function`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Maps Key Function`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Submit Performance Function`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ScreenHeader Component`** (1 nodes): `ScreenHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Loading Screen`** (1 nodes): `LoadingScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TimeBadge Component`** (1 nodes): `TimeBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Avatar Component`** (1 nodes): `Avatar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Badge Component`** (1 nodes): `Badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Component`** (1 nodes): `Input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 6 inferred relationships involving `Yermat Mobile App` (e.g. with `Expo Platform (React Native Framework)` and `App Icon — Concentric Circles on Light Grid Background`) actually correct?**
  _`Yermat Mobile App` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Expo Has Changed — Rationale for Consulting Versioned Docs`, `CLAUDE.md — References AGENTS.md` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._