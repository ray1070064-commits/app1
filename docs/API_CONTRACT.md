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

## 存檔

`POST /api/game/save`

```json
{ "slot": "default" }
```

`GET /api/game/save/default`

正式 GameState 以後端為準。LocalStorage 最多保存 UI 偏好；不得直接把瀏覽器內可修改的 JSON 當成可信任遊戲狀態。

目前 migration Render 服務使用暫存檔案系統，因此這一階段的伺服器存檔**不保證跨服務重啟／重新部署永久保存**。正式切換前必須換成持久化資料庫或其他 server-side persistent storage。

## CORS

正式後端只允許需要的前端來源，例如：

`https://ray1070064-commits.github.io`

不要在正式環境使用允許任意來源並同時攜帶 credentials 的設定。
