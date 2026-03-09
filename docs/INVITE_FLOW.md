# Invite flow – how the invitee gets and uses an invite

## Summary

**No email is sent to the invitee.** The invite is stored in the backend under the invitee’s email. The invitee must open the app and **sign in (or sign up) with that same email**; the app then finds the pending invite and joins them to the family automatically.

---

## 1. Inviter sends the invite

- In **Settings**, inviter enters the invitee’s email (e.g. `partner@example.com`) and taps **Invite**.
- Backend stores:
  - `invite:email:partner@example.com` → invite id
  - `invite:<inviteId>` → invite object (familyId, email, status: `"pending"`, etc.)
- Toast: *“Invitation sent! Ask them to sign in with that email.”*

---

## 2. How the invitee “gets” the invite

- The app **does not send an email** to the invitee.
- The inviter should tell the invitee out of band, e.g.:
  - *“I’ve added you to the baby tracker – open the app and sign in with partner@example.com.”*
- The invite is “received” only when the invitee uses the app with that email.

---

## 3. What the invitee does

1. Open the BabyTracker app.
2. On the **Login** screen:
   - If they don’t have an account: **Sign up** with the **exact email** they were invited with (e.g. `partner@example.com`) and a password.
   - If they already have an account: **Sign in** with that same email and password.
3. After sign-in, the app:
   - Calls **GET /family** → no family yet → `null`.
   - Calls **GET /family/invites** (backend looks up by the **signed-in user’s email**).
   - If there is a pending invite for that email, backend returns it.
   - App automatically calls **POST /family/accept-invite** with that invite id.
   - Backend adds the user to the family and links `user:<userId>:family` → `familyId`.
   - App sets `familyId` in context; the invitee is now in the same family and sees shared data.

---

## 4. Backend behavior (reference)

| Step | Endpoint | What happens |
|------|----------|----------------|
| Send invite | `POST /family/invite` | Store invite by `invite:email:<email>` and `invite:<inviteId>`. |
| Load invites | `GET /family/invites` | Uses JWT to get current user’s email, returns pending invite for that email. |
| Accept | `POST /family/accept-invite` | Adds user to family members, sets `user:<userId>:family` → familyId, marks invite accepted. |

---

## 5. Important details

- **Email must match exactly** (including case; backend uses lowercase).
- **One pending invite per email**: sending a new invite to the same email overwrites the previous one (same key `invite:email:<email>`).
- **Invitee must use the app**: they must sign in (or sign up) in this app with that email; the invite is not sent by email and is not a link.

---

## 6. If "App finds invite and accepts it" doesn't work

- **Backend must persist invites**  
  Invites are stored in the same KV table as families. If the Edge Function uses in-memory storage, the invite exists only on the instance that handled "Invite"; when the invitee signs in they may hit another instance and see no invite. Deploy the **DB-backed** server (see `docs/SUPABASE_SETUP.md`) so the `invite:email:...` and `invite:...` keys are stored in the table.

- **Same email**  
  The invitee must sign in with the **exact same email** the inviter entered (case doesn't matter; both are lowercased). If they use a different address or the account has no email, no invite is found.

- **"Check for invites" on Dashboard**  
  If the invitee is logged in but has no family, the Dashboard shows a banner and a **"Check for invites"** button. They can tap it to run the invite check again (GET /family/invites then accept if one is found).

- **Network / path**  
  Ensure `GET /family/invites` and `POST /family/accept-invite` are reachable (no 404). In the browser Network tab, confirm the invites request returns 200 and a JSON body with an `invites` array when there is a pending invite.

---

## 7. Optional improvement: email notifications

To actually notify the invitee by email you would need to add an email provider (e.g. Resend, SendGrid) and call it from the Edge Function after `POST /family/invite`, sending a message like “You’ve been invited to join a family in BabyTracker – sign in with this email to join.” That is not implemented today; the flow above is “invite by email address, invitee signs in with that email.”
