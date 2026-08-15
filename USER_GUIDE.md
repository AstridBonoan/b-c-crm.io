# How to use the B&C CRM

Internal operating system for **B&C Software & Web**. Astrid and Charlie both have full access. This is not a customer portal — clients never log in.

Word meanings live in [TERMINOLOGY.md](./TERMINOLOGY.md). This guide is the day-to-day playbook.

When a new screen or workflow is added, update this file in the same change (and `TERMINOLOGY.md` if new terms appear).

---

## Who this is for

| Person | Usual lane |
| --- | --- |
| Astrid (Founder & CTO) | Product, delivery, technical work |
| Charlie (Co-Founder & CMO) | Outreach, pipeline, relationships |

Titles are ownership hints only. Either of you can edit any record.

---

## The one rule that matters

Prospecting and selling are two different jobs.

| Area | What it is for |
| --- | --- |
| **Lead Finder** | Find local businesses. Hunt list. |
| **Leads** | First contact and outreach history. |
| **Pipeline** | Real opportunities with dollar value and stages. |
| **Clients / Projects** | Companies you work with and the work you deliver. |
| **Finance** | Invoices, recorded payments, and balances. |

Updating outreach on a lead **does not** move a pipeline card. A deal appears only when you click **Add opportunity** or **Add deal**.

---

## End-to-end workflow

Typical path from a cold search to a finished job:

```
1. Lead Finder     Search a city/industry. Open a business.
2. Log outreach    First call/email on the prospect page.
                   That creates a Lead. The name drops off
                   the default Finder list.
3. Leads inbox     Keep following up. Status stays here.
4. Add opportunity When you are actually selling something,
                   put them on the Pipeline.
5. Pipeline        Drag the deal through stages.
                   Log meetings. Create proposals. Add tasks.
6. Won             Client becomes Active. A Project is created.
7. Project         Do the work. Attach notes, files, tasks.
8. Finance         Create an invoice (optionally prefill from the won deal).
                   Share/print it. When the client pays outside the CRM,
                   record the payment. Status and balance update.
```

You can skip Finder if someone emails you: create a **Lead** (or **Client**) by hand, then **Add opportunity** when it is a real deal.

---

## Step by step

### 1. Sign in

Open the app, sign in with your allowlisted email. You land on **Dashboard**. After logout, Lead Finder starts blank until you search again in that session.

### 2. Find businesses (Lead Finder)

1. Open **Lead Finder**.
2. Enter industry and city/borough (and optional state, zip, radius, website filter).
3. Run the search. Results save as prospects.
4. Use filters (website, outreach, sort). **Show already in Leads** includes names that already became CRM leads. **All searches** shows every saved prospect; **This search only** returns to the current search.
5. Open a row for details. **Log outreach** (method, result, follow-up, notes).
6. First outreach creates a **Lead** and links it. You stay on the prospect page; a notice says they were added to Leads.
7. Trash deletes the prospect from Finder only. It does not delete the CRM lead.

Do not treat Finder as the sales board.

### 3. Work the inbox (Leads)

1. Open **Leads**.
2. Update outreach status: New → Reached out → Following up → Became client / Not pursuing.
3. When you are selling a specific service and price, click **Add opportunity**. That copies company, service, source, value, notes, and follow-up onto a deal and opens **Pipeline**. It will not create a second deal for the same lead.
4. **Make client** creates (or links) the company in **Clients** without requiring a won deal.

### 4. Sell (Pipeline)

1. Open **Pipeline**. Same deals also appear as a table under **Deals**.
2. Drag cards between columns, or **Edit** the deal.
3. **Open** a card for the deal workspace: timeline, meetings, proposals, and quick tasks.
4. Overdue / Today / Upcoming at the top of Pipeline come from deal follow-up dates and deal-linked tasks.

Stages: New opportunity → In conversation → Interested → Meeting booked → Proposal sent → Negotiating → Won / Closed lost.

Probability fills in from the stage unless you override it.

**Meetings:** log from **Meetings** or from the deal. Multiple meetings per deal. This is sales conversation, not first-touch outreach.

**Proposals:** create from **Proposals** or from the deal. Client, contact, service, and amount prefill. Status Draft / Sent / Accepted / Rejected / Expired. “Sent” does **not** email anyone. You can optionally move the deal to Proposal sent. **Mark deal won** is a button after Accepted — it is never automatic.

### 5. Close (Won)

When a deal is **Won** and a client is linked:

- Linked lead status becomes converted (Became client).
- Client becomes **Active**.
- A **Project** is created from the deal name, value, and service if one does not already exist.

Closed lost does not create a project.

### 6. Deliver (Projects)

Open **Projects**. Update status and progress. Attach tasks, notes, and documents. Completed projects stay as history.

### 7. Bill and collect (Finance)

