# 資本人生 Capital Life — Frontend

這個 repository 是 **公開前端**，目標部署到 GitHub Pages：

`https://ray1070064-commits.github.io/capital-life/`

## 這裡只放前端

允許放：

- HTML
- CSS
- JavaScript
- 圖示與公開圖片
- UI 狀態
- 公開 API 介面格式

禁止放：

- Python 遊戲核心
- 市場模擬公式
- 事件觸發機率
- 隱藏解鎖條件
- Seed / RNG 核心邏輯
- API Secret
- 私鑰
- 管理員憑證
- 可信任的正式玩家存檔

## 目前結構

```text
capital-life/
├─ index.html
├─ manifest.webmanifest
├─ .nojekyll
├─ css/
│  └─ app.css
├─ js/
│  ├─ app.js
│  ├─ api.js
│  ├─ config.js
│  ├─ state.js
│  ├─ ui.js
│  └─ views.js
└─ docs/
   └─ API_CONTRACT.md
```

## 前端責任

前端可以處理：

- 頁面切換
- 標的選擇
- 下單數量輸入
- 圖表呈現
- 排序、搜尋、展開收合
- 顯示後端回傳的玩家、公司、人生、政治、新聞資料

前端 **不能決定**：

- 玩家是否買得起
- 真實成交價格
- 現金或持股增減
- 市場下一步走勢
- 人生事件結果
- 公司決策成功率
- 政治／法律結果
- 成就解鎖

這些全部由私有 Python Backend / GameEngine 決定。

## 後端設定

`js/config.js` 內：

```js
API_BASE_URL: ''
```

等私有後端上線後，再填入公開的 API 網址，例如：

```js
API_BASE_URL: 'https://api.example.com'
```

API 網址本身可以公開；**Secret 不可以放進前端**。

## API

請看 `docs/API_CONTRACT.md`。

主要介面：

- `GET /health`
- `GET /api/game/state`
- `POST /api/game/action`
- `POST /api/game/save`
- `GET /api/game/save/{slot}`

## 安全原則

玩家瀏覽器只提出「行動」，例如買入 100 股；真正的價格、現金、持股、事件與結果都由後端重新驗證與計算。
