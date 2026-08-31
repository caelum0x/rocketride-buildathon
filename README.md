# RocketRide × SCU Buildathon — entries

Two apps built on [RocketRide](https://rocketride.org) staging for the
RocketRide × Santa Clara University Buildathon (Aug 31 – Sep 6 2026). Both solve
a specific problem for a specific person and are built to be handed to one real
user — the bar the Buildathon judges on.

Built on the RocketRide engine ([`rocketride-org/rocketride-server`](https://github.com/rocketride-org/rocketride-server)),
each app is a Studio micro-frontend (`apps/<name>-ui/`) driving a `.pipe` pipeline,
authored against the engine's real pipeline rules and shell/SDK contracts.

## Apps

### 📚 [Study Pack](./studypack) — lecture → exam-ready study pack
Paste a lecture (transcript, notes, or a **photo of the slides**) → structured
summary, key concepts, detailed notes, practice questions + answer key.
Real user: a classmate. Multi-modal pipeline (`webhook → parse → {text, image→ocr}
→ question → prompt → llm → response_answers`); OpenAI + free Ollama variant.
- App: [`studypack/apps/studypack-ui`](./studypack/apps/studypack-ui) · Pipeline: [`studypack.pipe`](./studypack/studypack.pipe)
- Submission: [`studypack/SUBMISSION.md`](./studypack/SUBMISSION.md)

### 🧾 [Receipt Desk](./receiptdesk) — receipts → categorized expense sheet
Photograph or paste receipts → OCR → a categorized expense table
(`Date | Merchant | Category | Description | Amount | Currency`) + per-category
totals, downloadable. Real user: a small/family-business owner.
- App: [`receiptdesk/apps/receiptdesk-ui`](./receiptdesk/apps/receiptdesk-ui) · Pipeline: [`receiptdesk.pipe`](./receiptdesk/receiptdesk.pipe)
- Submission: [`receiptdesk/SUBMISSION.md`](./receiptdesk/SUBMISSION.md)

## Layout

```
studypack/      Study Pack app + pipeline + check.py + sample + SUBMISSION.md
receiptdesk/    Receipt Desk app + pipeline + check.py + samples + SUBMISSION.md
engine/         (gitignored) local clone of rocketride-server — build base
examples/       (gitignored) local clone of awesome-rocketride
workshops/      (gitignored) local clone of rocketride-workshops
```

The `engine/`, `examples/`, and `workshops/` directories are local clones of the
upstream RocketRide repos, kept out of this repo (see `.gitignore`).

## Deploy (per app)

Each app's README has the full handoff. Summary: install the staging VSIX, sign in
to `staging.rocketride.ai`, redeem the promo code, claim your developer ID, create
the app (`studypack` / `receiptdesk`), drop in `apps/<name>-ui/src/*` + the `.pipe`,
set a model key, run `python check.py`, then Deploy → publish → get one real user.

Toolchain: **pnpm** (never npm).
