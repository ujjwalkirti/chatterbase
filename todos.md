# ChatterBase - Safety, Legal Compliance & Production Readiness TODOs

This document serves as an actionable operational and technical checklist to ensure ongoing legal safe harbor protection, regulatory compliance (India IT Act 2000, Intermediary Guidelines 2021, and global standards), and platform abuse prevention prior to and during public deployment.

---

## ⚖️ 1. Legal & Regulatory Compliance (Safe Harbor Prerequisites)

- [ ] **Configure Designated Grievance Email Inbox**
  - Set up `grievance@chatterbase.app` (or configure an email alias/forwarding rule to your direct email) as declared in [terms/page.tsx](file:///d:/personal-projects/chatterbase/frontend/app/terms/page.tsx).
  - Test inbound delivery to ensure takedown requests or DMCA notices never bounce.

- [ ] **Notice-and-Takedown Standard Operating Procedure (SOP)**
  - Establish a formal workflow to review grievance emails within **24 to 36 hours** as mandated by Rule 3(1)(d) of the Indian Intermediary Guidelines.
  - Action items when a valid government or court takedown notice is received:
    1. Identify the flagged message ID, room ID, and sender ID in PostgreSQL.
    2. Remove or disable public access to the content immediately.
    3. Document the takedown timestamp and ticket details for audit records.

- [ ] **Log Retention & CERT-In Cybersecurity Compliance**
  - Verify that PostgreSQL `users` (`ip_address`, `device_details`, `created_at`) and `messages` (`created_at`) are backed up and retained for at least **180 days** to comply with Indian cybersecurity (CERT-In) guidelines.
  - Ensure log purging scripts do not delete forensic connection logs prematurely.

- [ ] **Law Enforcement Assistance Protocol**
  - Define a standard procedure for responding to formal Section 91 CrPC (or equivalent court/police) notices:
    - Verify the request originates from an authentic law enforcement official email domain (`@gov.in`, `@nic.in`, or official police domain).
    - Provide only the requested log snippets (IP address, timestamps, device details) under legal requisition.

- [ ] **Privacy Policy Page (`/privacy`)**
  - Create a companion Privacy Policy page explaining:
    - Technical data collected (IP address, user agent, browser type, device type) for fraud and abuse prevention.
    - Zero sale of personal user data to third parties.
    - Retention periods for chat history and connection logs.

---

## 🛡️ 2. Platform Moderation & Abuse Prevention

- [ ] **Chat UI "Report Message" Action**
  - Add a flag/report icon on hover in [IndividualMessageBox.tsx](file:///d:/personal-projects/chatterbase/frontend/components/chatrooms/IndividualMessageBox.tsx) allowing users to report offensive or illegal messages directly.
  - Store reports in a `reports` table in PostgreSQL with message ID, reporter ID, and reason.

- [ ] **Admin Moderation Tools & Content Takedown API**
  - Create a protected admin endpoint (`DELETE /api/admin/messages/:id`) to delete illicit messages and broadcast a Socket.IO `message-deleted` event to remove it from live clients.
  - Implement an IP / User banning mechanism (`POST /api/admin/ban`) that invalidates active guest Redis locks and blocks subsequent registrations from that IP address.

- [ ] **Automated Keyword & Flooding Filters**
  - Add basic server-side text sanitization in `chatroom/model.go` to flag or mask overt harassment, hate speech, or malicious links.
  - Implement Socket.IO message rate-limiting (e.g., maximum 5 messages per 3 seconds per socket) to prevent script flooding or Denial-of-Service spam in chatrooms.

---

## 🔒 3. Production Infrastructure & Security Hardening

- [ ] **Production Environment Mode (`GIN_MODE=release`)**
  - Ensure Go backend runs with `GIN_MODE=release` in production so detailed internal stack traces and database errors are never leaked in HTTP responses.

- [ ] **HTTPS and Secure WebSockets (WSS)**
  - Enforce SSL/TLS certificates (via Caddy, Nginx reverse proxy, or Cloudflare) in front of Next.js (`3000`) and the Go backend (`8000`).
  - Upgrade WebSocket connections to `wss://` to prevent man-in-the-middle eavesdropping on public networks.

- [ ] **Redis Security & Network Isolation**
  - Bind Redis strictly to `127.0.0.1` or a private Docker internal network; never expose port `6379` publicly.
  - Configure a strong `requirepass` in production `redis.conf` and update `REDIS_URL`.

- [ ] **Rate-Limiting on Authentication Endpoints**
  - Add IP-based rate limiting (via Gin middleware or reverse proxy) on `/api/auth/guest-login`, `/api/auth/login-permanent`, and `/api/auth/register-permanent` to mitigate brute-force attacks and username exhaustion attacks in Redis.

- [ ] **Automated Database Backups**
  - Set up automated daily snapshots and WAL archiving for PostgreSQL `chatterbase` database.

---

## 📌 Checklist Summary for Launch Day

1. [ ] Terms & Conditions live and accessible at `https://yourdomain.com/terms`.
2. [ ] Mandatory consent checkboxes active on all registration and guest flows.
3. [ ] `grievance@yourdomain.com` active and monitored.
4. [ ] Production `.env` configured with strong `ACCESS_TOKEN_SECRET` and secure DB credentials.
5. [ ] TLS/SSL certificates installed for both HTTP and WSS.
