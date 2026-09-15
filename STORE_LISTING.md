# Play Store listing

**App name:** Smart Attendance Manager

**Short description (max 80 chars):**
Mark attendance, manage classes and holidays, download monthly reports.

**Full description:**
Smart Attendance Manager helps teachers and lecturers keep daily attendance in one
simple place. Create a college for each academic year, add branches, add students by
hand or from an Excel/CSV sheet, and create subjects with course start and end dates.

Mark a student present or absent with a single tap, view the full schedule for any
date range, see holidays, and download the attendance register as a spreadsheet.
Monthly percentage reports are calculated for you.

Features:
- Colleges separated by academic year
- Branches with shared student lists
- Add students manually or import from Excel/CSV
- Subjects with course schedules
- One-tap present/absent marking
- Holiday list
- Monthly percentage reports and spreadsheet download
- Secure sign-in with email code verification

**Package / application ID:** com.smartattendance.app

**App icon:** `public/app-icon.png` (1024x1024 PNG)

**Category:** Education

**Build steps (Capacitor):**
1. Export the project to GitHub and clone it locally.
2. `npm install && npm i @capacitor/core @capacitor/cli @capacitor/android`
3. `npx cap add android`
4. `npm run build && npx cap sync android`
5. `npx cap open android`, then build a signed AAB in Android Studio and upload it.
