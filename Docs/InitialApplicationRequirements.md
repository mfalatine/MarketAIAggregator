# Market AI Aggregator — Initial Application Requirements

## 1. Overview

A single-file browser-based application that generates AI-powered daily market briefings by sending customized prompts to the Anthropic API with web search enabled. Claude searches live sources (CME FedWatch, BLS, financial news) and synthesizes a structured briefing based on user-configured topics, watchlist, and style preferences.

### Motivation / Target Output Example

The application should produce daily briefings similar to this format:

> "The official jobs report was postponed to Feb 11 due to the government shutdown — that report plus CPI on Feb 14 will be the next sentiment drivers. Fed still expected to hold in March (81% probability), with two cuts priced in for 2026."

The goal is a snapshot of the present day's most impactful events affecting the S&P 500, with controls for what type of information is gathered and how it's presented.

### Key Principles

- **100% browser-side** — no server, no backend, no Python dependencies
- **Single HTML file** — can be opened locally via double-click or hosted on Netlify/GitHub Pages
- **API key stored in localStorage** — never sent anywhere except Anthropic API as auth header
- **All config + history persisted in localStorage**
- **Portable via JSON export/import**

---

## 2. Architecture Options Considered

Four approaches were evaluated for sourcing and synthesizing market intelligence:

### Option 1: AI API with Web Search ✅ SELECTED

Use the Anthropic API with the web search tool enabled. Send a structured prompt and Claude searches, synthesizes, and returns a concise briefing.

- **Pros:** Lowest complexity, highest quality synthesis, customizable via prompt, no source maintenance
- **Cons:** API cost per call (~$0.05-0.15/run), dependent on web search quality
- **Stack:** Browser JS → Anthropic API (with web_search tool) → formatted output

### Option 2: Direct Source Scraping + AI Summary (Not Selected)

Scrape known sources (Fed calendar, BLS schedule, CME FedWatch, MarketWatch, CNBC) then feed raw data into AI for synthesis.

- **Pros:** Deterministic data sourcing, control over exactly what's checked
- **Cons:** Scraping is fragile (sites change layouts), maintenance burden, some sites block scraping
- **Stack:** Python (requests/BeautifulSoup) → raw text → Anthropic API → summary

### Option 3: Financial Data APIs + AI Summary (Not Selected)

Use structured APIs like Alpha Vantage, Finnhub, FRED API, or paid services like Polygon.io.

- **Pros:** Reliable structured data, no scraping fragility
- **Cons:** Free tiers limited, good coverage requires paid subscriptions ($20-100/mo)
- **Stack:** Python → multiple API calls → aggregate → Anthropic API → briefing

### Option 4: RSS/News Feeds + AI Filter (Not Selected)

Pull RSS feeds from Reuters, Bloomberg, CNBC, Fed announcements, then use AI to filter and rank.

- **Pros:** Low cost, feeds are stable
- **Cons:** RSS feeds are dying (Bloomberg killed theirs), limited depth
- **Stack:** Python → RSS aggregation → Anthropic API → filtered summary

**Decision:** Option 1 selected for MVP — fastest to build, lowest maintenance, synthesis quality is the actual value-add. Options 2-3 can be layered in later for deterministic data sources.

---

## 3. Hosting / Deployment Options

Three hosting approaches were evaluated:

### Option A: Netlify with Serverless Functions

Static HTML/JS frontend on Netlify, API calls routed through Netlify Functions so API key stays server-side.

```text
Browser (your-briefing.netlify.app)
    │
    ▼
Netlify Function (/api/generate)   ← API key lives here, never exposed
    │
    ▼
Anthropic API + web_search
```

