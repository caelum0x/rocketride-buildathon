# Receipt Desk — RocketRide × SCU Buildathon entry #2

**One line:** photograph or paste your receipts → get a categorized expense sheet
(table + per-category totals) you can drop into your books.

**Who it's for:** a small/family business owner who does expenses by hand every month
— the club treasurer, the food truck, the freelancer. Your **real user** is one such
person you know. (This is one of the Buildathon's own suggested winning ideas.)

## What's in this folder

| File | What it is |
|---|---|
| `receiptdesk.pipe` | Multi-modal pipeline: `webhook → parse → {text, image→ocr} → question → prompt → llm_openai → response_answers`. OCR turns receipt photos into text; the LLM extracts a structured expense table. |
| `check.py` | One real end-to-end run — sends `sample_receipts.txt`, asserts a table + summary come back. |
| `sample_receipts.txt` | Four realistic sample receipts (coffee, office supplies, Uber, Zoom). |
| `.env.example` | Env for the check script + pipeline (`ROCKETRIDE_*`). |
| `apps/receiptdesk-ui/` | The Studio app the extension deploys to staging (mirrors the proven Study Pack UI). |

## How it works

Same webhook pipeline shape as Study Pack, so the invocation is identical
(`client.use → send()/sendFiles() → defensive extract of the answers lane`). The
`prompt_1` node holds the bookkeeping instruction: extract each receipt into a
`| Date | Merchant | Category | Description | Amount | Currency |` table using a fixed
category set, never invent values, ISO dates, then a per-category + grand total
summary. Output is Markdown so it renders in-app and downloads as `expenses.md`.

**Model:** `llm_openai_1` reads `${ROCKETRIDE_OPENAI_KEY}` — bring your own key (credits
don't cover providers). Swap to `llm_ollama` for the free path if you prefer (see the
Study Pack `studypack-ollama.pipe` for the exact node config to copy).

## Deploy (same as Study Pack)

Follow `../studypack/README.md` — the steps are identical; just use app name
`receiptdesk` / display name "Receipt Desk", and copy this folder's
`apps/receiptdesk-ui/src/*` + `receiptdesk.pipe` into the extension-generated app.
Verify with `cp .env.example .env`, fill it, then `python check.py` (want an expense
table + `OK`). Then Deploy → publish @me/@team, and put it in front of one real
small-business owner with their actual receipts.
