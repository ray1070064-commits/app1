# 資本人生｜Public Frontend

`app1` 是「資本人生」未來公開網站的前端專案。

## Repository 定位

- `ray1070064-commits/app1`：公開前端，只放 React / HTML / CSS / 圖片 / API 呼叫。
- `ray1070064-commits/app`：私有核心，保留 Python 遊戲邏輯、市場模擬、事件機率、交易驗證、存檔驗證與未來 FastAPI 後端。

**不要把 Python 核心公式、私密金鑰、資料庫密碼或伺服器 Secrets 放進 app1。**

## 第一階段已建立

- React + Vite 前端骨架
- 正式開局首頁
  - 隨機開始
  - 開局設定
  - 新手教學開關
- 三欄市場終端
  - 左：市場 / Watchlist
  - 中：價格圖表 / 新聞
  - 右：下單 / 持倉
- API Adapter：`src/api/client.js`
- 無後端時可使用 mock 資料開發 UI

## 本機啟動

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

產物會輸出到 `dist/`。

## API 設定

複製 `.env.example` 為 `.env.local`：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_USE_MOCKS=false
```

目前預定 API 路徑：

- `POST /api/v1/games`
- `GET /api/v1/market/snapshot`
- `POST /api/v1/orders`
- `POST /api/v1/time/advance`

正式上線後，所有真正會影響遊戲結果的計算都必須由私有後端完成；前端只負責顯示與傳送玩家操作。

## 公開前檢查

1. 確認 repo 裡沒有 `.env`、API Key、Token、資料庫連線字串。
2. 確認前端沒有複製 Python 市場公式或事件機率。
3. 後端啟用 CORS 白名單，只允許正式網站來源。
4. 交易、資產、時間推進、排行榜等操作全部由後端再次驗證。
5. 完成正式 API 後再將 `VITE_USE_MOCKS` 關閉。
