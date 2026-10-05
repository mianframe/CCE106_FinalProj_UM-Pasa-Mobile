# UM-Pasa-Expo Current State Dashboard
**Project:** UM-Pasa (University of Mindanao Student Academic Resource Marketplace)  
**Target Client:** `UM-Pasa-Expo` (React Native Expo Mobile Application)  
**Target Milestone:** Friday Live Demo (iPhone Dynamic Island & Android)  
**Generated:** October 2026 (Refreshed Post-Round A Implementation)  
**Status:** Read-Only Audit & Demo Readiness Assessment  

---

## 1. System Health Checks

Real command outputs executed against the codebase:

| Check | Command | Result | Findings / Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASSED (0 errors)** | All theme palette and typing errors previously reported in `ThemedApp` and `MeetupTimePicker` are resolved. |
| **Linter** | `npm run lint` | **SKIPPED** | No `lint` script configured in `package.json`. |
| **Expo Doctor** | `npx expo-doctor` | **20 / 21 PASSED** | Passed 20 diagnostic checks. 1 minor advisory: `expo` expected `~57.0.26`, currently on `57.0.25` (patch-level only; non-blocking). |
| **Expo Export Bundler** | `npx expo export -p all` | **PASSED (0 errors)** | Successfully created production JavaScript/Hermes bundles for Web (1.7 MB), Android (3.2 MB bytecode), and iOS (3.2 MB bytecode). No asset or syntax bundling errors. |
| **Git Repository Status** | `git status` / `git log` | **N/A (Unzipped Directory)** | Working directory `/Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo` is an unzipped release snapshot and not a git repository (`fatal: not a git repository`). |

---

## 2. Instructor Feedback Gap Table (17 Items)

Evaluation of all 17 instructor feedback items with file, line, and evidence:

