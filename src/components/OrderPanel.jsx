import { useEffect, useMemo, useState } from 'react'

const MODES = [
  { id: 'SPOT', label: 'Spot' },
  { id: 'LONG', label: 'Long' },
  { id: 'SHORT', label: 'Short' },
]

const LEVERAGES = [1, 2, 3, 5, 10]

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 10000 ? 0 : 2,
  }).format(Number(value || 0))
}

export default function OrderPanel({ asset, account, onSubmit, busy, notice }) {
  const [mode, setMode] = useState('SPOT')
  const [orderType, setOrderType] = useState('market')
  const [spotSide, setSpotSide] = useState('buy')
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState(String(asset.price))
  const [leverage, setLeverage] = useState(1)

  useEffect(() => {
    setLimitPrice(String(asset.price))
  }, [asset.symbol, asset.price])

  useEffect(() => {
    if (mode === 'SPOT') setLeverage(1)
  }, [mode])

  const quantityNumber = Math.max(0, Number(quantity || 0))
  const executionPrice = orderType === 'limit' ? Math.max(0, Number(limitPrice || 0)) : asset.price
  const notional = quantityNumber * executionPrice
  const margin = mode === 'SPOT' ? notional : notional / Math.max(leverage, 1)
  const actionLabel = useMemo(() => {
    if (mode === 'SPOT') return spotSide === 'buy' ? '確認買入' : '確認賣出'
    if (mode === 'LONG') return '建立多單'
    return '建立空單'
  }, [mode, spotSide])

  function submit(event) {
    event.preventDefault()
    if (!quantityNumber || !executionPrice) return
    onSubmit({
      symbol: asset.symbol,
      mode,
      side: mode === 'SPOT' ? spotSide : mode === 'LONG' ? 'buy' : 'sell',
      orderType,
      quantity: quantityNumber,
      limitPrice: orderType === 'limit' ? executionPrice : null,
      leverage,
    })
  }

  return (
    <aside className="trade-panel panel">
      <div className="panel-title">
        <span>下單</span>
        <small>{asset.symbol}</small>
      </div>

      <form className="order-form" onSubmit={submit}>
        <div className="mode-tabs" aria-label="交易模式">
          {MODES.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${mode === item.id ? 'active' : ''} mode-${item.id.toLowerCase()}`}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="order-type-switch">
          <button type="button" className={orderType === 'market' ? 'active' : ''} onClick={() => setOrderType('market')}>市價</button>
          <button type="button" className={orderType === 'limit' ? 'active' : ''} onClick={() => setOrderType('limit')}>限價</button>
        </div>

        {mode === 'SPOT' && (
          <div className="side-switch compact">
            <button type="button" className={spotSide === 'buy' ? 'active buy' : ''} onClick={() => setSpotSide('buy')}>買入</button>
            <button type="button" className={spotSide === 'sell' ? 'active sell' : ''} onClick={() => setSpotSide('sell')}>賣出</button>
          </div>
        )}

        {mode !== 'SPOT' && (
          <div className="leverage-block">
            <div className="field-label-row"><span>槓桿</span><strong>{leverage}×</strong></div>
            <div className="leverage-grid">
              {LEVERAGES.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={leverage === value ? 'active' : ''}
                  onClick={() => setLeverage(value)}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="field-block">
          <span>數量</span>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>

        {orderType === 'limit' && (
          <label className="field-block">
            <span>限價</span>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={limitPrice}
              onChange={(event) => setLimitPrice(event.target.value)}
            />
          </label>
        )}

        <div className="order-preview-grid">
          <div><span>參考價格</span><strong>{formatMoney(executionPrice)}</strong></div>
          <div><span>名目曝險</span><strong>{formatMoney(notional)}</strong></div>
          <div><span>{mode === 'SPOT' ? '預估支出' : '預估保證金'}</span><strong>{formatMoney(margin)}</strong></div>
          <div><span>可用資金</span><strong>{formatMoney(account.availableCash)}</strong></div>
        </div>

        {mode !== 'SPOT' && leverage >= 5 && (
          <div className="risk-note">高槓桿會放大損益與清算風險；正式結果由後端驗證。</div>
        )}

        <button
          type="submit"
          className={`order-button ${mode === 'SHORT' || (mode === 'SPOT' && spotSide === 'sell') ? 'sell' : 'buy'}`}
          disabled={busy || quantityNumber <= 0 || executionPrice <= 0}
        >
          {orderType === 'limit' ? `${actionLabel}（掛單）` : actionLabel}
        </button>

        {notice && <div className="order-notice">{notice}</div>}
      </form>
    </aside>
  )
}
