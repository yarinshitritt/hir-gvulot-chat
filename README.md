# Hir Gvulot Chat – AI information assistant

> צ'אט AI שמנגיש ללוחמים ולמפקדים מידע מתוך נהלים, תוכניות הכשרה ודוחות ביצוע.

A Hebrew, mobile-friendly chat assistant that answers questions from training procedures and from Excel / Word reports uploaded by its users (for example trainee scores per group and cycle). It runs fully on Cloudflare Pages – a static front end plus serverless Functions – and uses the Google Gemini API for the language model.

## What it does

- **Chat in Hebrew (RTL)** with a system prompt that gives the model its role, answer format and domain knowledge.
- **Upload `.xlsx` / `.xls` / `.xlsm` / `.docx` files.** Workbooks are parsed with SheetJS and compacted into a table format (header once, then rows) to keep the token budget small; Word files are unzipped with `fflate` and their text extracted.
- **Cloudflare KV storage** keeps the uploaded content, so every later question can use it without re-uploading.
- **Relevance search over the uploaded files.** The question is tokenised (Hebrew stop-words removed, common one-letter prefixes such as ב/ל/מ/ו/כ/ש stripped), each file is scored by file-name and content matches, and only the best matches go into the model context – with a per-message character budget.
- **Resilience.** Automatic retries on transient `429` / `500` / `503` errors with the server-suggested delay, and an automatic fallback to a second Gemini model when the primary one runs out of quota or retries.
- **Cost protection.** A per-IP request counter in KV (auto-expiring after one hour) limits usage.

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | Vanilla HTML / CSS / JavaScript (RTL, Rubik font) |
| Back end | Cloudflare Pages Functions (`functions/api/*`) |
| Storage | Cloudflare KV (`CHAT_KV`) |
| AI | Google Gemini API |
| Parsing | SheetJS (`xlsx`), `fflate` |

## Project structure

```
index.html            chat UI
style.css             styles
functions/
  api/chat.js         chat endpoint: context selection, Gemini calls, retries, fallback, rate limit
  api/upload.js       file upload + parsing into KV
  api/prompt.js       system prompt
  _excel.js           Excel parsing / compact table format
  _docx.js            Word text extraction
wrangler.toml         Cloudflare configuration (KV binding)
```

## Run locally

```bash
npm install
npx wrangler pages dev . --kv CHAT_KV --binding GEMINI_API_KEY=<your-key>
```

For deployment, create a KV namespace, bind it as `CHAT_KV` in `wrangler.toml`, and add `GEMINI_API_KEY` as a secret in the Cloudflare Pages project settings.

## Notes

- The API key is read only from the server-side environment and is never sent to the browser.
- Built by Yarin Shitrit.
