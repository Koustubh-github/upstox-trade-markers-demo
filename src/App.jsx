import { useEffect, useMemo, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import mockCandles from "./mockCandles.js";
import "./App.css";

const LOT_SIZE = 65;
const INSTRUMENT = "NIFTY 22,850 PE";

// Trade candle indexes are fixed, so the demo is repeatable every day.
// The execution price is deterministically placed inside each selected candle body.
const tradeSeeds = [
  { id: 1, candleIndex: 2, side: "BUY", lots: 1, ratio: 0.35 },
  { id: 2, candleIndex: 6, side: "BUY", lots: 2, ratio: 0.60 },
  { id: 3, candleIndex: 10, side: "BUY", lots: 1, ratio: 0.45 },
  { id: 4, candleIndex: 18, side: "SELL", lots: 1, ratio: 0.70 },
  { id: 5, candleIndex: 24, side: "BUY", lots: 1, ratio: 0.30 },
  { id: 6, candleIndex: 32, side: "BUY", lots: 2, ratio: 0.55 },
  { id: 7, candleIndex: 40, side: "SELL", lots: 2, ratio: 0.50 },
];

function makeTrades(candles) {
  return tradeSeeds.map((seed) => {
    const candle = candles[seed.candleIndex];
    const price = Number(
      (candle.open + (candle.close - candle.open) * seed.ratio).toFixed(2)
    );
    const date = new Date(candle.time * 1000);
    return {
      ...seed,
      time: candle.time,
      price,
      quantity: seed.lots * LOT_SIZE,
      option: INSTRUMENT,
      orderTime: new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date),
    };
  });
}

function calculatePosition(trades) {
  let openQuantity = 0;
  let invested = 0;
  let realizedPnL = 0;

  for (const trade of trades) {
    if (trade.side === "BUY") {
      openQuantity += trade.quantity;
      invested += trade.price * trade.quantity;
    } else if (trade.side === "SELL" && openQuantity > 0) {
      const sellQuantity = Math.min(trade.quantity, openQuantity);
      const averageEntry = invested / openQuantity;
      realizedPnL += (trade.price - averageEntry) * sellQuantity;
      invested -= averageEntry * sellQuantity;
      openQuantity -= sellQuantity;
    }
  }

  return {
    openQuantity,
    averageEntry: openQuantity ? invested / openQuantity : 0,
    realizedPnL,
  };
}

