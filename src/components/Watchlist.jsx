import { useEffect, useMemo, useState } from 'react'

const CATEGORY_OPTIONS = ['自選', '全部', '股票', 'ETF', '加密', '商品', '固定收益', '外匯']
const STORAGE_KEY = 'capital-life-watchlist-v1'

function formatPrice(asset) {
  const digits = asset.price >= 1000 ? 0 : asset.price >= 100 ? 2 : 4
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.min(digits, 2),
    maximumFractionDigits: digits,
  }).format(asset.price)
}

function readFavorites() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.map(String) : []
  } catch { return [] }
}

export default function Watchlist({ assets, selectedSymbol, onSelect, search, onSearchChange, category, onCategoryChange }) {
  const [favorites, setFavorites] = useState(readFavorites)
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  useEffect(() => {
    const valid = favorites.filter((symbol) => assets.some((asset) => asset.symbol === symbol))
    if (valid.length !== favorites.length) setFavorites(valid)
  }, [assets.length])

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  function toggleFavorite(symbol) {
    setFavorites((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol])
  }

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return assets.filter((asset) => {
      const categoryMatch = category === '全部' || (category === '自選' ? favoriteSet.has(asset.symbol) : asset.category === category)
      const searchMatch = !keyword || [asset.symbol, asset.displayTicker, asset.name, asset.sector, asset.category]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
      return categoryMatch && searchMatch
    })
  }, [assets, category, search, favoriteSet])

  return (
    <aside className="watch-panel panel">
      <div className="panel-title">
        <span>Watchlist／市場</span>
        <small>自選 {favorites.length}・顯示 {filtered.length}/{assets.length}</small>
      </div>

      <div className="watch-controls">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={search} placeholder="搜尋代號、名稱、產業" onChange={(event) => onSearchChange(event.target.value)} />
        </label>
        <div className="category-filter" aria-label="市場類別">
          {CATEGORY_OPTIONS.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => onCategoryChange(item)}>{item}</button>)}
        </div>
      </div>

      <div className="watch-list">
        {filtered.length === 0 && <div className="empty-state">{category === '自選' ? '尚未加入自選標的；點市場清單右側 ☆ 即可加入。' : '找不到符合條件的標的'}</div>}
        {filtered.map((asset) => (
          <div className={`watch-row-wrap ${selectedSymbol === asset.symbol ? 'active' : ''}`} key={asset.symbol}>
            <button type="button" className={`watch-row ${selectedSymbol === asset.symbol ? 'active' : ''}`} onClick={() => onSelect(asset.symbol)}>
              <span className="ticker-cell"><strong>{asset.displayTicker || asset.symbol}</strong><small>{asset.name}</small></span>
              <span className="price-cell"><strong>{formatPrice(asset)}</strong><small className={asset.change >= 0 ? 'up' : 'down'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</small></span>
            </button>
            <button type="button" className={`watch-star ${favoriteSet.has(asset.symbol) ? 'active' : ''}`} aria-label={favoriteSet.has(asset.symbol) ? `移除 ${asset.name} 自選` : `加入 ${asset.name} 自選`} title={favoriteSet.has(asset.symbol) ? '移除自選' : '加入自選'} onClick={() => toggleFavorite(asset.symbol)}>{favoriteSet.has(asset.symbol) ? '★' : '☆'}</button>
          </div>
        ))}
      </div>
    </aside>
  )
}
