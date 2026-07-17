# CSV to Dashboard

Convert a CSV file into charts using AI-generated chart configs and DuckDB queries.

## What It Does

- Upload a CSV and ask a question.
- AI returns chart suggestions (with one query per chart).
- App runs each query in DuckDB and renders charts.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```env
HUGGINGFACE_TOKEN=your_token_here
PORT=8080
CORS_ORIGIN=http://localhost:5173
```

3. Run backend (terminal 1):

```bash
npm run server
```

4. Run frontend (terminal 2):

```bash
npm run dev
```

5. Open app: `http://localhost:5173`

## Main Commands

```bash
npm run dev
npm run server
npm run build
npm run lint
```

## Response Shape (Simplified)

```json
{
  "data": [
    {
      "chart_type": "BarChart",
      "title": "...",
      "subtitle": "...",
      "x_axis": "...",
      "value_axis": "...",
      "query": "SELECT ...",
      "reasoning": "..."
    }
  ],
  "query": "fallback first chart query"
}
```

## Notes

- Query is generated per chart.
- Backticks are removed from queries.
- `cumulative_agg(...)` is not allowed.
- If query uses aliases (`AS ...`), axes should match query output column names.
