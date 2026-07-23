# G2b — Bind team invites to an email address (F4 hardening)

Security review finding **F4** (`docs/review/04-biztonsag.md`): a team invite was a pure
bearer token — anyone who obtained the link could join with the invite's role, and the token
leaked through URLs / browser history without being bound to an intended addressee.

## Change summary

- **Migration** `supabase/migrations/20260720121100_invite_email_binding.sql`
  - `team_invites.invited_email TEXT` (NULLABLE — legacy pending invites stay valid as bearer invites).
  - `redeem_team_invite(p_token)`: after the used/expired checks, if `invited_email IS NOT NULL`
    and it differs (case-insensitively) from the caller's `auth.users.email`, `RAISE 'invite_wrong_email'`.
    Signature unchanged; `out_team_id/out_role/out_team_name` names preserved (42702 ambiguity fix).
  - `get_invite_by_token(p_token)`: DROP + CREATE to extend `RETURNS TABLE` with `invited_email`.
  - REVOKE/GRANT re-issued for both functions.
- **`src/components/TeamMembersPanel.jsx`**: required `Meghívott e-mail címe` (type=email) field above
  the role select; insert includes `invited_email` (trimmed, lowercased); generate button disabled
  until a valid-looking email; pending-invites list shows the email.
- **`src/pages/JoinTeam.jsx`**: confirm screen shows `A meghívó ehhez az e-mail címhez kötött: X`;
  `invite_wrong_email` mapped to the Hungarian message; on the confirm screen a client-side
  case-insensitive mismatch (from the `session` prop) replaces the Csatlakozás button with that
  same message (server still enforces).

## Verification (live)

### 1. Migration applied + signatures

```
ALTER TABLE / CREATE FUNCTION x2 / DROP / REVOKE+GRANT x2  — all OK
\d team_invites            → invited_email text (nullable) present
get_invite_by_token result → TABLE(..., team_name text, invited_email text)   ✅ new column
redeem_team_invite result  → TABLE(out_team_id uuid, out_role text, out_team_name text)  ✅ preserved
```

### 2. Live RPC test (user `teszt.fitness1@gmail.com`, team `37a4ab72-…f08f1`)

Test invite inserted via superuser psql: token `7d6c9148…02c5`, `invited_email='masvalaki@example.com'`, role `physiotherapist`.

**a) Wrong email — get + redeem**
```
get_invite_by_token → [{ ... "invited_email":"masvalaki@example.com" }]        ✅ returns email
redeem_team_invite  → {"code":"P0001","message":"invite_wrong_email"}          ✅ REJECTED
```

**b) Matching email** — updated `invited_email='teszt.fitness1@gmail.com'` via psql, re-redeemed:
```
redeem_team_invite  → [{"out_team_id":"37a4ab72-…","out_role":"physiotherapist",
                        "out_team_name":"Teszt Csapat"}]                        ✅ email check PASSES
```
User was already a member → `ON CONFLICT DO NOTHING`: membership row unchanged
(`aae9e753-… / fitness_coach / joined 2026-07-20 17:16:37`, verified before & after — identical).
Invite marked `used_at`. Behaviour as designed.

**c) Backward compat — NULL email (legacy bearer)** — inserted invite with `invited_email=NULL`
(token `b78698fd…dfe5`), redeemed live as the same user:
```
redeem_team_invite  → [{"out_team_id":"37a4ab72-…","out_role":"physiotherapist", ...}]   ✅ SUCCEEDS
```
NULL email path skips the email check → legacy bearer invites keep working. (Tested LIVE, not reasoned.)

### 3. Cleanup

```sql
DELETE FROM public.team_invites
 WHERE token IN ('7d6c914842023d03ef3c2f829ada02c5','b78698fd0892e04ea10a49fdc43cdfe5');
-- DELETE 2
SELECT count(*) FROM public.team_invites WHERE token IN (…same two…);   -- → 0 leftover
```
`team_members` for this user unchanged after cleanup (still `fitness_coach`, original `joined_at`,
single row). Zero leftover test rows.

### 4. Build & tests

- `npm run build` → clean (`✓ built in 12.90s`).
- `npm test` → **64 passed (7 files)**. No failures. (The `kaboom` console output is the
  ErrorBoundary test's intentional throw, not a failure.)
