# Capital Life Frontend API Contract

這份文件只描述「公開前端如何與私有後端溝通」。

**禁止把任何遊戲核心公式、事件機率、Seed 邏輯、私鑰、API Secret 或管理憑證放到這個 repository。**

## 基本原則

1. 前端只送玩家「想做什麼」。
2. 後端決定玩家「能不能做」與「結果是什麼」。
3. 真正的 GameState 永遠以後端為準。
4. 前端不得自行增加現金、持股、技能、公司等級或事件結果。
5. 建議使用 HttpOnly + Secure Cookie 做玩家 Session。

## Health

`GET /health`

成功只需要回 HTTP 200。

## 讀取遊戲狀態

`GET /api/game/state`

可直接回傳 state，或：

```json
{
  "state": {
    "world": { "date": "2026-09-08" },
    "player": {
      "cash": 1000000,
      "net_worth": 1000000
    },
    "market": {
      "watchlist": []
    },
    "portfolio": {
      "positions": []
    },
    "life": { "actions": [] },
    "company": { "actions": [] },
    "politics": { "actions": [] },
    "news": { "items": [] }
  }
}
```

上述欄位只是前端資料介面，不代表任何遊戲規則。

## 執行遊戲行動

`POST /api/game/action`

```json
{
  "action": "trade",
  "payload": {
    "symbol": "2330",
    "side": "buy",
    "quantity": 100
  },
  "action_id": "UUID"
}
```

或：

```json
{
  "action": "advance_time",
  "payload": { "days": 30 },
  "action_id": "UUID"
}
```

後端必須自行驗證所有輸入，不可信任前端提供的價格、現金、持股、事件結果或解鎖狀態。

建議成功回傳：

```json
{
  "message": "操作完成",
  "state": {}
}
```

第一版可先回完整 state；之後效能需要時再改成 patch/delta。

## 存檔

`POST /api/game/save`

```json
{ "slot": "default" }
```

`GET /api/game/save/default`

正式遊戲存檔建議放在後端。LocalStorage 最多保存顯示偏好，不應作為可信任的遊戲狀態來源。

## CORS

正式後端只應允許需要的前端來源，例如：

`https://ray1070064-commits.github.io`

不要在正式環境使用允許任意來源並同時攜帶 credentials 的設定。
