# 存檔格式與相容性

`capital-life` 正式 Web 版有兩種存檔路徑，兩者用途不同。

## 正式存檔：後端加密 + Browser LocalStorage

正式遊玩預設使用這條路徑：

1. Private FastAPI Backend 從 server-authoritative GameState 建立版本化 snapshot。
2. Backend 使用固定後端金鑰加密與驗證。
3. GitHub Pages 只把密文保存在玩家瀏覽器 LocalStorage。
4. 載入時密文回到 Backend 驗證、解密與套用。

公開前端不保存可直接修改的現金、持倉、world seed、事件機率或核心公式。

玩家可以在「存檔管理」：

- 開啟／關閉自動存檔
- 立即加密儲存
- 載入本機加密存檔
- 刪除這台瀏覽器的加密存檔

## 舊版相容格式

為了讓舊 Streamlit 版本的玩家進度能繼續使用，原生 Web 存檔頁仍支援：

- `LCMG:...` save code
- `LCMG21:...` 等歷史版本前綴
- `.json`
- `.gz` / `.json.gz`

所有舊格式都由 Private Backend 解析；公開 JavaScript 不實作舊 snapshot parser，也不包含 migration 規則。

匯入流程：

```text
舊 LCMG / JSON / GZ
        ↓
Private Backend
        ↓
snapshot_from_save_code / snapshot_from_bytes
        ↓
migrate_save_snapshot
        ↓
apply_save_snapshot
        ↓
立即產生新版加密瀏覽器存檔
```

## 舊格式安全性

舊 LCMG / JSON / GZ 是歷史相容格式，本身不是防竄改格式。玩家可以讀取或修改其中的資料，因此：

- 正式遊玩請使用新版加密瀏覽器存檔。
- 舊格式匯出只用於舊版程式相容、人工備份或遷移。
- 匯入舊格式後，Web 版會立即轉存成新版加密格式。
- 私有 Python 遊戲核心、Seed 演算法、事件機率與計算公式仍不會因為舊格式相容功能而放進公開 repository。
