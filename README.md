# Funbox × 來玩聚｜抽選監控中心 v2.1｜Facebook 自動監控準備版

## 基準資料
- 門市：74
- Funbox：67
- 來玩聚：7
- 地區：北部／中部／南部／東部／離島
- 澎坊商場已歸入「離島」
- 嘉義耐斯 LINE：@121vsdww

資料欄位已整理為：
`brand / region / name / lineId / lineUrl / facebookUrl / lineVoomUrl / monitorEnabled`

## 已完成
- 品牌分流
- 五區分流
- 搜尋
- LINE 一鍵開啟
- Facebook 原頁連結
- 抽選活動頁
- 活動資料 JSON
- GitHub Actions 每 30 分鐘排程骨架
- 監控關鍵字設定

## 重要說明
目前版本把「自動監控」的資料結構與排程架構先做好，但 `monitor.py` 不會假裝直接抓取 Facebook/LINE VOOM。
真正抓取需要使用可用且被允許的來源/API/Feed；接上來源後，程式會把疑似抽選寫入 `activities.json`，網站即可自動顯示。

## 部署
把 ZIP 解壓縮後整包放進 GitHub Pages 儲存庫即可。
若要啟用排程，GitHub Actions 需允許 workflow 寫入 repository。

## v2.1
已加入 Facebook Graph API 監控 adapter 與 GitHub Secret 設定說明。未設定 token 時網站仍可正常運作，不會產生假活動。
