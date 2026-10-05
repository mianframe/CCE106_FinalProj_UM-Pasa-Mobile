# UM-Pasa: Capstone Defense & Presentation Guide
**University of Mindanao Academic Resource Marketplace**
*Department of Computing Education · Information Technology Program*

---

## 1. Executive Pitch & Theoretical Explanation

### The Problem
At the University of Mindanao, students frequently invest substantial amounts of money into specialized academic resources—such as engineering drawing kits, scientific calculators, laboratory coats, departmental uniforms, and reference textbooks. After completing a semester, these items often sit idle and unused. Meanwhile, incoming or lower-year students face significant financial hurdles acquiring the exact same materials. 

Generic platforms such as Facebook Marketplace or Carousell present distinct disadvantages:
- **No institutional trust:** Anyone can join; there is no student verification.
- **Safety hazards:** Transactions take place off-campus with unverified individuals.
- **No academic categorization:** Items cannot be indexed or discovered by UM Department, Program, or Course Code (e.g., `IT211`, `CPE312`).

### The UM-Pasa Solution
**UM-Pasa** is a secure, campus-bounded peer-to-peer mobile marketplace engineered specifically for University of Mindanao students and faculty. It supports:
1. **Direct Sales & Academic Rentals:** Flexible models catering to single-use items (rentals by day) versus permanent materials (sales).
2. **Institutional Moderation:** Items require university administrative approval before public exposure to prevent inappropriate or hazardous listings.
3. **Safe Campus Coordination:** Designated on-campus meetup scheduling with time/location confirmation.
4. **Digital Payment Proof & Auditability:** Secure receipt photo uploads and mutual star ratings.

---

## 2. Technical Architecture & Design Decisions

When your professor asks technical questions about how the app is built, highlight these architectural points:

