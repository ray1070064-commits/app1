# Capital Life Frontend API Contract

這份文件只描述「公開 GitHub Pages 前端如何與私有 FastAPI 後端溝通」。

**禁止把任何遊戲核心公式、事件機率、Seed 邏輯、私鑰、API Secret、管理憑證或 Python 核心放到這個 repository。**

## 基本原則

1. 前端只送玩家「想做什麼」。
2. 後端決定玩家「能不能做」與「結果是什麼」。
3. 真正的 GameState 永遠以後端為準。
4. 前端不得自行增加現金、持股、技能、公司等級或事件結果。
5. world seed、事件機率、effect multiplier、隱藏門檻與 RNG 資訊不得出現在 public state。
6. GitHub Pages 與 API 是 cross-site；後端會設 HttpOnly Cookie，並同時提供 opaque session token 作為第三方 Cookie 被阻擋時的 fallback。
7. opaque session token 只是玩家 Session 識別，不是 API secret，也不能包含遊戲規則。

## Health

`GET /health`

成功回 HTTP 200。

## 建立玩家 Session

`POST /api/game/session`

回傳：

```json
{
  "session_token": "opaque-random-token",
  "state": {}
}
```

前端把 token 暫存在 `sessionStorage`，後續請求使用：

```http
Authorization: Bearer <session_token>
```

後端仍可同時使用 `HttpOnly; Secure` Cookie。Token 不得放進 URL query string。

## 讀取遊戲狀態

`GET /api/game/state`

可選：

`GET /api/game/state?include_ui=true`

回傳範例：

```json
{
  "state": {
    "world": {
      "day": 1,
      "game_started": true
    },
    "player": {
      "cash": 100000,
      "net_worth": 100000
    },
    "market": {
      "selected_symbol": "XBTC",
      "watchlist": []
    },
    "portfolio": {
      "positions": []
    },
    "life": {},
    "company": {},
    "politics": {},
    "news": { "items": [] }
  }
}
```

上述欄位只是顯示資料，不代表任何遊戲規則；公開 state **不得包含 `world_seed`、event chance/weight/effects、私有倍率或內部計算資料**。

## 圖表資料

`GET /api/game/chart/{symbol}?limit=365`

只回傳已經由後端生成的 OHLCV 歷史資料。前端可以畫圖，但不能自行生成下一期價格。

## 執行遊戲行動

`POST /api/game/action`

```json
{
  "action": "trade",
  "payload": {
    "symbol": "XBTC",
    "side": "buy",
    "position_side": "SPOT",
    "quantity": 0.01
  },
  "action_id": "UUID"
}
```

或：

```json
{
  "action": "advance_time",
  "payload": {
    "days": 30,
    "life_policy": "safe"
  },
  "action_id": "UUID"
}
```

`action_id` 用來避免網路重試或連點造成同一行動被執行兩次。

目前高頻 semantic actions 包含：

- `new_game`
- `trade`
- `advance_time`
- `select_symbol`
- `resolve_life_event`
- `cancel_limit_order`
- `set_protective_order`

後端必須自行驗證所有輸入，不可信任前端提供的價格、現金、持股、事件結果或解鎖狀態。

## 完整功能相容模式

遷移期間不能因為 API 尚未語意化就刪功能，因此另有：

`GET /api/game/ui`

後端會把舊版 UI 的**公開控制項描述**轉成 JSON；不會把 Python、公式或事件資料庫傳給前端。

尚未轉成 semantic action 的舊功能可以送：

```json
{
  "action": "legacy_widget",
  "payload": {
    "control_id": "apply_job_btn",
    "inputs": {
      "某個控制項 ID": 1
    }
  },
  "action_id": "UUID"
}
```

這是遷移保底機制。高頻功能會逐步直接改成 GameEngine handler；完整功能模式則確保尚未重構的功能仍可操作。

## 加密瀏覽器存檔

正式 migration 前端使用「**後端封裝 + 加密驗證、瀏覽器只保存密文**」模式。

### 匯出

`POST /api/game/browser-save/export`

後端會：

1. 從 server-authoritative GameState 建立既有版本化 save snapshot。
2. 使用既有存檔 migration/serialization 系統編碼。
3. 使用只存在後端環境變數的固定 Fernet key 加密與驗證。
4. 回傳 opaque `save_code`。

回傳範例：

```json
{
  "save_code": "gAAAAA...",
  "encrypted_bytes": 123456
}
```

前端只把這段 opaque ciphertext 放入 LocalStorage。**不得解密、解析或修改其中內容。**

### 匯入

`POST /api/game/browser-save/import`

```json
{
  "save_code": "gAAAAA..."
}
```

後端會驗證密文完整性；被修改、截斷、使用錯誤金鑰或格式無效的存檔一律拒絕。驗證成功後才套用既有 save migration，再回傳經白名單過濾的 public state。

這種模式的目的：

- Render 重啟或重新部署後，玩家進度仍保留在自己的瀏覽器。
- LocalStorage 不保存可直接編輯的 `cash`、持股、world seed 或事件內部狀態。
- 玩家竄改 ciphertext 後無法通過後端驗證。
- 加密金鑰只放在 Render Environment，不進 GitHub Pages 或公開 repository。

目前前端會在成功改變遊戲狀態後做防抖 autosave；「存檔管理」也可以手動立即匯出／載入。

### Transitional server slot

以下 endpoint 暫時保留給 parity test / fallback：

`POST /api/game/save`

`GET /api/game/save/{slot}`

Render Free 的本機檔案系統不是永久儲存，因此**正式玩家持久化不依賴這組 endpoint**。

## CORS

正式後端只允許需要的前端來源，例如：

`https://ray1070064-commits.github.io`

不要在正式環境使用允許任意來源並同時攜帶 credentials 的設定。