| # | Instructor Feedback Requirement | Status | File & Line | Evidence / Implementation Notes |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Seller reviews** (view reviews on a profile) | `done` | [`App.tsx:758`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L758)<br>[`src/services/profiles.ts:7`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/services/profiles.ts#L7) | `ProfileReviewsScreen` fetches and displays all ratings, star averages, and written comments via `profiles.reviews(id)` (`public_profile_reviews` RPC). |
| **2** | **Marking sold** (seller can mark listing as sold) | `done` | [`App.tsx:263`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L263)<br>[`App.tsx:571`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L571)<br>[`src/services/items.ts:151`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/services/items.ts#L151) | Sellers have a "Mark as sold" button in both `ListingScreen` and `MyListingsScreen` which calls `mark_listing_sold` RPC when the item has no active open transactions. |
| **3** | **Light mode readability** (no invisible text/badges) | `partly` | [`src/theme/tokens.ts:20`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/theme/tokens.ts#L20)<br>[`src/auth/AuthScreens.tsx:9`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/auth/AuthScreens.tsx#L9) | Main screens use dynamic light/dark tokens, but `AuthScreens.tsx` contains static colors, and some inline badges and secondary buttons retain hardcoded white text or low-contrast borders. |
| **4** | **Modern / less blocky UI** (rounded corners, clean cards) | `partly` | [`App.tsx:29-35`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L29-L35)<br>[`App.tsx:864-885`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L864-L885) | Buttons and cards use rounded borders (`borderRadius: 20-24`) and linear gradients, but layouts remain dense and visually heavy with stacked rectangular boxes. |
| **5** | **Shopee-style carousel / banner on home** | `done` | [`App.tsx:50-105`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L50-L105) | `BrowseScreen` features an auto-rotating 3-card banner carousel with timer, smooth horizontal paging, and active dot pagination indicators. |
| **6** | **2-column home grid for listings** | `done` | [`App.tsx:457`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L457)<br>[`App.tsx:574`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L574) | Marketplace listings render in a responsive two-column grid using `(width - 43) / 2` calculation on both `BrowseScreen` and `MyListingsScreen`. |
| **7** | **Easy navigation, smaller elements** | `partly` | [`App.tsx:26`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L26)<br>[`App.tsx:574`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L574) | Compact grid cards and 5-tab bottom navigation fit more items on screen, but admin tables and transaction detail cards still require substantial scrolling. |
| **8** | **Consistent header & tab bar / Dynamic Island check** | `partly` | [`App.tsx:37`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L37)<br>[`App.tsx:788-825`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L788-L825) | Native stack headers and bottom tabs are standardized, but `Page` container's `topSafe=true` creates redundant top spacing beneath native navigation headers on Dynamic Island iPhones. |
| **9** | **Admin listing review expandable with all details** | `done` | [`App.tsx:768-775`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L768-L775) | `AdminItemsScreen` features accordion expanders revealing item photo, full description, college, program, course code, seller info, and inline approve/reject buttons. |
| **10** | **Admin transaction reports expandable with all details** | `done` | [`App.tsx:777-785`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L777-L785) | `AdminTransactionsScreen` and `AdminReportScreen` render expandable `TransactionSummary` accordions showing buyer, seller, payment proof status, meetup info, and rental dates. |
| **11** | **Review Listings button on admin home** | `done` | [`App.tsx:457-463`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L457-L463) | Admin view of `DashboardScreen` displays a dedicated "Review pending listings" quick-action card with real-time pending badge count. |
| **12** | **Admin gets notification when new listing is submitted** | `done` | [`supabase/phase27_workflows_and_reviews.sql:4-26`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/supabase/phase27_workflows_and_reviews.sql#L4-L26) | Database trigger `items_notify_admin_listing_review` on `public.items` automatically inserts notification rows for all admin profiles on pending listings. |
| **13** | **Every notification is clickable and opens relevant screen** | `done` | [`App.tsx:121-137`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L121-L137) | `NotificationsScreen` parses `related_type` and routes taps directly to `Transaction`, `Conversation`, or `Listing`, falling back to an informative modal alert. |
| **14** | **Messenger-style chat** (bubbles, auto-scroll, pinned composer) | `partly` | [`App.tsx:738`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L738) | Message bubbles with sender/recipient alignment and timestamps are implemented, but the message composer is not pinned above keyboard with auto-scroll to latest message (UI-23 open). |
| **15** | **Tappable chat partner profile opens their reviews** | `done` | [`App.tsx:738`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L738) | Top header card in `ConversationScreen` is a tappable row displaying avatar, user name, and item subtitle that navigates directly to `ProfileReviewsScreen`. |
| **16** | **Add Listing button on student home** | `done` | [`App.tsx:457`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L457) | Student dashboard prominently renders `＋ Add a listing` quick-action button navigating to `ListingFormScreen`. |
| **17** | **Accepted meetup proposal updates transaction schedule** | `done` | [`supabase/phase27_workflows_and_reviews.sql:75-91`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/supabase/phase27_workflows_and_reviews.sql#L75-L91)<br>[`App.tsx:738`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L738) | `respond_to_meetup_proposal` updates `transactions.meetup_location`, `transactions.meetup_time`, and computes `rental_due_date`, linking the transaction ID in message metadata. |

---

## 3. Demo Path Walkthrough (16 Steps)

Complete step-by-step trace of the presenter's path for Friday:

| Step | Action | Code Location | Status | Presenter Tip / Demo Risk |
| :-: | :--- | :--- | :---: | :--- |
| **1** | **Buyer logs in** | [`AuthScreens.tsx:54`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/auth/AuthScreens.tsx#L54) | **WORKS** | Ensure email ends with `@umindanao.edu.ph`. Presenter tip: Have credentials pre-saved in autofill or notes. |
| **2** | **Buyer sees home** | [`App.tsx:50, 457`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L50) | **WORKS** | Auto-rotating banner carousel and 2-column grid load. Pause 3 seconds on Home to let carousel rotate before tapping. |
| **3** | **Buyer opens listing** | [`App.tsx:140`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L140) | **WORKS** | Displays price, description, seller profile, and Philippine-formatted posted date. Pick a listing with an image. |
| **4** | **Buyer taps "Message seller"** | [`App.tsx:234`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L234) | **WORKS** | Calls `messaging.send()` and transitions into `ConversationScreen`. Single tap only; avoid double-tapping. |
| **5** | **Buyer sends message** | [`App.tsx:700`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L700) | **RISK** | Message sends successfully, but iOS keyboard can obscure the input box (UI-23 open). Tap background to dismiss keyboard. |
| **6** | **Buyer proposes meetup** | [`App.tsx:704`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L704)<br>[`MeetupTimePicker.tsx:35`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/components/common/MeetupTimePicker.tsx#L35) | **WORKS** | Native date/time picker opens; enforces future time and formats in Philippine Time. Select a time at least 30 min in the future. |
| **7** | **Seller accepts proposal** | [`App.tsx:738`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L738) | **RISK** | Works if `phase27_workflows_and_reviews.sql` is applied on live DB. If missing, proposal updates in chat but transaction is not synced. |
| **8** | **Buyer requests item** | [`App.tsx:159, 311`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L159) | **WORKS** | UI-09 modal bottom sheet opens cleanly with radio payment options. Choose non-cash (e.g. GCash) to show proof upload later. |
| **9** | **Admin logs in** | [`AuthScreens.tsx:54`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/auth/AuthScreens.tsx#L54) | **WORKS** | Admin account receives the 6th bottom tab `Admin` and admin controls on `DashboardScreen`. Use a second device or log out cleanly. |
| **10** | **Admin sees pending listing** | [`App.tsx:457, 757`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L457) | **RISK** | "Review pending listings" button on Admin home always works. Notification bell requires Phase 27 trigger on live DB. |
| **11** | **Admin approves listing** | [`App.tsx:768`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L768) | **WORKS** | Expand accordion to show college/course details to the instructor, then tap "Approve". Item immediately appears in Browse. |
| **12** | **Buyer uploads payment proof** | [`App.tsx:524`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L524)<br>[`src/services/storage.ts:25`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/src/services/storage.ts#L25) | **RISK** | Works, but high-res camera photos (8MB+) cause ArrayBuffer memory spikes and slow uploads. Pick a small screenshot from album. |
| **13** | **Seller marks item sold** | [`App.tsx:263, 571`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L263) | **RISK** | Requires Phase 26 SQL. Also fails if an open transaction exists on the listing. Use "Mark completed" for active orders! |
| **14** | **Complete transaction** | [`App.tsx:544`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L544) | **WORKS** | Seller taps "Mark as completed" on active transaction. Status updates to `completed` and item status updates to `sold`. |
| **15** | **Buyer rates seller** | [`App.tsx:546, 758`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L546) | **RISK** | Rating submission works. Viewing the review on profile requires `public_profile_reviews` RPC from `phase27_workflows_and_reviews.sql`. |
| **16** | **Logout / switch accounts** | [`App.tsx:578`](file:///Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo/App.tsx#L578) | **WORKS** | Sign out button at bottom of Profile tab cleanly clears tokens and restores guest navigation. |

---

## 4. Top 10 Demo Embarrassment Risks & Presenter Tips

Ranked by likelihood of disrupting the live Friday presentation:

### 1. Missing Phase 26 & Phase 27 SQL Migrations on Live Supabase
- **What happens:** Tapping "Mark as sold", opening user reviews, or accepting meetup proposals crashes with an alert: `function public.mark_listing_sold(uuid) does not exist` or `function public.public_profile_reviews(uuid) does not exist`.
- **Why:** These procedures exist only in `phase26_listing_sold.sql` and `phase27_workflows_and_reviews.sql`, not in `complete_setup.sql`.
- **Presenter Tip:** Execute `phase26_listing_sold.sql` and `phase27_workflows_and_reviews.sql` in the Supabase SQL Editor prior to demo day.

### 2. Tapping "Mark as sold" While an Open Transaction Exists
- **What happens:** Tapping "Mark sold" in `ListingScreen` or `MyListingsScreen` displays an error: `"Resolve the open transaction before marking this listing sold"`.
- **Why:** Stored procedure `mark_listing_sold` intentionally forbids direct marking as sold when there is an active `pending` or `approved` transaction.
- **Presenter Tip:** During the demo flow, complete the active request using the "Mark as completed" button in `TransactionScreen`, rather than "Mark sold" in `MyListingsScreen`.

### 3. Chat Keyboard Obstructing Composer & Messages (UI-23 Open)
- **What happens:** On iOS, opening the keyboard pushes or obscures the text input field, and earlier messages do not auto-scroll up.
- **Why:** KeyboardAvoidingView is at `Page` level rather than pinned to the composer bar, and auto-scroll is not yet wired to content changes.
- **Presenter Tip:** Type brief messages and immediately tap the background to dismiss the keyboard before sending or checking responses.

### 4. Memory Lag / Freeze When Uploading Camera Payment Proof
- **What happens:** The app freezes for several seconds or crashes when selecting a camera image for payment proof.
- **Why:** `uploadPaymentProof` loads the entire raw photo into an in-memory `ArrayBuffer` via `fetch().arrayBuffer()` without prior downscaling.
- **Presenter Tip:** Pre-populate the demo phone's gallery with a small receipt screenshot (under 500 KB) and pick that instead of taking a raw 48MP camera photo.

### 5. Chat Screen Flickering on Incoming Realtime Messages
- **What happens:** The message thread flashes blank or resets scroll position every time a new message arrives.
- **Why:** The Supabase Realtime channel callback calls `load()`, which re-fetches the entire conversation instead of appending the new message.
- **Presenter Tip:** Send messages deliberately with a 2-second pause; do not rapidly exchange messages.

### 6. Redundant Top Header Spacing on Dynamic Island iPhones
- **What happens:** Screens like `ListingScreen`, `TransactionScreen`, and `AdminItemsScreen` show doubled top margin.
- **Why:** `Page` has `topSafe=true` while rendered inside a `@react-navigation/native-stack` screen that already includes a safe navigation header.
- **Presenter Tip:** Keep scrolling focused on the card content; avoid drawing attention to the upper header padding.

### 7. Selecting a Past Date / Time in MeetupTimePicker
- **What happens:** Tapping "Approve" or "Send proposal" shows an error: `"Invalid meetup time. Meetup time must be set in the future."`
- **Why:** Both the client-side check and PostgreSQL RPC reject timestamps where `meetup_time <= now()`.
- **Presenter Tip:** Always pick a time at least 30 minutes in the future (or tomorrow's date) during the demo.

### 8. Session Timeout / Delayed App Launch on Slow Wi-Fi
- **What happens:** App stays on the loading spinner for 3 seconds upon launch.
- **Why:** `AuthContext` has a 3000ms safety timeout fallback for session verification if network connection to Supabase is sluggish.
- **Presenter Tip:** Ensure the demo phone is connected to high-speed cellular data or private hotspot rather than congested university Wi-Fi.

### 9. Light Mode Contrast Inconsistencies
- **What happens:** Secondary buttons or badges in `AuthScreens.tsx` display white text on light backgrounds.
- **Why:** `AuthScreens.tsx` uses static color constants rather than the dynamic `ThemeContext` tokens.
- **Presenter Tip:** Set the presentation device to Dark Mode (the app's primary theme) for optimal contrast and visual consistency.

### 10. Attempting Account Deletion During Demo
- **What happens:** Tapping "Delete account" in `ProfileScreen` may fail with RPC missing error.
- **Why:** `delete_user_account` is declared in `database.types.ts` and called in `AuthContext`, but is absent from all repository SQL files.
- **Presenter Tip:** Do not touch "Delete account" during the live demo; demonstrate profile editing and password updates instead.

---

## 5. Verification Checklist (Physical Device & Live Supabase Only)

Items that cannot be statically validated in code and require verification on physical hardware or the live Supabase instance:

- [ ] **Live Supabase SQL Verification:**
  - Run `SELECT proname FROM pg_proc WHERE proname IN ('mark_listing_sold', 'public_profile_reviews', 'delete_user_account');` to confirm all 3 procedures exist.
  - Run `SELECT tgname FROM pg_trigger WHERE tgname = 'items_notify_admin_listing_review';` to confirm the admin notification trigger is active.
- [ ] **Physical iOS Device (Dynamic Island):**
  - Verify that the native stack header does not collide with the Dynamic Island pill on iPhone 14 Pro / 15 / 16.
  - Verify that the iOS modal for `MeetupTimePicker` displays the native wheel picker without clipping.
- [ ] **Physical Android Device:**
  - Verify the two-step date-then-time picker transition (verifying date dismissal does not leave half-set state).
  - Verify Android bottom system navigation bar does not overlap bottom tab icons.
- [ ] **Realtime Push Verification:**
  - Open the same conversation on two physical devices simultaneously and confirm message bubbles appear within 1 second without manual pull-to-refresh.
- [ ] **Camera / Media Library Permissions:**
  - Confirm iOS and Android permission dialogs appear gracefully when tapping "Upload payment proof" or "Pick listing photo".
