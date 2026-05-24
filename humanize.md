Build a production-ready responsive web application called "HumanizeAI" — an AI content humanizer platform that rewrites AI-generated text into natural human-like writing.

Goal:
Create a lightweight, fast, SEO-friendly SaaS tool website with premium modern UI/UX.

Tech stack:
Frontend:
- Vanilla HTML5
- Vanilla CSS3
- Vanilla JavaScript
Backend:
- Node.js + Express.js
Database:
- SQLite
AI Provider:
- OpenRouter API
Default model:
- qwen/qwen3-4b:free
Deployment ready:
- Render/Vercel compatible

Core features:
1. Hero section with strong CTA:
   headline: "Humanize AI Text Instantly"
   subheadline: "Turn robotic AI writing into natural human content in seconds."
   primary CTA: "Humanize Now"

2. Main tool area:
   - left textarea: "Paste AI text here"
   - right textarea: "Humanized output"
   - live word counter
   - character counter
   - copy button
   - clear button
   - download txt button

3. Humanization controls:
   dropdown modes:
   - Standard
   - Academic
   - SEO
   - Professional
   - Casual

4. Tone slider:
   0–100
   labels:
   More Natural ←→ More Professional

5. Human score cards:
   show:
   - AI Score (%)
   - Human Score (%)
   - Readability Score
   animated progress bars

6. Compare section:
   side-by-side diff highlighting

7. Pricing section:
   Free / Pro / API

8. FAQ section

9. Footer:
   SEO links
   privacy
   terms

Backend requirements:
Create endpoint:
POST /api/humanize

Input:
{
 "text":"..."
}

Prompt sent to OpenRouter:
"Rewrite naturally. Preserve meaning. Remove AI patterns. Vary sentence lengths. Use contractions. Improve readability."

Return:
{
 "originalScore": 82,
 "humanScore": 24,
 "output":"..."
}

Design requirements:
Style:
- minimal
- premium
- modern SaaS
- clean whitespace
- elegant

Color palette:
Primary: #2563EB
Accent: #10B981
Background: #F9FAFB
Text dark: #111827

Typography:
- Inter font
- bold modern headings
- readable body

UI:
- rounded-xl cards
- soft shadows
- glassmorphism on hero section
- smooth hover animations
- subtle gradients
- loading shimmer
- responsive mobile-first

UX:
- instant feedback
- disable button while loading
- loading spinner: "Humanizing..."
- success toast on copy
- error handling

SEO:
Title:
"Free AI Humanizer Tool | Humanize AI Text Online"

Meta description:
"Convert AI-generated content into natural human writing instantly with our free AI Humanizer tool."

Create:
robots.txt
sitemap.xml
schema markup

Performance:
- lazy load assets
- optimized JS
- lighthouse score >90

Security:
- sanitize inputs
- rate limiting
- environment variables for API keys

Folder structure:
client/
server/
public/
routes/
controllers/
services/

Include:
complete frontend
complete backend
OpenRouter integration
clean reusable code
production-ready setup