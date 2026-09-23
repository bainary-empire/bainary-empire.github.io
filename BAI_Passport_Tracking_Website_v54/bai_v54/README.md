# BAI Passport Tracking System – Member Website

This version includes the member-facing BAI passport account/application flows plus Module 2: Help Center and Enquiry Management.

## Member Help Center
- Help Center accessible from Dashboard → Contact Support.
- Knowledge Base search and category browsing.
- FAQ and Service Advisory content.
- AI Assistant that searches the local Knowledge Base first and only answers from matching published content.
- Source article link on grounded AI answers.
- Helpful / Not Helpful feedback.
- Escalation from AI chat to a formal enquiry with the chat transcript carried over.
- Direct enquiry submission without AI.
- Optional related passport application selection.
- Optional attachment with client-side type/size validation.
- Auto-generated unique Enquiry IDs.
- My Enquiries history and member-only enquiry viewing.
- Enquiry lifecycle support: Pending, Escalated, In Progress, Resolved, Closed.
- In-app support notifications when personnel reply or change an enquiry to Resolved/Closed.

## Personnel Portal
The Personnel Portal is a separate application and is not linked or exposed from the member-facing website. Authorized support personnel access it through the separate personnel website.

## Real-time enquiry updates
- Member and personnel enquiry threads check for new messages in the background every 1.5 seconds and update the open conversation without a manual page refresh.
- A browser storage event is also used when available for faster cross-tab updates.

## Prototype limitations
This is still a client-side prototype. Real email delivery, server-side authentication/authorization, production database persistence, secure file storage, and a real AI/LLM service are not connected. The AI Assistant uses a local Knowledge Base and deterministic keyword matching so it does not invent unsupported answers.


Version 52 targeted fixes: enquiry records are isolated by the internal MyBAI member identity on the member side, while the personnel portal continues to see the global enquiry queue. Enquiry IDs are generated as a persistent sequential format such as ENQ-000000001, ENQ-000000002, etc.
