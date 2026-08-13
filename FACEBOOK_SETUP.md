
# Facebook 自動監控設定

## 目前已完成
- 74 間門市來源設定
- 66 個 Facebook 來源網址
- 每 30 分鐘 GitHub Actions 排程
- 新貼文去重
- 抽選關鍵字初步判斷
- 活動寫入 `activities.json`

## 需要你在 GitHub 裡設定
Repository → Settings → Secrets and variables → Actions → New repository secret

名稱：
`FACEBOOK_ACCESS_TOKEN`

值：
你的 Meta Graph API Access Token。

## 注意
Facebook Page 的 API 可用性、權限與版本會依 Meta 對 App 的設定而變動。
程式不會把 Facebook 公開網址當成 API 認證，也不會在抓不到資料時偽造活動。

## 執行方式
GitHub Actions 會每 30 分鐘執行 `monitor.py`。
也可以在 Actions 頁面手動 Run workflow。

## 判斷方式
命中「抽選／抽獎／一番賞／贈品／限定／留言／參加」等關鍵字，
先標記為「疑似抽選」，不直接宣稱一定是抽選。