function App() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markerElementsRef = useRef([]);
  const showTradesRef = useRef(true);
  const visibleTradesRef = useRef([]);
  const [showTrades, setShowTrades] = useState(true);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const trades = useMemo(() => makeTrades(mockCandles), []);
  const position = useMemo(() => calculatePosition(trades), [trades]);
  const visibleTrades = showAllTrades ? trades : trades.slice(-4);
  showTradesRef.current = showTrades;
  visibleTradesRef.current = visibleTrades;
  const currentPrice = mockCandles[mockCandles.length - 1].close;
  const sessionDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(mockCandles[0].time * 1000));

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 600,
      layout: {
        background: { color: "#0b0f14" },
        textColor: "#d1d5db",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        // Format horizontal-axis labels in IST, matching the hover tooltip.
        tickMarkFormatter: (time) =>
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(Number(time) * 1000)),
      },
      crosshair: { mode: 0 },
      localization: {
        timeFormatter: (time) =>
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(Number(time) * 1000)),
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: true,
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    series.setData(mockCandles);
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth > 0) {
        chart.applyOptions({ width: container.clientWidth });
      }
    });
    resizeObserver.observe(container);

    let frameId;
    const syncMarkers = () => {
      const activeChart = chartRef.current;
      const activeSeries = seriesRef.current;
      if (activeChart && activeSeries) {
        markerElementsRef.current.forEach(({ marker, line, label, trade }) => {
          const x = activeChart.timeScale().timeToCoordinate(trade.time);
          const y = activeSeries.priceToCoordinate(trade.price);
          const visible = showTradesRef.current &&
            visibleTradesRef.current.some((t) => t.id === trade.id);
          if (x == null || y == null || !visible) {
            marker.style.display = "none";
            line.style.display = "none";
            label.style.display = "none";
            return;
          }
          marker.style.display = "flex";
          line.style.display = "block";
          label.style.display = "flex";
          marker.style.left = `${x}px`;
          marker.style.top = `${y}px`;
          line.style.left = `${x + 15}px`;
          line.style.top = `${y}px`;
          line.style.width = `max(0px, calc(100% - ${x + 15}px - 62px))`;
          label.style.top = `${y}px`;
        });
      }
      frameId = requestAnimationFrame(syncMarkers);
    };
    frameId = requestAnimationFrame(syncMarkers);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      markerElementsRef.current.forEach(({ marker, line, label }) => {
        marker.remove();
        line.remove();
        label.remove();
      });
      markerElementsRef.current = [];
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartRef.current) return;

    markerElementsRef.current.forEach(({ marker, line, label }) => {
      marker.remove();
      line.remove();
      label.remove();
    });
    markerElementsRef.current = [];

    trades.forEach((trade) => {
      const marker = document.createElement("button");
      marker.className = `trade-marker ${trade.side === "BUY" ? "buy-marker" : "sell-marker"}`;
      marker.textContent = String(trade.lots);
      marker.title = `${trade.side} · ${trade.lots} lot${trade.lots > 1 ? "s" : ""} · ₹${trade.price.toFixed(2)}`;
      marker.setAttribute("aria-label", `${trade.side} trade at ₹${trade.price.toFixed(2)}`);
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedTrade(trade);
      });

      const line = document.createElement("div");
      line.className = "execution-line";
      const label = document.createElement("div");
      label.className = `trade-price-label ${trade.side === "BUY" ? "buy-price-label" : "sell-price-label"}`;
      label.textContent = `₹${trade.price.toFixed(2)}`;

      container.appendChild(line);
      container.appendChild(label);
      container.appendChild(marker);
      markerElementsRef.current.push({ marker, line, label, trade });
    });

    return () => {
      markerElementsRef.current.forEach(({ marker, line, label }) => {
        marker.remove();
        line.remove();
        label.remove();
      });
      markerElementsRef.current = [];
    };
  }, [trades]);

  return (
    <div className="app">
      <header className="header">
        <div className="instrument">
          <h1>{INSTRUMENT}</h1>
          <p>{sessionDate} · 5m · Option Premium · SIMULATED DATA</p>
        </div>
        <div className="current-price">₹{currentPrice.toFixed(2)}</div>
      </header>

      <section className="position-bar">
        <div className="position-item">
          <span>Open Position</span>
          <strong>{position.openQuantity} Qty</strong>
        </div>
        <div className="position-item">
          <span>Average Entry</span>
          <strong>₹{position.averageEntry.toFixed(2)}</strong>
        </div>
        <div className="position-item">
          <span>Realized P&amp;L (demo)</span>
          <strong className={position.realizedPnL >= 0 ? "profit" : "loss"}>
            ₹{position.realizedPnL.toFixed(2)}
          </strong>
        </div>
      </section>

      <main className="main-area">
        <section className="chart-section">
          <div className="chart-toolbar">
            <div className="toolbar-title">
              {trades.length} simulated executions
              <span className="recent-label">
                · Showing {showAllTrades ? "all 7" : "latest 4"}
              </span>
            </div>
            <div className="toolbar-actions">
              <button className="recent-button" onClick={() => setShowHelp((v) => !v)}>
                How to read
              </button>
              <a
                className="recent-button prd-toolbar-button"
                href="ADDLINK"
                target="_blank"
                rel="noopener noreferrer"
              >
                View PRD ↗
              </a>
              {showTrades && (
                <button className="recent-button" onClick={() => setShowAllTrades((v) => !v)}>
                  {showAllTrades ? "Show recent 4" : "Show all"}
                </button>
              )}
              <label className="toggle">
                <span>Show trades</span>
                <input
                  type="checkbox"
                  checked={showTrades}
                  onChange={(event) => setShowTrades(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="chart-wrap">
            {showHelp && (
              <div className="help-popover">
                <div className="help-title">
                  <strong>How to read the chart</strong>
                  <button onClick={() => setShowHelp(false)} aria-label="Close help">×</button>
                </div>
                <p><strong>🟢 Buy · 🔴 Sell</strong> — execution markers.</p>
                <p><strong>Number</strong> — lots in the execution.</p>
                <p><strong>Dotted line</strong> — execution price.</p>
                <p><strong>Executions shown</strong> — total executions versus the ones currently displayed.</p>
                <p className="help-disclaimer">All candles, trades, prices, and P&amp;L are simulated. No Upstox account or live market data is connected.</p>
              </div>
            )}
            <div ref={chartContainerRef} className="chart-container" />
          </div>

          <div className="demo-notice">
            Static demo · All market data and executions are simulated · No API calls
          </div>
        </section>

        {selectedTrade && (
          <aside className="trade-details-panel">
            <div className="details-header">
              <div>
                <span className={`side ${selectedTrade.side === "BUY" ? "buy" : "sell"}`}>
                  {selectedTrade.side}
                </span>
                <h2>{selectedTrade.option}</h2>
              </div>
              <button className="close-button" onClick={() => setSelectedTrade(null)} aria-label="Close trade details">
                ×
              </button>
            </div>
            <div className="execution-price">₹{selectedTrade.price.toFixed(2)}</div>
            <div className="detail-grid">
              <div><span>Lots</span><strong>{selectedTrade.lots}</strong></div>
              <div><span>Quantity</span><strong>{selectedTrade.quantity}</strong></div>
              <div><span>Execution Time</span><strong>{selectedTrade.orderTime}</strong></div>
              <div>
                <span>Demo Realized P&amp;L</span>
                <strong className={position.realizedPnL >= 0 ? "profit" : "loss"}>
                  ₹{position.realizedPnL.toFixed(2)}
                </strong>
              </div>
            </div>
          </aside>
        )}
      </main>

      <div className="legend">
        <div><span className="buy-dot" /> BUY</div>
        <div><span className="sell-dot" /> SELL</div>
      </div>
    </div>
  );
}

export default App;
