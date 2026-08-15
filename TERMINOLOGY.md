# B&C CRM terminology

Internal glossary for the Sales/Marketing + Business Operating System. Use these meanings in the product, training, and dashboard.

The three sales layers stay separate:

1. **Lead Finder** — hunt list (prospects from search).
2. **Leads** — inbox after first contact.
3. **Pipeline** — deal board (opportunities). **Make client** / won deals feed **Clients**.

Changing outreach on a lead does **not** move a pipeline card. A deal is created only when someone adds a deal or uses **Add opportunity**.

---

## Dashboard metrics

### Leads inbox

| Term | Meaning |
| --- | --- |
| **New leads** | Leads whose outreach status is still New. Not pipeline cards. |
| **Active opportunities** | Open leads still in play: New, Reached out, or Following up. Converted and Not pursuing are excluded. Despite the name, this is the Leads inbox, not the deal board. |

### Sales pipeline

| Term | Meaning |
| --- | --- |
| **Open deals** | Deal cards that are not Won or Closed lost. |
| **Weighted expected** | Open-deal value × win probability. Example: $1,500 at 50% counts as $750. |
| **Potential revenue** | Full dollar total of open deals (proposal amount if set, otherwise estimated value). Not discounted by probability. |
| **Won value** | Total of all Won deals, all time. |
| **Overdue follow-ups** | Open deals whose next follow-up date is before today. |
| **Upcoming meetings** | Sales meetings with no outcome yet whose date/time is still in the future. |
| **Open proposals** | Proposals still Draft or Sent (not accepted, rejected, or expired). |
| **Won this month** | Deals marked Won whose close date is in the current calendar month. |
| **Lost this month** | Deals marked Closed lost whose close date is in the current calendar month. |

Quick contrast:

- **Potential revenue** = full open pipeline.
- **Weighted expected** = what you might actually close.
- **Won value** = already closed.

### Clients and delivery

| Term | Meaning |
| --- | --- |
| **Active clients** | Companies with client status Active (usually after a won deal). |
| **Active projects** | Projects not finished: not started, planning, in development, or review. |
| **Completed projects** | Projects marked completed. |
| **Current project revenue** | Sum of project value on those active (not completed) projects. |

---

## Core records

| Term | Meaning |
| --- | --- |
| **Prospect** | A business found in Lead Finder. Hunt list only until outreach is logged. |
| **Lead** | Someone you are contacting. Lives on Leads. Outreach status stays here. |
| **Deal / opportunity** | A priced sales opportunity on the Pipeline board. |
| **Client** | The company record. Prospect until they become a customer; Active after win / Make client. |
| **Contact** | A person at a client. |
| **Meeting** | A sales meeting attached to a deal (not first-touch outreach). |
| **Proposal** | A lightweight quote attached to a deal. Status only; no email send or Stripe charge. |
| **Task** | A to-do, optionally linked to a client, deal, or project. |
| **Project** | Delivery work after a deal is won (or created manually). |
| **Invoice** | A bill to a client, usually for a project. Totals come from line items. **Download PDF** saves a file on this device; it does not email the client. **Delete** removes an unpaid invoice; **Cancel** keeps it in history. Paid invoices cannot be deleted. |
| **Payment** | A manually recorded receipt against an invoice (Zelle, PayPal, etc. as labels only). |
| **Payment options** | Company payment instructions/links from Finance Settings. Shown on the invoice view, not on the Create invoice form. |
| **Balance due** | Invoice total minus completed payments. Never a separate editable field. |

---

## Lead outreach statuses

Used on **Leads** only. They do not move Pipeline columns.

| Label | Meaning |
| --- | --- |
| **New** | In the inbox, not contacted yet. |
| **Reached out** | First contact logged. |
| **Following up** | Conversation in progress. |
| **Became client** | Converted (often via Make client or a won deal). |
| **Not pursuing** | Closed on the lead side. |

---

## Pipeline stages

Used on **deals** only.

1. New opportunity
2. In conversation
3. Interested
4. Meeting booked
5. Proposal sent
6. Negotiating
7. Won
8. Closed lost

**Won** (when a client is linked): lead → converted, client → active, a project is created if one does not already exist for that deal.

---

## Invoice statuses

| Label | Meaning |
| --- | --- |
| **Draft** | Not issued yet. Can be edited or deleted. |
| **Unpaid** | Issued, nothing paid, due date not passed. |
| **Partially Paid** | Some payment recorded, balance remains. |
| **Paid** | Completed payments cover the total. Never shown if a balance remains. |
| **Overdue** | Issued, unpaid or partial, due date has passed. |
| **Cancelled** | Voided. No further payments. |

---

## Workflow

```
Lead Finder  →  Lead / outreach  →  Sales pipeline
                                      ├── Deals
                                      ├── Meetings
                                      ├── Proposals
                                      ├── Tasks
                                      └── Activity
                                 →  Client  →  Project  →  Invoice  →  Payment  →  Balance
```
