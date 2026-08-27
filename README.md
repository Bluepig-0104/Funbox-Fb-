# Funbox LINE 門市 + 陀螺抽選

這個版本遵守兩套資料來源完全分離：

- **LINE 門市**：維持原本 `data.js`，不參與陀螺抽選解析。
- **🌀 陀螺抽選**：以 `https://uxux11.github.io/funbox-line/` 為唯一來源；門市名稱、商品名稱、日期與每個商品的 LINE 抽獎連結都以來源頁為準。
- 同一門市的所有抽選會集中在同一張門市卡片。
- 來源頁抓不到或解析不到資料時，不會用錯誤結果覆蓋既有 `gyro-data.json`。

## 自動同步

已附 `.github/workflows/sync-gyro.yml`，GitHub Actions 每 10 分鐘抓一次來源並更新 `Funbox-Fb--main/gyro-data.json`。

請將整個資料夾內容放到你的 GitHub repository，並在 repository 的 Actions 設定允許 workflow 寫入內容（Workflow permissions: Read and write）。首次可手動執行 `Sync gyro draw data`。

前端也保留手動更新與瀏覽器快取作為備援。
