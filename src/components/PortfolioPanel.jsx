import { useMemo, useState } from 'react'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(Number(value || 0)) >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

function formatQuantity(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(Number(value || 0))
}

function modeLabel(mode) {
  if (mode === 'LONG') return 'Long'
  if (mode === 'SHORT') return 'Short'
  return 'Spot'
}

export default function PortfolioPanel({ positions, orders, assets, onClose, onCancel }) {
  const [tab, setTab] = useState('positions')
  const priceMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.symbol, asset.price])), [assets])

  return (
    <section className="portfolio-panel panel">
      <div className="portfolio-tabs">
        <button type="button" className={tab === 'positions' ? 'active' : ''} onClick={() => setTab('positions')}>持倉 <span>{positions.length}</span></button>
        <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>掛單 <span>{orders.length}</span></button>
      </div>

      {tab === 'positions' && (
        <div className="portfolio-list">
          {positions.length === 0 && <div className="empty-state">尚無持倉</div>}
          {positions.map((position) => {
            const currentPrice = Number(priceMap[position.symbol] || position.avgPrice || 0)
            const direction = position.mode === 'SHORT' ? -1 : 1
            const pnl = (currentPrice - position.avgPrice) * position.quantity * direction
            const base = Math.max(position.avgPrice * position.quantity / Math.max(position.leverage || 1, 1), 0.0001)
            const returnPct = (pnl / base) * 100
            return (
              <article className="position-card" key={position.id}>
                <div className="position-main-row">
                  <div>
                    <div className="position-symbol-row">
                      <strong>{position.symbol}</strong>
                      <span className={`mode-badge ${position.mode.toLowerCase()}`}>{modeLabel(position.mode)}</span>
                      {position.mode !== 'SPOT' && <span className="leverage-badge">{position.leverage}×</span>}
                    </div>
                    <small>{formatQuantity(position.quantity)} 單位</small>
                  </div>
                  <div className="position-pnl">
                    <strong className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{formatMoney(pnl)}</strong>
                    <small className={returnPct >= 0 ? 'up' : 'down'}>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%</small>
                  </div>
                </div>

                <div className="position-detail-grid">
                  <div><span>平均成本</span><strong>{formatMoney(position.avgPrice)}</strong></div>
                  <div><span>現價</span><strong>{formatMoney(currentPrice)}</strong></div>
                  <div><span>名目價值</span><strong>{formatMoney(currentPrice * position.quantity)}</strong></div>
                </div>

                <div className="close-actions">
                  <span>平倉</span>
                  {[25, 50, 100].map((percent) => (
                    <button type="button" key={percent} onClick={() => onClose(position, percent)}>{percent === 100 ? '全部' : `${percent}%`}</button>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {tab === 'orders' && (
        <div className="portfolio-list">
          {orders.length === 0 && <div className="empty-state">目前沒有未成交限價單</div>}
          {orders.map((order) => (
            <article className="limit-order-row" key={order.id}>
              <div>
                <div className="position-symbol-row">
                  <strong>{order.symbol}</strong>
                  <span className={`mode-badge ${order.mode.toLowerCase()}`}>{modeLabel(order.mode)}</span>
                </div>
                <small>{order.side === 'sell' ? '賣出 / 做空' : '買入 / 做多'} · {formatQuantity(order.quantity)} @ {formatMoney(order.limitPrice)}</small>
              </div>
              <button type="button" className="cancel-button" onClick={() => onCancel(order)}>取消</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
