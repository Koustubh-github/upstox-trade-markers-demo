STATIC TRADE MARKERS DEMO

This is a separate, standalone working copy. It does not connect to Upstox,
does not require authentication, and makes no backend/API requests.

Run:
1. Install Node.js (Node 20.19+ or Node 22.12+ recommended for Vite 8).
2. Open a terminal in this folder.
3. Run: npm install
4. Run: npm run dev
5. Open the local URL printed by Vite.

To verify a production build, run: npm run build

All candles, trade executions, execution prices, and P&L are simulated.
The candle session date follows the current date in India. Price values are
deterministic, so the demo repeats consistently apart from the session date.