1. Open **Invoices** → **Create invoice**. Pick client and project. Optionally **Prefill from won deal**.
2. Add line items. Totals calculate from quantity × price, minus discount, plus tax.
3. Save as Draft or Issue now (Unpaid).
4. Open the invoice → **Download PDF** (saves to this device so you can attach it in Gmail yourself), **Print**, or **Copy summary**. Payment options on the invoice come from **Finance → Settings**. Clicking a PayPal/Venmo/etc. link does **not** mark it paid. The CRM does not send email.
5. When the client pays outside the CRM, **Record payment** (full or partial). Status becomes Partially Paid or Paid. Overdue is automatic after the due date if a balance remains.
6. **Delete** removes an invoice that has no recorded payments (draft, unpaid, overdue, or cancelled). **Cancel invoice** keeps the record in history but stops payment. Invoices with payments cannot be deleted.
7. **Finance** dashboard shows billed, paid, outstanding, overdue, and recent payments. Client and Project rows have a **Finance** button for that record’s summary.

Winning a deal does **not** auto-create an invoice.

**Payment links are not on Create invoice.** Set them once for the company:

1. Open **Finance** → **Settings** (`/finance/settings`).
2. For each method (PayPal, Venmo, Cash App, Zelle, etc.), turn on **Show on invoices**.
3. Fill **Payment URL / link**, username, email/phone, and instructions as needed. Save.
4. Those options appear at the bottom of every invoice **view** (and print). Clicking a link does not mark the invoice paid.

If Payment options are missing on an invoice, the methods are still off or empty in Settings.

---

## What each page is for

| Page | What it consists of | How to use it |
| --- | --- | --- |
| **Dashboard** | Metric cards, recent activity, upcoming tasks | Morning snapshot. Click a card to jump to that module. Definitions: [TERMINOLOGY.md](./TERMINOLOGY.md). |
| **Lead Finder** | Search form, prospect table, outreach on the detail page | Hunt. Log first contact. |
| **Leads** | Inbox table, outreach status, Add opportunity, Make client | Follow-up until it is a real sale or you stop. |
| **Clients** | Company/person records, type, status, Finance summary | The account you work with. **Finance** opens billed/paid/outstanding. |
| **Contacts** | People at a client | Always belong to a client. |
| **Pipeline** | Kanban board, totals, follow-up buckets, deal workspace | Move money through stages. |
| **Deals** | Table of the same deals (search, stage, client filters) | List view when the board is too busy. |
| **Meetings** | Sales meetings linked to deals | Discovery, follow-up, presentation, outcome. |
| **Proposals** | Lightweight quotes linked to deals | Track draft vs sent vs accepted. No Stripe. |
| **Projects** | Delivery work | After win, or create by hand. **Finance** shows invoices for that project. |
| **Finance** | Dashboard: billed, paid, outstanding, overdue, due soon, recent payments | Company money snapshot. **Settings** holds PayPal/Venmo/etc. links shown on all invoices. |
| **Invoices** | Invoice table, create/edit, print view, payment history | Issue invoices. **Download PDF** to this device, then attach it in Gmail yourself. Record payments after you confirm them. **Delete** unpaid invoices; **Cancel** keeps them in history. |
| **Payments** | List of recorded payments | Jump to the related invoice. |
| **Tasks** | To-dos with due date, priority, status | Link to client, deal, or project when you can. |
| **Activities** | Chronological interaction log | Shared history. Deal timeline reuses this. |
| **Notes** | Internal text attached to a record | Preferences, caveats, next steps. |
| **Documents** | Private file uploads | Proposals PDFs, contracts, briefs. Link to a client/deal/project. |
| **Search** | Global search across modules | Type a name; open a hit to jump there. |
| **Analytics** | Charts (stages, value, leads, projects, sources) | Trends after you have data. |
| **Team** | Founder names and roles | Soft ownership. Both can still edit everything. |

---

## Daily habits

**Charlie (sales)**

1. Dashboard — overdue follow-ups, upcoming meetings, open proposals.
2. Lead Finder or Leads — new outreach.
3. Pipeline — move deals, log meetings, send (status) proposals.
4. Tasks — clear Today / Overdue.

**Astrid (delivery)**

1. Dashboard — active projects, current project revenue.
2. Projects — status and due dates.
3. Tasks / Notes / Documents on the project or client.

---

## What this system does not do

- It does not email prospects or send invoices by Gmail. Download the PDF and attach it yourself.
- It does not charge cards or connect to Stripe, PayPal, Venmo, Cash App, or Zelle APIs.
- Payment methods on invoices are instructions/links only.
- It does not score leads with AI.
- It does not auto-create deals from a first call or invoices from a won deal.
- It does not give customers a login.
- It is not a full accounting/payroll system.

---

## If something looks empty

- Dashboard zeros usually mean there is no matching data yet.
- Meetings / Proposals / Upcoming meetings stay empty until those tables exist in Supabase (`20260815180000_deal_meetings_proposals.sql`) and you log records.
- Lead Finder is blank after a fresh sign-in until you search.
