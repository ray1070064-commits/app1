function movingAverage(values, period) {
  const p = Math.max(1, Number(period) || 1);
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i]);
    if (!Number.isFinite(value)) continue;
    sum += value;
    if (i >= p) {
      const old = Number(values[i - p]);
      if (Number.isFinite(old)) sum -= old;
    }
    if (i >= p - 1) out[i] = sum / p;
  }
  return out;
}

function ema(values, period) {
  const p = Math.max(1, Number(period) || 1);
  const alpha = 2 / (p + 1);
  const out = new Array(values.length).fill(null);
  let previous = null;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i]);
    if (!Number.isFinite(value)) continue;
    previous = previous == null ? value : (value * alpha + previous * (1 - alpha));
    out[i] = previous;
  }
  return out;
}

function rsi(values, period) {
  const p = Math.max(2, Number(period) || 14);
  const out = new Array(values.length).fill(null);
  if (values.length <= p) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= p; i += 1) {
    const diff = Number(values[i]) - Number(values[i - 1]);
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / p;
  let avgLoss = loss / p;
  out[p] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (let i = p + 1; i < values.length; i += 1) {
    const diff = Number(values[i]) - Number(values[i - 1]);
    const g = Math.max(0, diff);
    const l = Math.max(0, -diff);
    avgGain = ((avgGain * (p - 1)) + g) / p;
    avgLoss = ((avgLoss * (p - 1)) + l) / p;
    out[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return out;
}

function macd(values, fast, slow, signal) {
  const fastLine = ema(values, fast);
  const slowLine = ema(values, slow);
  const line = values.map((_, i) => {
    const a = Number(fastLine[i]);
    const b = Number(slowLine[i]);
    return Number.isFinite(a) && Number.isFinite(b) ? a - b : null;
  });
  const signalLine = ema(line, signal);
  const hist = line.map((v, i) => Number.isFinite(Number(v)) && Number.isFinite(Number(signalLine[i])) ? Number(v) - Number(signalLine[i]) : null);
  return { line, signalLine, hist };
}

export function drawMarketChart(payload, ui = {}) {
  const host = document.querySelector('.chart-box');
  if (!host) return;

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (!rows.length) {
    host.innerHTML = '<div class="chart-empty"><strong>尚無圖表資料</strong><br>價格歷史只由後端生成。</div>';
    return;
  }

  if (!window.Plotly) {
    host.innerHTML = '<div class="chart-empty">圖表元件載入失敗。</div>';
    return;
  }

  host.innerHTML = '<div id="market-candlestick" style="width:100%;height:100%;min-height:520px"></div>';
  const x = rows.map(row => row.Datetime ?? row.datetime ?? row.Date ?? row.date ?? '');
  const open = rows.map(row => Number(row.Open ?? row.open));
  const high = rows.map(row => Number(row.High ?? row.high));
  const low = rows.map(row => Number(row.Low ?? row.low));
  const close = rows.map(row => Number(row.Close ?? row.close));
  const volume = rows.map(row => Number(row.Volume ?? row.volume ?? 0));
  const cfg = ui?.marketPanel?.indicators || { mode: 'volume', ma1: 20, ma2: 50, ma3: 200, rsi_period: 14, macd_fast: 12, macd_slow: 26, macd_signal: 9 };

  const traces = [{
    type: 'candlestick', x, open, high, low, close,
    name: String(payload?.symbol || ''), yaxis: 'y',
  }];

  for (const period of [cfg.ma1, cfg.ma2, cfg.ma3]) {
    const p = Math.max(2, Number(period) || 20);
    traces.push({
      type: 'scatter', mode: 'lines', x, y: movingAverage(close, p),
      name: `MA${p}`, yaxis: 'y', line: { width: 1.35 },
      hovertemplate: `MA${p}: %{y:.4f}<extra></extra>`,
    });
  }

  const shapes = [];
  if (cfg.mode === 'rsi') {
    traces.push({ type: 'scatter', mode: 'lines', x, y: rsi(close, cfg.rsi_period), name: `RSI ${cfg.rsi_period}`, yaxis: 'y2', line: { width: 1.5 } });
    shapes.push(
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y2', y0: 70, y1: 70, line: { dash: 'dash', width: 1 } },
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y2', y0: 30, y1: 30, line: { dash: 'dash', width: 1 } },
    );
  } else if (cfg.mode === 'macd') {
    const data = macd(close, cfg.macd_fast, cfg.macd_slow, cfg.macd_signal);
    traces.push({ type: 'scatter', mode: 'lines', x, y: data.line, name: `MACD ${cfg.macd_fast}/${cfg.macd_slow}`, yaxis: 'y2', line: { width: 1.35 } });
    traces.push({ type: 'scatter', mode: 'lines', x, y: data.signalLine, name: `Signal ${cfg.macd_signal}`, yaxis: 'y2', line: { width: 1.15 } });
    traces.push({ type: 'bar', x, y: data.hist, name: 'MACD Hist', yaxis: 'y2', opacity: 0.48 });
  } else {
    traces.push({ type: 'bar', x, y: volume, name: '成交量', yaxis: 'y2', opacity: 0.55 });
  }

  window.Plotly.react('market-candlestick', traces, {
    autosize: true,
    margin: { l: 56, r: 58, t: 18, b: 42 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#c9d1db' },
    xaxis: { rangeslider: { visible: false }, showgrid: false, zeroline: false },
    yaxis: { side: 'right', domain: [0.32, 1], gridcolor: 'rgba(255,255,255,0.06)', zeroline: false, fixedrange: false },
    yaxis2: { side: 'right', domain: [0, 0.24], gridcolor: 'rgba(255,255,255,0.05)', zeroline: false, fixedrange: false },
    shapes,
    dragmode: 'pan',
    showlegend: true,
    legend: { orientation: 'h', y: 1.03, x: 0 },
    bargap: 0.08,
  }, {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  });
}
