export function drawMarketChart(payload) {
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

  window.Plotly.react('market-candlestick', [{
    type: 'candlestick',
    x,
    open,
    high,
    low,
    close,
    name: String(payload?.symbol || ''),
  }], {
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
    showlegend: false,
  }, {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  });
}