- **Pros:** Accessible from any device, API key secure, free tier covers this easily
- **Cons:** Need a Netlify account, more complex deployment
- **Cost:** Netlify free tier = 125K function invocations/month (you'd use ~30)

### Option B: 100% Browser-Side ✅ SELECTED

Everything runs in the browser. API key stored in localStorage, calls go directly from browser to Anthropic.

```text
Browser (open index.html locally OR host anywhere)
    │
    ▼  (direct fetch from browser JS)
Anthropic API + web_search
```

- **Pros:** Zero infrastructure, works as a local HTML file or hosted anywhere, no server needed
- **Cons:** API key is in the browser (fine for single user, not for sharing)
- **Storage:** All config + history lives in localStorage — persists across sessions

### Option C: Hybrid — Upload Config File (Not Selected)

Same as Option B but instead of localStorage, upload a JSON config file each session.

- Rejected in favor of Option B's localStorage approach with export/import for portability.

**Decision:** Option B selected — simplest possible deployment. The entire app is one HTML file that can be double-clicked locally, dropped on Netlify, or hosted on GitHub Pages. For Netlify hosting, simply deploy the single index.html as a static site (no serverless functions needed for MVP since API key is client-side).

---

## 4. Architecture — Data Flow

```text
User Config (localStorage)
    │
    ├── Topics + prompt hints
    ├── Watchlist + coverage types
    ├── Model selection
    ├── Style preferences
    ├── System prompt + user prompt template
    └── Custom instructions
    │
    ▼
Prompt Assembly ("Build Prompt" button)
    │
    ▼
Editable Text Area (optional one-time modifications)
    │
    ▼
Anthropic API Call (fetch from browser)
    │  - Model: user-selected (Sonnet or Opus)
    │  - Tools: [web_search_20250305]
    │  - System prompt: from Admin config
    │  - User prompt: from text area
    │
    ▼
Response Parsing (handle text + tool_use blocks)
    │
    ▼
Rendered Briefing (Dashboard display)
    │
    ▼
Auto-saved to History (localStorage)
```

### API Integration

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: selectedModel,
    max_tokens: styleMaxTokens,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: assembledPrompt }]
  })
});
```

---

## 5. Navigation Structure

```text
[ Dashboard ]  [ History ]  [ Settings ]  [ 🔧 Admin ]  [ 📖 Guide ]
```

---

## 6. Tab Specifications with Wireframe Layouts

### 6.1 Dashboard Tab

#### Dashboard — Wireframe Layout

```text
┌─────────────────────────────────────────────────────┐
│  GENERATE BRIEFING                                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Model: [Sonnet ▼]                               │ │
│  │                                                   │ │
│  │  [ ▶ Build Prompt ]                              │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ASSEMBLED PROMPT (editable)                      │ │
│  │  ┌───────────────────────────────────────────┐   │ │
│  │  │ Generate market briefing for Feb 7, 2026.  │   │ │
│  │  │ Cover the following topics:                │   │ │
│  │  │                                            │   │ │
│  │  │ - Fed Policy & Rate Expectations:          │   │ │
│  │  │   Include CME FedWatch probabilities,      │   │ │
│  │  │   next FOMC date, and recent Fed speaker   │   │ │
│  │  │   commentary                               │   │ │
│  │  │ - Economic Calendar & Data Releases:       │   │ │
│  │  │   List upcoming releases this week with    │   │ │
│  │  │   expected vs prior values                 │   │ │
│  │  │ - S&P 500 Technical Levels                 │   │ │
│  │  │ ...                                        │   │ │
│  │  │                                            │   │ │
│  │  │ Watchlist: NVDA, PLTR, AMD, MRVL, VST     │   │ │
│  │  │ ← you can add a ticker here on the fly     │   │ │
│  │  │                                            │   │ │
│  │  │ Style: Concise (~500 words)                │   │ │
│  │  │ ← or type "go deeper on Fed this time"     │   │ │
│  │  │                                            │   │ │
│  │  │ Focus on actionable catalysts. Distinguish │   │ │
│  │  │ confirmed data from forecasts.             │   │ │
│  │  └───────────────────────────────────────────┘   │ │
│  │                                                   │ │
│  │  [↺ Reset to Template]  [ ▶ Run Briefing ]       │ │
│  │                                                   │ │
│  │  ℹ Edits here are one-time only. To change       │ │
│  │    the template permanently, use Admin tab.       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Status: ● Searching... (3/5 topics complete)    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  📅 February 7, 2026 — Market Briefing          │ │
│  │  Model: Sonnet | Generated: 6:32 AM              │ │
│  │  Prompt: [modified from template] ← flag if      │ │
│  │          edited, click to see what was sent       │ │
│  │  ─────────────────────────────────────────────── │ │
│  │                                                   │ │
│  │  FED POLICY                                       │ │
│  │  March hold at 81% probability. Two cuts          │ │
│  │  priced for 2026. Next catalyst: ...              │ │
│  │                                                   │ │
│  │  ECONOMIC CALENDAR                                │ │
│  │  Jobs report delayed to Feb 11. CPI Feb 14.      │ │
│  │  These are the next major sentiment drivers...    │ │
│  │                                                   │ │
│  │  S&P 500 TECHNICALS                               │ │
│  │  Current: 6,025. Support: 5,980. Resistance...   │ │
│  │                                                   │ │
│  │  WATCHLIST ALERTS                                  │ │
│  │  NVDA: Earnings Feb 26, elevated IV...            │ │
│  │  PLTR: Approaching $145 trim trigger...           │ │
│  │                                                   │ │
│  │  ─────────────────────────────────────────────── │ │
│  │  Sources: CME FedWatch, BLS.gov, MarketWatch     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  [ 📋 Copy ]  [ 📄 Export HTML ]  [ 🖨 Print ]      │
└─────────────────────────────────────────────────────┘
```

#### Dashboard Flow

```text
1. Click "Build Prompt"
   → Assembles from template + active settings
   → Populates editable text area
   → No API call

2. Optionally modify the prompt
   → Add "also check AVGO today"
   → Remove a section you don't need this run
   → Change tone for this run only

3. Click "Run Briefing"
   → Sends exactly what's in the text area
   → API call made
   → Flags in history if prompt was modified

4. "Reset to Template"
   → Rebuilds from saved template, discards edits
   → No API call
