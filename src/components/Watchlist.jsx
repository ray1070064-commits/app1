import { useMemo } from 'react'

const CATEGORY_OPTIONS = ['全部', '股票', 'ETF', '加密', '商品', '外匯']

function formatPrice(asset) {
  const digits = asset.price >= 1000 ? 0 : asset.price >= 100 ? 2 : 4
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(digits, 2),
    maximumFractionDigits: digits,
  }).format(asset.price)
}

export default function Watchlist({ assets, selectedSymbol, onSelect, search, onSearchChange, category, onCategoryChange }) {
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return assets.filter((asset) => {
      const categoryMatch = category === '全部' || asset.category === category
      const searchMatch = !keyword || [asset.symbol, asset.name, asset.sector, asset.category]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
      return categoryMatch && searchMatch
    })
  }, [assets, category, search])

  return (
    <aside className="watch-panel panel">
      <div className="panel-title">
        <span>市場</span>
        <small>{filtered.length} / {assets.length}</small>
      </div>

      <div className="watch-controls">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            placeholder="搜尋代號、名稱、產業"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <div className="category-filter" aria-label="市場類別">
          {CATEGORY_OPTIONS.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => onCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="watch-list">
        {filtered.length === 0 && <div className="empty-state">找不到符合條件的標的</div>}
        {filtered.map((asset) => (
          <button
            type="button"
            key={asset.symbol}
            className={`watch-row ${selectedSymbol === asset.symbol ? 'active' : ''}`}
            onClick={() => onSelect(asset.symbol)}
          >
            <span className="ticker-cell">
              <strong>{asset.symbol}</strong>
              <small>{asset.name}</small>
            </span>
            <span className="price-cell">
              <strong>{formatPrice(asset)}</strong>
              <small className={asset.change >= 0 ? 'up' : 'down'}>
                {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
              </small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
