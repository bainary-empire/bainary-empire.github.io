# BAI Personnel Portal

Separate personnel-only prototype for managing member enquiries and the Knowledge Base. It is intentionally not linked from the member-facing website.

Prototype access:
- Use the **Personnel Demo Login** button on the sign-in page for quick demo access.
- The original demo credentials (`support@bai.local` / `BAI-support`) also remain valid.

For production use, replace the demo browser-side login with server-side authentication, role-based authorization, secure sessions, and a shared backend/API.

Real-time enquiry updates:
- The open enquiry thread and queue refresh automatically in the background every 1.5 seconds when new member messages or status changes are detected.

Closed enquiry behavior: once an enquiry is Closed, the personnel detail view becomes view-only. Reply controls and status-change controls are removed/disabled, and the reply handler also rejects attempts to reply to a Closed enquiry.
