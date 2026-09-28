# Security Specification & Threat Model for NDA Chapter Tracker

## 1. Data Invariants
- A user's profile, subjects, chapters, daily logs, mock tests, PYQ progress, and revision queue belong entirely to that user (`request.auth.uid`).
- Non-owners cannot read, write, or list any private user collections (`users/{uid}/**`).
- Only verified users with `email_verified == true` can write study logs and mock test scores (unless testing).
- Global community statistics (`communityStats/{date}`) are read-only for all users and cannot be updated by any client; updates are strictly system-only.
- Admins (identified in an `admins` collection or via a verified email check like `forworkusage19@gmail.com`) can read all user records.

## 2. The "Dirty Dozen" Payloads (Security Violation Attack Vectors)
1. **Unauthenticated Read Attack**: A user tries to read `users/attacker_uid/mockTests/someMockId` without logging in.
2. **Identity Spoofing Attack (Write)**: An authenticated user `user_A` tries to write a mock test under `users/user_B/mockTests/mock1`.
3. **Ghost Field Mutation**: A user attempts to add an un-whitelisted parameter `isVerifiedAdmin: true` to their user profile.
4. **Invalid Mock Score Poisoning**: A user tries to save a mock test with a negative questions count (`totalQuestions: -5`).
5. **PII Exfiltration**: A regular user tries to query all user emails and full names via a blanket list query.
6. **Date Format Poisoning**: A user tries to write a daily log where the date string is 5MB in size.
7. **Bypass Verification**: A user with `email_verified == false` tries to alter database fields.
8. **Admin Self-Promotion**: A user tries to write their own admin privilege record to `/admins/user_uid`.
9. **Tampering with Terminal States**: A user attempts to change `createdAt` timestamps after document creation.
10. **System-Only Variable Poisoning**: A user attempts to update the global `communityStats/{date}` snapshot with artificial mock values.
11. **Orphaned Sub-collection Injection**: A user tries to create a chapter sub-collection document without a corresponding subject or parent.
12. **Denial of Wallet Recursion**: An attacker tries to write massive key names or highly nested sub-collections to cause resource exhaustion.

## 3. Test Cases (TDD Rules Validation)
The Firestore security rules are structured to block all 12 attack vectors instantly by matching the exact user UID, enforcing `request.auth.token.email_verified == true`, and applying `affectedKeys().hasOnly()` gates.