```

#### 6.1.1 Generate Section

- **Model Override Dropdown** — Select Sonnet or Opus for this run (defaults to Settings default). Only affects this run, default is not changed.
- **"Build Prompt" Button** — Assembles prompt from template + active settings, populates editable text area. No API call.
- **Editable Prompt Text Area** — Shows the fully assembled prompt. User can modify before running:
  - Add a ticker on the fly ("Also cover AVGO today")
  - Shift focus ("Go deeper on Fed policy, skip techs")
  - Add context ("Note: NVDA earnings was yesterday")
  - Edits are one-time only — saved template is not affected
- **"Reset to Template" Button** — Discards edits, rebuilds from saved template. No API call.
- **"Run Briefing" Button** — Sends the prompt exactly as shown in text area to Anthropic API with web search enabled. Displays progress status.
- **Status Indicator** — Shows generation progress (e.g., "Searching... 3/5 topics complete")

#### 6.1.2 Briefing Display

- **Header** — Date, model used, generation timestamp
- **Prompt Modified Flag** — If prompt was edited from template, display "[modified from template]" with click-to-view the exact prompt sent
- **Briefing Content** — Structured sections based on enabled topics
- **Sources** — Citations from web search results
- **"Regenerate" Button** — Re-runs same prompt. New API call. Previous version preserved in History.

#### 6.1.3 Export Actions

- **"Include Settings Snapshot" Checkbox** — When checked, exports include a snapshot of the current app configuration alongside the briefing. This lets the recipient see exactly what topics were enabled, which watchlist tickers were tracked, what coverage types were active, which model and style were used, and what prompt was sent. Useful for transferring briefings to other users so they understand how the briefing was generated and can replicate the setup.
- **Copy** — Plain text to clipboard. No API call.
- **Export HTML** — Downloads styled briefing as .html file. If "Include Settings Snapshot" is checked, the exported HTML includes a collapsible "Settings Snapshot" section at the bottom showing the full configuration used. No API call.
- **Print** — Browser print dialog (save as PDF). No API call.

---

### 6.2 History Tab

#### History Tab — Wireframe Layout

```text
┌─────────────────────────────────────────────────────┐
│  BRIEFING HISTORY                    [Search 🔍]    │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Feb 7  ● Sonnet  Fed hold 81%, CPI next wk    │ │
│  │  Feb 6  ● Opus    Jobless claims spike, VIX..   │ │
│  │  Feb 5  ● Sonnet  NVDA guidance raised...       │ │
│  │  Feb 4  ● Sonnet  ISM services miss, bond...    │ │
│  │  ...                                             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  [Compare: Feb 6 vs Feb 7]  ← diff what changed     │
└─────────────────────────────────────────────────────┘
```

#### 6.2.1 Briefing List

- Chronological list of all generated briefings
- Each entry shows: date, model used (with indicator dot), one-line summary preview
- Click to view full briefing

#### 6.2.2 History Record Schema

```json
{
  "id": "uuid",
  "date": "2026-02-07",
  "model": "claude-sonnet-4-5-20250929",
  "model_label": "Sonnet",
  "prompt_sent": "Generate market briefing for...",
  "prompt_modified": true,
  "system_prompt_sent": "You are a senior macro strategist...",
  "response": "...",
  "generated_at": "2026-02-07T06:32:00",
  "style": "concise",
  "topics_enabled": ["fed_policy", "economic_calendar", "sp500_technicals"]
}
```

#### 6.2.3 Features

- **View Past Briefing** — Click entry to see full briefing + "View Prompt" to see exact prompt sent. No API call.
- **Compare** — Select two dates for side-by-side diff. Useful for tracking evolving narratives (e.g., rate cut probability shifting over a week). No API call.
- **Search** — Full-text search across all saved briefings. No API call.

---

### 6.3 Settings Tab

#### Settings Tab — Wireframe Layout

```text
┌─────────────────────────────────────────────────────┐
│  API CONFIGURATION                                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Anthropic API Key: [•••••••••••••••••] [Show]  │ │
│  │  Status: ● Connected / ○ Not Set                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  MODEL SELECTION                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Default Model:                                  │ │
│  │  ○ Sonnet  — Fast, ~$0.05/run                   │ │
│  │  ○ Opus    — Deep synthesis, ~$0.30/run          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  BRIEFING TOPICS                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Macro / Policy                                  │ │
│  │  [✓] Fed Policy    [✓] Economic Calendar         │ │
│  │  [ ] Geopolitical  [ ] Treasury/Bond             │ │
│  │                                                   │ │
│  │  Market / Technicals                              │ │
│  │  [✓] S&P 500 Techs   [✓] VIX/Sentiment          │ │
│  │  [✓] Sector Rotation  [ ] Market Breadth         │ │
│  │                                                   │ │
│  │  Company / Earnings                               │ │
│  │  [✓] Notable Earnings                            │ │
│  │  [ ] Insider Trading  [ ] IPO Calendar           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  WATCHLIST                                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Tickers: [NVDA] [PLTR] [AMD] [MRVL] [VST] [+] │ │
│  │  (click to remove, + to add)                     │ │
│  │                                                   │ │
│  │  Watchlist Coverage:                              │ │
│  │  [✓] Price-moving news for watchlist tickers     │ │
│  │  [✓] Upcoming earnings dates                     │ │
│  │  [ ] Analyst rating changes                       │ │
│  │  [ ] Options unusual activity                     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  OUTPUT PREFERENCES                                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Briefing Style:                                  │ │
│  │  ○ Concise (bullet-style, ~500 words)            │ │
│  │  ○ Standard (structured sections, ~1000 words)   │ │
│  │  ○ Deep Dive (full analysis, ~2000 words)        │ │
│  │                                                   │ │
│  │  Custom Instructions:                             │ │
│  │  ┌───────────────────────────────────────────┐   │ │
│  │  │ Focus on actionable catalysts. Distinguish │   │ │
│  │  │ confirmed data from forecasts. Include     │   │ │
│  │  │ probability estimates where available.     │   │ │
│  │  └───────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  DATA MANAGEMENT                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Settings                                         │
│  │  [Export Settings JSON]  [Import Settings JSON]  │
│  │  Includes: API key, model, topics, watchlist,    │
│  │  style, custom instructions                      │
│  │                                                   │ │
│  │  History                                          │
│  │  [Export History JSON]   [Import History JSON]    │
│  │  Includes: All past briefings with dates,        │
│  │  model used, and generated content               │
│  │                                                   │ │
│  │  Full Backup                                      │
│  │  [Export Everything]     [Import Everything]      │
│  │  Includes: Settings + History in one file         │
│  │                                                   │ │
│  │  Danger Zone                                      │
│  │  [Clear History Only]   [Reset Everything]       │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  [ Save Settings ]                                    │
└─────────────────────────────────────────────────────┘
```

#### 6.3.1 API Configuration

- **API Key Input** — Password field with show/hide toggle
- **Status Indicator** — "● Connected" / "○ Not Set"
- **Validation** — Lightweight API test call when key is entered

#### 6.3.2 Model Selection

- **Default Model** — Radio buttons for available models (managed in Admin)
  - Sonnet — Fast, ~$0.05/run
  - Opus — Deep synthesis, ~$0.30/run

#### 6.3.3 Briefing Topics

Grouped by category (categories managed in Admin). Checkboxes to enable/disable.

**Default Topics:**

| Category | Topic | Key | Default |
| -------- | ----- | --- | ------- |
| Macro / Policy | Fed Policy & Rate Expectations | fed_policy | ✓ |
| Macro / Policy | Economic Calendar & Data Releases | economic_calendar | ✓ |
| Macro / Policy | Geopolitical Events | geopolitical | ○ |
| Macro / Policy | Treasury/Bond Market | bonds | ○ |
| Market / Technicals | S&P 500 Technical Levels | sp500_technicals | ✓ |
| Market / Technicals | VIX / Sentiment Indicators | vix_sentiment | ✓ |
| Market / Technicals | Sector Rotation / Fund Flows | sector_rotation | ✓ |
| Market / Technicals | Market Breadth | market_breadth | ○ |
| Company / Earnings | Notable Earnings (upcoming & recent) | earnings_notable | ✓ |
| Company / Earnings | Insider Trading / Buybacks | insider_trading | ○ |
| Company / Earnings | IPO Calendar | ipo_calendar | ○ |

#### 6.3.4 Watchlist

- **Ticker Tags** — Click to remove, "+" to add
- **Default Watchlist:** NVDA, PLTR, AMD, MRVL, VST

#### 6.3.5 Watchlist Coverage Types

Checkboxes for what information to gather per watchlist ticker (types managed in Admin).

**Default Coverage Types:**

| Coverage Type | Default | Prompt Instruction |
| ------------- | ------- | ------------------- |
| Price-moving news | ✓ | "Breaking news likely to move share price >2% for these tickers" |
| Upcoming earnings dates | ✓ | "Next earnings date and consensus EPS estimate" |
| Analyst rating changes | ○ | "Recent analyst upgrades/downgrades and price target changes" |
| Options unusual activity | ○ | "Notable unusual options activity or volume spikes" |

#### 6.3.6 Output Preferences

- **Briefing Style** — Radio buttons for available styles (managed in Admin)
  - Concise (~500 words)
  - Standard (~1000 words)
  - Deep Dive (~2000 words)

- **Custom Instructions** — Free-text area appended to every prompt
  - Default: "Focus on actionable catalysts. Distinguish confirmed data from forecasts. Include probability estimates where available."

#### 6.3.7 Data Management

- **Export Settings JSON** — Config only, no history (~1 KB)
- **Import Settings JSON** — Overwrites current config
- **Export History JSON** — All briefings with metadata (grows over time)
- **Import History JSON** — Merges with existing, no duplicates
- **Export Everything** — Single backup file (settings + history)
- **Import Everything** — Full restore
- **Clear History Only** — Deletes all briefings, keeps settings
- **Reset Everything** — Returns to first-run state

**Export File Naming:**

```text
market-briefing-settings-YYYY-MM-DD.json    (~1 KB)
market-briefing-history-YYYY-MM-DD.json     (grows over time)
market-briefing-backup-YYYY-MM-DD.json      (both combined)
```

#### 6.3.8 First-Run Behavior

If no API key is detected on app load, automatically redirect to Settings tab with "API Key Required" banner.

---

### 6.4 Admin Tab

Admin controls **what options exist**. Settings controls **which options are active**.
Think of Admin as building the menu, Settings as ordering from it.

#### Admin Tab — Wireframe Layout

```text
┌─────────────────────────────────────────────────────┐
│  TOPIC MANAGEMENT                                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Category: [Macro / Policy ▼]                    │ │
│  │                                                   │ │
│  │  Existing Topics:                                 │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Fed Policy & Rate Expectations     [✎] [🗑] │ │ │
│  │  │  Key: fed_policy                            │ │ │
│  │  │  Prompt hint: "Include CME FedWatch         │ │ │
│  │  │  probabilities, next FOMC date, and         │ │ │
│  │  │  recent Fed speaker commentary"             │ │ │
│  │  ├─────────────────────────────────────────────┤ │ │
│  │  │ Economic Calendar & Data Releases  [✎] [🗑] │ │ │
│  │  │  Key: economic_calendar                     │ │ │
│  │  │  Prompt hint: "List upcoming releases       │ │ │
│  │  │  this week with expected vs prior values"   │ │ │
│  │  ├─────────────────────────────────────────────┤ │ │
│  │  │ Treasury/Bond Market               [✎] [🗑] │ │ │
│  │  │  Key: bonds                                 │ │ │
│  │  │  Prompt hint: "10Y yield level, curve       │ │ │
│  │  │  shape, recent auction results"             │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │                                                   │ │
│  │  [ + Add Topic ]                                  │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Category: [Macro / Policy ▼]                │ │ │
│  │  │ Display Name: [Commodities / Oil        ]   │ │ │
│  │  │ Key (auto):   commodities_oil               │ │ │
│  │  │ Prompt Hint:                                │ │ │
│  │  │ ┌───────────────────────────────────────┐   │ │ │
│  │  │ │ WTI and Brent levels, OPEC+ news,    │   │ │ │
│  │  │ │ supply disruptions, inventory data    │   │ │ │
│  │  │ └───────────────────────────────────────┘   │ │ │
│  │  │ [ Save Topic ]                              │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  CATEGORY MANAGEMENT                                  │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Existing Categories:                             │ │
│  │  [Macro / Policy      ] [✎] [🗑]  Sort: [1]     │ │
│  │  [Market / Technicals ] [✎] [🗑]  Sort: [2]     │ │
│  │  [Company / Earnings  ] [✎] [🗑]  Sort: [3]     │ │
│  │                                                   │ │
│  │  [ + Add Category ]                               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  WATCHLIST COVERAGE OPTIONS                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Manage what coverage types are available:        │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Price-moving news              [✎] [🗑]     │ │ │
│  │  │  Prompt: "Breaking news likely to move      │ │ │
│  │  │  share price >2% for these tickers"         │ │ │
│  │  ├─────────────────────────────────────────────┤ │ │
│  │  │ Upcoming earnings dates        [✎] [🗑]     │ │ │
│  │  │  Prompt: "Next earnings date and            │ │ │
│  │  │  consensus EPS estimate"                    │ │ │
│  │  ├─────────────────────────────────────────────┤ │ │
│  │  │ Analyst rating changes         [✎] [🗑]     │ │ │
│  │  ├─────────────────────────────────────────────┤ │ │
│  │  │ Options unusual activity       [✎] [🗑]     │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  [ + Add Coverage Type ]                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  PROMPT EDITOR                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  System Prompt:                                   │ │
│  │  ┌───────────────────────────────────────────┐   │ │
│  │  │ You are a senior macro strategist          │   │ │
│  │  │ preparing a daily market briefing for a    │   │ │
│  │  │ trader focused on S&P 500 and AI           │   │ │
│  │  │ infrastructure equities.                   │   │ │
│  │  │                                            │   │ │
│  │  │ Rules:                                     │   │ │
│  │  │ - Distinguish confirmed data from          │   │ │
│  │  │   forecasts/estimates                      │   │ │
│  │  │ - Include probability estimates where      │   │ │
│  │  │   available (e.g., CME FedWatch)           │   │ │
│  │  │ - Prioritize actionable catalysts          │   │ │
│  │  │ - Note source for key data points          │   │ │
│  │  │ - Flag anything that changed since         │   │ │
│  │  │   yesterday                                │   │ │
│  │  └───────────────────────────────────────────┘   │ │
│  │  [Reset to Default]                               │ │
│  │                                                   │ │
│  │  User Prompt Template:                            │ │
│  │  ┌───────────────────────────────────────────┐   │ │
│  │  │ Generate market briefing for {date}.       │   │ │
│  │  │ Cover: {enabled_topics}.                   │   │ │
│  │  │ Watchlist: {watchlist}.                    │   │ │
│  │  │ Watchlist coverage: {coverage_types}.      │   │ │
│  │  │ Style: {briefing_style}.                   │   │ │
│  │  │ {custom_instructions}                      │   │ │
│  │  └───────────────────────────────────────────┘   │ │
│  │  Available variables: {date}, {enabled_topics},   │ │
│  │  {watchlist}, {coverage_types}, {briefing_style}, │ │
│  │  {custom_instructions}, {topic_hints}             │ │
│  │  [Reset to Default]                               │ │
│  │                                                   │ │
│  │  Preview Assembled Prompt:                        │ │
│  │  [ 👁 Preview Full Prompt ]                       │ │
│  │  (Shows exactly what will be sent to the API      │ │
│  │   with current settings applied)                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  BRIEFING STYLE OPTIONS                               │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Manage available styles:                         │ │
│  │  [Concise     ] ~500 words   [✎] [🗑]           │ │
│  │  [Standard    ] ~1000 words  [✎] [🗑]           │ │
│  │  [Deep Dive   ] ~2000 words  [✎] [🗑]           │ │
│  │                                                   │ │
│  │  [ + Add Style ]                                  │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Name: [Weekend Review              ]        │ │ │
│  │  │ Word Target: [3000]                         │ │ │
│  │  │ Description: [Full week recap with          │ │ │
│  │  │  forward outlook for next week]             │ │ │
│  │  │ Max Tokens: [4000]                          │ │ │
│  │  │ [ Save Style ]                              │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  MODEL MANAGEMENT                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Available Models:                                │ │
│  │  [claude-sonnet-4-5-20250929] "Sonnet"   [✎][🗑]│ │
│  │  [claude-opus-4-6           ] "Opus"     [✎][🗑]│ │
│  │                                                   │ │
│  │  [ + Add Model ]                                  │ │
│  │  (For when Anthropic releases new models)         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 6.4.1 Topic Management

