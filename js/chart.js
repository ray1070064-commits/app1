function movingAverage(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i]);
    if (!Number.isFinite(value)) continue;
    sum += value;
    if (i >= period) {
      const old = Number(values[i - period]);
      if (Number.isFinite(old)) sum -= old;
    }
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
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

  host.innerHTML = '<div id="market-candlestick" style="width:100%;height:100%;min-height:430px"></div>';
  const x = rows.map(row => row.Datetime ?? row.datetime ?? row.Date ?? row.date ?? '');
  const open = rows.map(row => Number(row.Open ?? row.open));
  const high = rows.map(row => Number(row.High ?? row.high));
  const low = rows.map(row => Number(row.Low ?? row.low));
  const close = rows.map(row => Number(row.Close ?? row.close));

  const traces = [{
    type: 'candlestick',
    x,
    open,
    high,
    low,
    close,
    name: String(payload?.symbol || ''),
  }];

  const indicators = ui?.indicators || {};
  for (const [key, period] of [['ma20', 20], ['ma50', 50], ['ma200', 200]]) {
    if (!indicators[key]) continue;
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x,
      y: movingAverage(close, period),
      name: `MA${period}`,
      line: { width: 1.5 },
      hovertemplate: `MA${period}: %{y:.4f}<extra></extra>`,
    });
  }

  window.Plotly.react('market-candlestick', traces, {
    autosize: true,
    margin: { l: 56, r: 24, t: 18, b: 42 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#c9d1db' },
    xaxis: {
      rangeslider: { visible: false },
      showgrid: false,
      zeroline: false,
    },
    yaxis: {
      side: 'right',
      gridcolor: 'rgba(255,255,255,0.06)',
      zeroline: false,
      fixedrange: false,
    },
    dragmode: 'pan',
    showlegend: traces.length > 1,
    legend: { orientation: 'h' },
  }, {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  });
}
