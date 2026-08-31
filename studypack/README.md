# Study Pack — RocketRide × SCU Buildathon entry

**One line:** paste a lecture (transcript / notes / slides) → get a structured study
pack (summary, key concepts, detailed notes, practice questions + answer key).

**Who it's for:** university students studying for an exam. Your **real user** is a
classmate — the whole hackathon is judged on *one real person who is not you using it
and coming back*.

## What's in this folder

| File | What it is | Confidence |
|---|---|---|
| `studypack.pipe` | The RocketRide pipeline (multi-modal): `webhook → parse → {text, image→ocr} → question → prompt → llm_openai → response_answers`. OCR branch means photographed slides / scanned PDFs work, not just text. | ✅ ground-truth |
| `studypack-ollama.pipe` | Same pipeline, free local-model path — `llm_ollama` (`custom` profile, `${ROCKETRIDE_OLLAMA_BASE}`, llama3.1:8b). Deploy this instead if you don't want a provider bill. | ✅ ground-truth |
| `check.py` | One real end-to-end run (the guide's recommended `check` script). Sends `sample_lecture.txt` through the pipeline and asserts the study pack has all sections. | ✅ ground-truth |
| `sample_lecture.txt` | A real sample input (information-diffusion lecture). | ✅ |
| `.env.example` | Env for the check script + pipeline (`ROCKETRIDE_*`). | ✅ |
| `apps/studypack-ui/` | The Studio app UI the extension deploys to staging. | see its top-of-file notes for the one integration point to confirm |

## The pipeline (why it's wired this way)

Every lane transition matches the engine's documented transformations
(`tags→parse→text`, `text→question→questions`, `questions→prompt→questions`,
`questions→llm→answers`). The `prompt_1` node carries the Study Pack system
instruction. The `response_answers_1` node uses **default** config, so the answer
comes back under the standard `answers` key.

**Model:** the `llm_openai_1` node reads `${ROCKETRIDE_OPENAI_KEY}`. Your RocketRide
credits do **not** cover model providers — bring your own OpenAI key, or swap the node
to `llm_ollama` to run a local model for free (see `.env.example`).

---

## Your steps (browser / OAuth — cannot be automated)

Do these on `staging.rocketride.ai`, following the official setup guide + video.
An agent can do the file edits and pipeline runs; these are the parts that are yours.

1. **Discord + account.** Join `https://discord.gg/PMXrtenMsY`, create your account at
   `https://staging.rocketride.ai`.
2. **Install the staging client.** Download the VSIX from
   `https://staging.rocketride.ai/client/vscode`, remove any existing RocketRide
   extension, `Install from VSIX…`, reload VS Code.
3. **Point at staging.** Connection settings → Cloud → *Use custom server* →
   `https://staging.rocketride.ai` → sign in (OAuth) → **Save**.
4. **Redeem credits.** On the staging landing page, *Have a promo code?* →
   `INDIAHACK` → Redeem.
5. **Claim your developer ID (once, on a scratch app).** Monitor → Apps → **+ New app**
   → Full screen → name it `scratch` → Create App → Deploy tab → **Register** your
   developer ID (letters + underscores only, e.g. `arhan_sb`). This fixes the
   namespace for every future app.
6. **Create the real app.** Monitor → Apps → **+ New app** → Full screen → App name
   `studypack`, Display name `Study Pack` → Create App. Confirm the Identity block now
   reads `‹yourDevId›.studypack`.
7. **Drop in the code.** Copy the contents of `apps/studypack-ui/src/` into the
   generated `apps/studypack-ui/src/`, and copy `studypack.pipe` into the app (the
   Design/Package tab shows where it expects the `.pipe`). Set `"authenticated": false`
   in the app's `package.json` if it isn't already (avoids the shell sign-in wall
   inside the webview).
   - If your app id is still `local.studypack` (created before you registered), rename
     it in **two** places: `appManifest.id` in `package.json` **and** the `id` field in
     `src/AppDescriptor.ts`.
8. **Set your model key.** Add `ROCKETRIDE_OPENAI_KEY` in the workspace `.env`
   (or run `pnpm exec rocketride login` if the client reports "No authorization").
9. **Verify before deploy.** Package tab → Readiness all green. Run the check:
   `cd` into this folder, `cp .env.example .env`, fill it in, then `python check.py`
   (or `uv run python check.py`). You want it to print a full study pack and `OK`.
10. **Deploy + publish.** Deploy tab → **+ Deploy** → publish to **@me** (test) then
    **@team**. Open `staging.rocketride.ai`, launch the tile, confirm it runs the
    deployed build (close the App Builder panel first so the dev overlay doesn't mask
    the published version).
11. **Get your real user.** Send it to one classmate with a real lecture. Watch them
    use it. Ask: *would you pay for this? why / why not?* That answer + who used it is
    the core of the submission.
12. **Submit.** Google Form releases **Sep 4**; deadline **Sep 6**. Include: the
    published app id + version + launch link, who it's for (one sentence), your real
    user and what they said, a 60-sec video/live link, and the honest would-you-pay
    answer.

## Toolchain note
RocketRide uses **pnpm** (never npm) and the app runs under the pinned toolchain.
`pnpm install` at the app root; the extension manages the watch/preview loop.
