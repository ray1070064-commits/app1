# 資本人生｜Public Frontend

`app1` 是「資本人生」公開網站前端，正式開發分支為 `main`。

## Repository 定位

- `ray1070064-commits/app1`：Public，只放 React / HTML / CSS / 圖片 / API 呼叫與公開 mock。
- `ray1070064-commits/app`：Private，保存 Python 遊戲邏輯、市場模擬、事件機率、交易驗證與 FastAPI 後端。

**禁止把 Python 核心公式、API Key、Token、資料庫密碼或伺服器 Secrets 放進 app1。**

## 已完成前端

- React + Vite 開局首頁
- 三欄市場終端
- K 線、成交量、MA / RSI / MACD
- 技術指標自訂參數，預設與私有引擎一致：MA 20 / 50 / 200、RSI 14、MACD 12 / 26 / 9
- 搜尋與市場類別篩選
- Spot / Long / Short
- 市價 / 限價、槓桿、持倉、部分 / 全部平倉、未成交掛單
- 股票資訊層：
  - 公司概況與財務卡片
  - 配息 / 收益資訊
  - ETF 成分與費用率
  - 分級新聞
  - PTT 模擬聊天室
  - 市場深度 / spread / 買賣失衡
- API Adapter：`src/api/client.js`
- 無後端時可用公開 mock 開發 UI；mock 不包含私有市場公式。

## 本機啟動

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## API 設定

`.env.local`：

```env
VITE_API_BASE_URL=https://your-private-backend.example.com
VITE_USE_MOCKS=false
```

### 市場 / 資訊 API contract

- `POST /api/v1/games`
- `GET /api/v1/market/snapshot`
- `GET /api/v1/market/{symbol}/history?timeframe=3M`
- `GET /api/v1/assets/{symbol}`
- `GET /api/v1/assets/{symbol}/news`
- `GET /api/v1/assets/{symbol}/ptt?nonce=0`
- `GET /api/v1/assets/{symbol}/depth`
- `POST /api/v1/orders`
- `DELETE /api/v1/orders/{order_id}`
- `POST /api/v1/positions/{position_id}/close`
- `POST /api/v1/time/advance`

正式成交、槓桿、清算、配息、事件、價格與資產變更都必須由 Private 後端重新驗證；前端不具有最終決定權。

## GitHub Pages

Vite 已設定 `/app1/` base path，並提供 GitHub Pages Actions workflow。若尚未啟用 Pages，請到 `Settings → Pages → Source → GitHub Actions` 啟用一次。