### 1. Client Architecture
- **Framework:** React Native with Expo SDK 52 and TypeScript in strict mode.
- **Navigation:** Native stack and bottom tab navigation (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`).
- **Safe Area & Responsive UI:** Root-level `<SafeAreaProvider>` combined with edge-aware safe views ensures seamless display across iPhones (Dynamic Island, notches) and Android devices.
- **Concurrency & Double-Submit Protection:** Asynchronous actions (submitting ratings, approving transactions, sending meetup proposals) utilize debounce locks to prevent duplicate submissions over slow networks.

### 2. Backend & Data Layer
- **Database Engine:** PostgreSQL hosted on Supabase.
- **Security via Row Level Security (RLS):** Every table (`items`, `transactions`, `messages`, `ratings`, `notifications`, `profiles`) enforces strict RLS policies. Students can only read and write records they legitimately own.
- **Transactional RPC Stored Procedures:** High-integrity operations are wrapped in PostgreSQL functions (`save_listing`, `approve_transaction`, `complete_transaction`, `rate_transaction`, `send_message`, `delete_user_account`) to guarantee atomicity and avoid race conditions.
- **Storage:** Supabase Storage with dedicated buckets (`items` public bucket for listings, `receipts` secured bucket with signed URLs for payment proofs).

### 3. Store & Defense Compliance
- **Account Deletion:** Built-in self-service account deactivation (`delete_user_account()`) compliant with Apple App Store (Guideline 5.1.1(v)) and Google Play privacy requirements.
- **Password Recovery:** Integrated self-service password reset calling native Supabase recovery.
- **Session Persistence:** Asynchronous local storage avoids Android's 2048-byte Keystore limits.

---

## 3. Step-by-Step Live Demo Script (5-Minute Walkthrough)

### Pre-Demo Checklist (10 minutes before defense)
1. Make sure your Mac and testing device/simulator are running.
2. Start the Expo server without the slow `--tunnel` flag:
   ```bash
   cd /Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo
   npx expo start
   ```
3. Open the app on the iOS Simulator (press `i`) or web browser (press `w`).

---

### Act 1: Guest Discovery & Academic Filtering (1 Minute)
* **What to say:**
  > *"First, let's explore UM-Pasa from a prospective or guest student's perspective. The marketplace allows anyone on campus to browse available resources before signing in."*
* **What to do:**
  1. Show the main feed with pre-seeded listings.
  2. Point out visual badges: **`FOR SALE`** vs. **`FOR RENT`**, item condition (`Like New`, `Good`), price, and the seller's academic department.
  3. Tap the **Category chips** (e.g., *Calculators*, *Uniforms*, *Gadgets*).
  4. Expand **More filters**:
     - Select **Department** &rarr; *Department of Computing Education*.
     - Notice how the **Program** list dynamically populates with computing degrees (*BS in Computer Science*, *BS in Information Technology*).
     - Type a course code in the search field (e.g., `IT211`).

---

### Act 2: Seller Experience & Academic Rental (1 Minute)
* **What to say:**
  > *"Now let's sign in as a student seller to post an academic resource. UM-Pasa uniquely supports both outright sales and short-term rentals."*
* **What to do:**
  1. Sign in with **`seller@umindanao.edu.ph`** (Password: `password`).
  2. Navigate to **Add listing**.
  3. Enter a title (e.g., *Casio Scientific Calculator fx-991EX*).
  4. Toggle **Listing Type** from *For sale* to **For rent**:
     - Highlight that the form dynamically reveals: *Daily rental rate*, *Minimum days*, and *Maximum days*.
  5. Select accepted payment methods (*Cash on pickup*, *GCash*, *Maya*).
  6. Select item condition and course department.
  7. Tap **Save listing**.
  8. Point out the badge: **`PENDING REVIEW`**.
     > *"Notice that the listing does not immediately appear in the public market. It is queued for administrator review to safeguard university standards."*

---

### Act 3: Administrator Moderation & Oversight (45 Seconds)
* **What to say:**
  > *"To maintain trust and safety, university moderators review all listings before they become visible to the student body."*
* **What to do:**
  1. Sign out, and sign in with **`admin@umindanao.edu.ph`** (Password: `password`).
  2. Open the **Admin Panel**:
     - Show **Platform Analytics**: Total users, active students, pending review count, and charts showing listings by department and category.
  3. Tap **Listing review**:
     - Find the pending listing and tap **Approve**.
     - (Optional) Show that admins also have the authority to reject items with specific reason feedback or remove inappropriate postings.

---

### Act 4: Buyer Request, Meetup Coordination & Payment Proof (1.5 Minutes)
* **What to say:**
  > *"Now that the item is approved, let's switch to a buyer student who needs this item for their upcoming exam."*
* **What to do:**
  1. Sign out, and sign in with **`buyer@umindanao.edu.ph`** (Password: `password`).
  2. Find the newly approved listing in the marketplace and open it.
  3. Tap **Request this item**:
     - Choose payment method (e.g., *GCash*).
  4. Navigate to the **Transactions** screen:
     - Open the transaction details.
     - Tap **Upload payment proof** &rarr; select a receipt screenshot from library. Show that the receipt URL is securely stored.
  5. Open **Messages / In-App Coordination**:
     - Demonstrate the **Meetup Proposal** widget: Seller or buyer proposes a campus spot (e.g., *Student Center Lobby, 3:00 PM*).
     - The counterparty taps **Accept**, locking in the verified meeting.
  6. Tap **Mark as completed** once the exchange is done.
  7. Submit a **5-star review** with feedback comments.

---

### Act 5: Governance & App Store Compliance (30 Seconds)
* **What to say:**
  > *"Finally, UM-Pasa was built in strict adherence to App Store and Google Play privacy guidelines."*
* **What to do:**
  1. Navigate to the **Profile** screen.
  2. Scroll down to show profile editing and password change options.
  3. Point out the **Delete account** button.
  4. Tap it to trigger the confirmation dialogue:
     > *"This demonstrates compliance with Apple Guideline 5.1.1(v), which requires account deletion directly within mobile apps."*

---

## 4. Demo Login Credentials

All test accounts use the password: **`password`**

| Account Role | Email Address | Password | Primary Purpose in Demo |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@umindanao.edu.ph` | `password` | Reviewing pending listings, inspecting analytics, user roles |
| **Seller** | `seller@umindanao.edu.ph` | `password` | Creating sales/rentals, managing listings, approving meetups |
| **Buyer** | `buyer@umindanao.edu.ph` | `password` | Browsing items, requesting transactions, uploading payment proof |
| **Renter** | `renter@umindanao.edu.ph` | `password` | Testing rental duration, viewing return due dates |
| **Student** | `student@umindanao.edu.ph` | `password` | General student account with baseline activity |

---

## 5. Strategic Questions to Ask Your Professor

Asking proactive, forward-looking questions demonstrates engineering maturity and invites the panel to guide your project rather than critique it:

### Question 1: Institutional Single Sign-On (SSO)
> *"Professor, for our next deployment phase, would you recommend integrating directly with the UM Student Portal / AIMS via institutional OAuth/SAML SSO, or is university email domain validation (`@umindanao.edu.ph`) with Supabase Auth sufficient for campus security standards?"*
* **Why ask this:** Shows you are already thinking about institutional scaling and enterprise authentication.

### Question 2: Rental Security & Overdue Management
> *"Currently, our rental module tracks return due dates and notifies both parties. In your view, should the platform introduce a digital security deposit system (escrow hold), or is a campus honor-code/reputation rating system preferable for academic items?"*
* **Why ask this:** Highlights your awareness of operational risks in peer-to-peer sharing economies.

### Question 3: Designated Campus Safety Zones
> *"We currently allow students to freely specify meetup locations within campus. Would you recommend that future iterations restrict meetup points to a curated list of monitored campus zones (such as the Library Front Desk, Student Pavilion, or Department Faculty Offices)?"*
* **Why ask this:** Proves that student physical safety was considered in the product design.

### Question 4: Automated Moderation & Trust Scores
> *"Right now, all student listings require manual admin review before going live. Do you think we should maintain 100% manual review, or implement a reputation-based auto-approval threshold for students with high feedback ratings?"*
* **Why ask this:** Demonstrates your understanding of operational bottlenecks in moderation.

---

## 6. Defense Day Emergency Quick-Reference

If something unexpected happens during the presentation, use these quick terminal commands:

- **Fastest local restart (no tunnel lag):**
  ```bash
  cd /Users/iancoronia/Downloads/UM-PASA-main/UM-Pasa-Expo
  npx expo start
  ```
- **Reload the app instantly on device/simulator:**
  Press **`r`** in the terminal running Expo.
- **Run verification checks:**
  ```bash
  npm run typecheck    # Verifies TypeScript has 0 errors
  npx expo-doctor      # Confirms all 21 health checks pass
  ```
- **If Wi-Fi blocks LAN peer-to-peer between phone and Mac:**
  Switch to tunnel mode as a backup:
  ```bash
  npx expo start --tunnel
  ```