- **Category Filter Dropdown** — View topics by category
- **Existing Topics List** — Each shows:
  - Display name
  - Key (auto-generated from name)
  - Prompt hint (injected into prompt when topic is enabled)
  - Edit / Delete buttons
- **Add Topic Form:**
  - Category (dropdown)
  - Display Name (text)
  - Key (auto-generated, editable)
  - Prompt Hint (textarea — tells Claude what to search for)

#### 6.4.2 Category Management

- **Existing Categories** — Name, sort order, edit/delete
- **Add Category** — Name, sort order

**Default Categories:**

1. Macro / Policy
2. Market / Technicals
3. Company / Earnings

#### 6.4.3 Watchlist Coverage Type Management

- **Existing Types** — Name, prompt instruction, edit/delete
- **Add Coverage Type** — Name, prompt instruction

#### 6.4.4 Prompt Editor

**System Prompt** (Claude's role instructions):

```text
Default:
You are a senior macro strategist preparing a daily market briefing
for a trader focused on S&P 500 and AI infrastructure equities.

Rules:

- Distinguish confirmed data from forecasts/estimates
- Include probability estimates where available (e.g., CME FedWatch)
- Prioritize actionable catalysts
- Note source for key data points
- Flag anything that changed since yesterday
```

- Editable textarea
- "Reset to Default" button

**User Prompt Template** (message structure):

```text
Default:
Generate market briefing for {date}.
Cover the following topics:
{enabled_topics}
Watchlist: {watchlist}
Watchlist coverage: {coverage_types}
Style: {briefing_style}
{custom_instructions}
```

- Editable textarea
- Available variables: `{date}`, `{enabled_topics}`, `{watchlist}`, `{coverage_types}`, `{briefing_style}`, `{custom_instructions}`, `{topic_hints}`
- "Reset to Default" button

**Prompt Preview:**

- "Preview Full Prompt" button — Shows fully assembled prompt with all variables resolved using current settings. No API call.

#### 6.4.5 Briefing Style Management

- **Existing Styles** — Name, word target, max_tokens, edit/delete
- **Add Style Form:**
  - Name (text)
  - Word Target (number)
  - Description (text)
  - Max Tokens (number)

**Default Styles:**

| Name | Word Target | Max Tokens | Description |
| ---- | ----------- | ---------- | ----------- |
| Concise | ~500 | 1000 | Bullet-style key points |
| Standard | ~1000 | 2000 | Structured sections |
| Deep Dive | ~2000 | 3000 | Full analysis |

#### 6.4.6 Model Management

- **Existing Models** — API model ID, display name, cost note, edit/delete
- **Add Model Form:**
  - API Model ID (text)
  - Display Name (text)
  - Cost Note (text)

**Default Models:**

| API Model ID | Display Name | Cost Note |
| ------------ | ------------ | --------- |
| claude-sonnet-4-5-20250929 | Sonnet | Fast, ~$0.05/run |
| claude-opus-4-6 | Opus | Deep synthesis, ~$0.30/run |

---

### 6.5 User Guide Tab

Static HTML reference tab. No API calls, no dynamic content.

#### Quick Nav

```text
[Getting Started] [Dashboard] [History] [Settings] [Admin] [Data & Backup] [Troubleshooting] [Cost Reference]
```

#### 6.5.1 Getting Started

This app generates AI-powered daily market briefings by sending a customized prompt to the Anthropic API with web search enabled. Claude searches live sources (CME FedWatch, BLS, financial news) and synthesizes a briefing based on your selected topics, watchlist, and style preferences.

Everything runs in your browser. Your API key and settings are stored in localStorage — nothing is sent anywhere except the Anthropic API when you click "Run Briefing."

**First-time setup:**

1. Go to Settings → enter your Anthropic API key
2. Select your default model, topics, and watchlist
3. Go to Dashboard → Build Prompt → Run Briefing

#### 6.5.2 Dashboard

**Build Prompt** — Assembles a prompt from your saved template, enabled topics (with their prompt hints), watchlist, coverage types, and style setting. The result appears in an editable text area.
→ No API call is made. Nothing is sent yet.

**Edit the Prompt (optional)** — You can modify the assembled prompt before running. Examples of useful one-time edits:

- Add a ticker: "Also cover AVGO today"
- Shift focus: "Go deeper on Fed policy, skip techs"
- Add context: "Note: NVDA earnings was yesterday"
→ Edits are one-time only. The saved template is not affected. Use Admin to change permanently.

**Reset to Template** — Discards any manual edits and rebuilds the prompt from your saved template and current settings.
→ No API call. Just resets the text area.

**Run Briefing** — Sends the prompt (exactly as shown in the text area) to the Anthropic API with web search enabled. Claude will:

1. Search the web for each requested topic
2. Synthesize findings into your chosen style
3. Return a structured briefing
→ API call is made. Cost depends on model chosen.
→ Result is displayed and auto-saved to History.
→ If the prompt was edited, it's flagged as "modified from template" in the history record.

**Model Override** — The dropdown on Dashboard lets you override the default model for a single run. Use Sonnet for daily briefings, switch to Opus for deeper weekend reviews or pre-FOMC analysis.
→ Only affects this run. Default is not changed.

**Regenerate** — Re-runs the same prompt. Useful if web search returned stale or incomplete results.
→ New API call. New result replaces current display but previous version remains in History.

#### Copy / Export HTML / Print

- Copy: Plain text to clipboard
- Export HTML: Downloads styled briefing as .html
- Print: Browser print dialog (save as PDF)
→ No API calls. Local actions only.

#### 6.5.3 History

Every generated briefing is automatically saved with its date, model used, the exact prompt sent, whether the prompt was modified, and the full response.

**View Past Briefing** — Click any entry to see the full briefing. Click "View Prompt" to see exactly what was sent.
→ No API call. Reading from local storage.

**Compare** — Select two dates to see a side-by-side diff of what changed between briefings — useful for tracking evolving narratives (e.g., rate cut probability shifting over a week).
→ No API call. Local comparison only.

**Search** — Full-text search across all saved briefings. Find when a topic was first mentioned or track how a narrative developed.
→ No API call. Local search only.

#### 6.5.4 Settings

**API Key** — Your Anthropic API key. Stored in browser localStorage only — never sent anywhere except the Anthropic API as an auth header. Validated with a lightweight test call when entered.
→ One small API call on validation only.

**Default Model** — Sets which model is pre-selected on Dashboard. Can always be overridden per-run.

**Topics** — Toggle which topics are included when "Build Prompt" is clicked. Each topic has a prompt hint (editable in Admin) that tells Claude what to search for.
→ Changing topics does not trigger any API call. Takes effect next time you build a prompt.

**Watchlist** — Your tracked tickers. These are injected into the prompt so Claude specifically searches for news and data about these symbols.

**Watchlist Coverage** — What type of information to gather for watchlist tickers (news, earnings dates, analyst changes, etc.). Each type adds a line to the prompt.

**Output Style** — Controls response length and depth. Affects the max_tokens sent to the API and the style instruction in the prompt.

**Custom Instructions** — Free-text that gets appended to every prompt. Use for persistent preferences like "always include probability estimates" or "flag anything that contradicts consensus."

#### 6.5.5 Admin

Admin controls WHAT OPTIONS EXIST. Settings controls WHICH OPTIONS ARE ACTIVE. Think of Admin as building the menu, Settings as ordering from it.

**Topic Management** — Add, edit, or remove topics. Each topic has:

- Display name (shown in Settings checkboxes)
- Category (grouping in the UI)
- Prompt hint (injected into the prompt when this topic is enabled — this is what tells Claude what to actually search for)
→ No API call. Changes appear in Settings immediately.

**Category Management** — Add or rename topic groupings. Controls how topics are organized in the Settings tab. Sort order controls display sequence.

**Watchlist Coverage Types** — Define what types of coverage are available for watchlist tickers. Each type has a prompt instruction that tells Claude what to look for.
Example: "Analyst rating changes" → prompt: "Recent analyst upgrades/downgrades and PT changes"

**Prompt Editor** — Direct access to the system prompt (Claude's role instructions) and user prompt template (the message structure). Variables like {date}, {enabled_topics}, {watchlist} are auto-replaced when "Build Prompt" is clicked on Dashboard.

⚠ The system prompt defines Claude's persona and rules. Edit carefully — bad system prompts produce bad briefings. Use "Reset to Default" if things go sideways.

**Prompt Preview** — Shows the fully assembled prompt with all variables resolved using current settings. Use this to verify your template + settings produce the prompt you expect before going to Dashboard.
→ No API call. Preview only.

**Briefing Styles** — Add custom styles beyond the defaults. Each has a name, word target, description, and max_tokens.
Example: "Weekend Review" at 3000 words for a full week recap.

**Model Management** — Add new models as Anthropic releases them. Each entry has the API model ID, display name, and cost note. Existing models can be edited or removed.

#### 6.5.6 Data & Backup

All data lives in your browser's localStorage. Clearing browser data will erase everything. Use exports to protect your data.

| Action | What It Does |
| ------ | ------------ |
| Export Settings | Config only, no history |
| Import Settings | Overwrites current config |
| Export History | All briefings as JSON |
| Import History | Merges with existing (no dupes) |
| Export Everything | Single backup file |
| Import Everything | Full restore |

**Moving to a new browser/machine:**

1. Export Everything from old browser
2. Open app in new browser
3. Import Everything → fully restored

#### 6.5.7 Troubleshooting

**"API key invalid"** — Check key at <https://console.anthropic.com>. Ensure it starts with "sk-ant-". Keys are project-scoped — make sure the key has Messages API access.

**Briefing is vague or missing data:**

- Check prompt hints in Admin — vague hints produce vague results
- Try Opus for deeper synthesis
- Add specific instructions in the editable prompt like "search CME FedWatch specifically"
- Web search can miss recent events — try Regenerate

**Briefing is too long / too short** — Adjust the style in Settings or edit max_tokens for the style in Admin.

**Response cut off mid-sentence** — max_tokens too low for the chosen style. Go to Admin → Briefing Styles → increase max_tokens.

**"Rate limited"** — You've hit Anthropic's API rate limit. Wait a minute and try again. This is rare with single daily briefings.

#### 6.5.8 Cost Reference

Costs are per-run and depend on model + response length + number of web searches performed:

| Configuration | Estimated Cost |
| -------------- | --------------- |
| Sonnet + Concise | ~$0.03–0.05 |
| Sonnet + Standard | ~$0.05–0.10 |
| Sonnet + Deep Dive | ~$0.10–0.15 |
| Opus + Concise | ~$0.15–0.25 |
| Opus + Standard | ~$0.25–0.40 |
| Opus + Deep Dive | ~$0.40–0.60 |
| Daily Sonnet/Standard | ~$2–3/month |
| Daily Opus/Standard | ~$8–12/month |

Check usage at <https://console.anthropic.com/usage>.

---

## 7. Data Storage Schema

### 7.1 localStorage Keys

| Key | Contents |
| --- | -------- |
| `mb_api_key` | Anthropic API key |
| `mb_settings` | Active config (default model, enabled topics, watchlist, active coverage types, active style, custom instructions) |
| `mb_admin` | Admin config (all topics, categories, coverage types, styles, models, system prompt, user prompt template) |
| `mb_history` | Array of briefing records |

### 7.2 Settings Object

```json
{
  "default_model": "claude-sonnet-4-5-20250929",
  "enabled_topics": ["fed_policy", "economic_calendar", "sp500_technicals", "vix_sentiment", "sector_rotation", "earnings_notable"],
  "watchlist": ["NVDA", "PLTR", "AMD", "MRVL", "VST"],
  "enabled_coverage": ["price_moving_news", "upcoming_earnings"],
  "active_style": "concise",
  "custom_instructions": "Focus on actionable catalysts. Distinguish confirmed data from forecasts. Include probability estimates where available."
}
```

### 7.3 Admin Object

```json
{
  "categories": [
    { "id": "macro_policy", "name": "Macro / Policy", "sort": 1 },
    { "id": "market_technicals", "name": "Market / Technicals", "sort": 2 },
    { "id": "company_earnings", "name": "Company / Earnings", "sort": 3 }
  ],
  "topics": [
    {
      "id": "fed_policy",
      "name": "Fed Policy & Rate Expectations",
      "category": "macro_policy",
      "prompt_hint": "Include CME FedWatch probabilities, next FOMC date, and recent Fed speaker commentary"
    },
    {
      "id": "economic_calendar",
      "name": "Economic Calendar & Data Releases",
      "category": "macro_policy",
      "prompt_hint": "List upcoming releases this week with expected vs prior values"
    },
    {
      "id": "geopolitical",
      "name": "Geopolitical Events",
      "category": "macro_policy",
      "prompt_hint": "Major geopolitical developments affecting global markets"
    },
    {
      "id": "bonds",
      "name": "Treasury/Bond Market",
      "category": "macro_policy",
      "prompt_hint": "10Y yield level, yield curve shape, recent auction results"
    },
    {
      "id": "sp500_technicals",
      "name": "S&P 500 Technical Levels",
      "category": "market_technicals",
      "prompt_hint": "Current level, key support/resistance, moving averages, recent breakouts or breakdowns"
    },
    {
      "id": "vix_sentiment",
      "name": "VIX / Sentiment Indicators",
      "category": "market_technicals",
      "prompt_hint": "VIX level and trend, put/call ratio, AAII sentiment survey, fear/greed index"
    },
    {
      "id": "sector_rotation",
      "name": "Sector Rotation / Fund Flows",
      "category": "market_technicals",
      "prompt_hint": "Leading/lagging sectors, notable ETF inflows/outflows, rotation trends"
    },
    {
      "id": "market_breadth",
      "name": "Market Breadth",
      "category": "market_technicals",
      "prompt_hint": "Advance/decline ratio, new highs vs new lows, percentage of stocks above 200-day MA"
    },
    {
      "id": "earnings_notable",
      "name": "Notable Earnings (upcoming & recent)",
      "category": "company_earnings",
      "prompt_hint": "Major earnings reports this week with consensus estimates and recent notable beats/misses"
    },
    {
      "id": "insider_trading",
      "name": "Insider Trading / Buybacks",
      "category": "company_earnings",
      "prompt_hint": "Notable insider buys/sells and major corporate buyback announcements"
    },
    {
      "id": "ipo_calendar",
      "name": "IPO Calendar",
      "category": "company_earnings",
      "prompt_hint": "Upcoming IPOs and recent IPO performance"
    }
  ],
  "coverage_types": [
    {
      "id": "price_moving_news",
      "name": "Price-moving news",
      "prompt": "Breaking news likely to move share price >2% for these tickers"
    },
    {
      "id": "upcoming_earnings",
      "name": "Upcoming earnings dates",
      "prompt": "Next earnings date and consensus EPS estimate"
    },
    {
      "id": "analyst_ratings",
      "name": "Analyst rating changes",
      "prompt": "Recent analyst upgrades/downgrades and price target changes"
    },
    {
      "id": "options_unusual",
      "name": "Options unusual activity",
      "prompt": "Notable unusual options activity or volume spikes"
    }
  ],
  "styles": [
    {
      "id": "concise",
      "name": "Concise",
      "word_target": 500,
      "max_tokens": 1000,
      "description": "Bullet-style key points"
    },
    {
      "id": "standard",
      "name": "Standard",
      "word_target": 1000,
      "max_tokens": 2000,
      "description": "Structured sections"
    },
    {
      "id": "deep_dive",
      "name": "Deep Dive",
      "word_target": 2000,
      "max_tokens": 3000,
      "description": "Full analysis"
    }
  ],
  "models": [
    {
      "id": "claude-sonnet-4-5-20250929",
      "name": "Sonnet",
      "cost_note": "Fast, ~$0.05/run"
    },
    {
      "id": "claude-opus-4-6",
      "name": "Opus",
      "cost_note": "Deep synthesis, ~$0.30/run"
    }
  ],
  "system_prompt": "You are a senior macro strategist preparing a daily market briefing for a trader focused on S&P 500 and AI infrastructure equities.\n\nRules:\n- Distinguish confirmed data from forecasts/estimates\n- Include probability estimates where available (e.g., CME FedWatch)\n- Prioritize actionable catalysts\n- Note source for key data points\n- Flag anything that changed since yesterday",
  "user_prompt_template": "Generate market briefing for {date}.\nCover the following topics:\n{enabled_topics}\nWatchlist: {watchlist}\nWatchlist coverage: {coverage_types}\nStyle: {briefing_style}\n{custom_instructions}",
  "defaults": {
    "system_prompt": "You are a senior macro strategist preparing a daily market briefing for a trader focused on S&P 500 and AI infrastructure equities.\n\nRules:\n- Distinguish confirmed data from forecasts/estimates\n- Include probability estimates where available (e.g., CME FedWatch)\n- Prioritize actionable catalysts\n- Note source for key data points\n- Flag anything that changed since yesterday",
    "user_prompt_template": "Generate market briefing for {date}.\nCover the following topics:\n{enabled_topics}\nWatchlist: {watchlist}\nWatchlist coverage: {coverage_types}\nStyle: {briefing_style}\n{custom_instructions}"
  }
}
```

---

## 8. Technical Requirements

### 8.1 Stack

- **Single HTML file** with embedded CSS and JavaScript
- **No frameworks** — vanilla JS, no React/Vue/npm
- **No server** — runs entirely in browser
- **localStorage** for persistence
- **fetch()** for API calls directly to Anthropic

### 8.2 API Requirements

- Anthropic API key with Messages API access
- Web search tool: `web_search_20250305`
- CORS: Requires `anthropic-dangerous-direct-browser-access: true` header
- API version: `2023-06-01`

### 8.3 Response Parsing

API responses include mixed content blocks (text + tool_use for web search). The app must:

1. Iterate through `response.content` array
2. Extract all `type: "text"` blocks
3. Concatenate text blocks into final briefing
4. Optionally extract search citations from tool_use results

### 8.4 Browser Compatibility

- Modern browsers (Chrome, Firefox, Edge, Safari)
- localStorage support required
- fetch() API required

### 8.5 Deployment Options

- **Local:** Double-click index.html to open in browser
- **Netlify:** Deploy as static site (drag-and-drop index.html)
- **GitHub Pages:** Push to repo, enable Pages
- All three work identically — no server-side code needed

---

## 9. First-Run Experience

1. App opens → checks localStorage for `mb_api_key`
2. No key found → redirects to Settings tab
3. "API Key Required" banner displayed
4. User enters key → validated with lightweight API call
5. User configures topics, watchlist, style
6. Save → redirects to Dashboard, ready to generate
7. Default Admin config auto-populated with all default topics, categories, styles, models, and prompts

---

## 10. File Structure

Although the app is a single HTML file, the logical structure is:

```text
MarketAIAggregator/
├── index.html              # The entire application
├── Docs/
│   └── InitialApplicationRequirements.md  # This document
```

---

## 11. Future Considerations (Not in MVP)

- Scheduled generation (Service Worker or browser alarm API)
- Email delivery via SMTP or third-party service
- Comparison analytics (trend charting across briefings)
- Multiple watchlist profiles
- Dark/light theme toggle
- Token usage tracking and cost history
