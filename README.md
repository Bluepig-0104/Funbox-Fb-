# Funbox × 來玩聚 LINE Center v1.7

本版本改成兩大分類單頁切換：

1. LINE 門市
2. 🌀 陀螺抽選

兩個區塊不會同時堆在同一個長頁面；點上方分類即可切換，因此找門市時不必一路往下滑。

## 陀螺抽選資料

已移除外部抽選頁抓取機制。抽選資料固定放在 `gyro-data.js`，每一筆商品包含：
- city
- store
- product
- date
- url（該商品自己的 LINE 抽選連結）

更新抽選時只需要修改 `gyro-data.js`，網站不會再依賴 `https://uxux11.github.io/funbox-line/`。

注意：目前工作檔能取得的固定抽選資料只有 `台南遠百 / BEYBLADE X` 這一筆；其餘商品的實際 LINE 抽選網址無法從目前可取得的來源可靠還原，因此沒有虛構網址。把完整抽選清單貼入 `gyro-data.js` 後即可完全離線運作。
