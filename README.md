# RSVP Neural Reader

AI-powered speed reading engine with psycholinguistic optimisation.

**Built by [Ontos Labs](https://ontoslabs.com)**

## Features

### Free Tier
- **RSVP Engine** — Rapid Serial Visual Presentation eliminates eye movement bottleneck
- **PDF Text Extraction** — Upload any PDF, extract text client-side
- **Information Density Weighting** — Function words dim, content words brighten
- **Word Frequency Timing** — Rare words get more processing time
- **Auto-Deceleration** — Dense passages slow automatically
- **Peripheral Preview** — Next/previous word ghosts for lexical priming
- **Context Ghost** — Current sentence displayed for semantic framing
- **Filler Compression** — Strip function words for up to 40% compression
- **Chunk Mode** — 1-3 words per flash
- **Focus Mode** — Strip all UI, pure reading

### Pro Tier (BYOK — Bring Your Own Key)
- **AI Paper Analysis** — Claude identifies paper sections, generates summaries
- **Section-Aware Pacing** — Methods slow, discussion flows, abstracts fly
- **AI Summary** — Key findings distilled before you read
- **Section Picker** — Choose which sections to read

## Tech Stack

- **Next.js 16** — App Router, React Server Components
- **Vercel** — Edge deployment, serverless functions
- **pdf.js** — Client-side PDF extraction
- **Anthropic Claude** — AI analysis (BYOK only, key never stored)

## Deploy

```bash
# Clone
git clone https://github.com/ash23x/neural-reader.git
cd neural-reader

# Install
npm install

# Dev
npm run dev

# Deploy to Vercel
vercel
```

## Architecture

- Zero server-side costs on free tier (static pages)
- API route (`/api/analyze`) proxies BYOK requests to Anthropic
- User's API key travels: browser → serverless function → Anthropic → back
- Key is never stored, logged, or persisted
- Vercel Hobby tier = free hosting

## License

MIT — Ontos Labs Ltd 2026
