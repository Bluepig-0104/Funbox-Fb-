
"""
Facebook monitoring adapter.

The workflow is intentionally split into:
1) source collection (fetch_facebook_posts)
2) draw detection
3) de-duplication
4) activities.json output

To actually query Facebook Pages, provide a Meta Graph API access token
as the FACEBOOK_ACCESS_TOKEN environment variable and implement/adjust the
Page endpoint according to the permissions and API version available to
your Meta app. The public page URL alone is not a reliable API credential.
"""
import json, os, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ROOT = Path(__file__).parent
CFG = ROOT / "monitor_config.json"
OUT = ROOT / "activities.json"

# Conservative keywords: a hit is labelled "疑似抽選", not automatically confirmed.
KEYWORDS = [
    "抽選","抽獎","抽籤","抽取","一番賞","賞品","贈品",
    "限定","留言","參加","截止","名額","登記","報名"
]

def graph_get(url, token):
    q = urlencode({"access_token": token})
    req = Request(url + ("&" if "?" in url else "?") + q,
                  headers={"User-Agent":"FunboxMonitor/2.0"})
    with urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))

def extract_page_id(url):
    if not url:
        return None
    m = re.search(r'profile\.php\?id=(\d+)', url)
    if m: return m.group(1)
    m = re.search(r'facebook\.com/(?:p/)?([A-Za-z0-9_.-]+)', url)
    if m and m.group(1) not in {"share","profile.php","p"}:
        return m.group(1)
    return None

def fetch_facebook_posts(store, token):
    """
    Attempts the Page feed endpoint for sources that expose a usable Page ID.
    Meta may require additional app permissions/review; failures are returned
    as an empty list rather than fabricating posts.
    """
    page = extract_page_id(store.get("facebookUrl",""))
    if not page or not token:
        return []
    fields = "id,message,created_time,permalink_url"
    url = f"https://graph.facebook.com/v23.0/{page}/posts?fields={fields}&limit=25"
    try:
        data = graph_get(url, token)
    except Exception:
        return []
    posts=[]
    for p in data.get("data", []):
        posts.append({
            "id": p.get("id"),
            "title": (p.get("message") or "").splitlines()[0][:120],
            "text": p.get("message") or "",
            "url": p.get("permalink_url") or "",
            "publishedAt": p.get("created_time") or "",
            "source": "Facebook"
        })
    return posts

def looks_like_draw(post):
    text = (post.get("title","") + " " + post.get("text","")).lower()
    return any(k.lower() in text for k in KEYWORDS)

def main():
    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    seen = {x.get("id") for x in old if x.get("id")}
    token = os.getenv("FACEBOOK_ACCESS_TOKEN", "")
    found = list(old)
    checked = 0

    for store in cfg["stores"]:
        if not store.get("enabled", True) or not store.get("facebookUrl"):
            continue
        checked += 1
        for post in fetch_facebook_posts(store, token):
            if not post.get("id") or post["id"] in seen or not looks_like_draw(post):
                continue
            found.insert(0, {
                "id": post["id"],
                "brand": store["brand"],
                "region": store["region"],
                "store": store["name"],
                "title": post.get("title") or "疑似抽選活動",
                "publishedAt": post.get("publishedAt",""),
                "source": "Facebook",
                "url": post.get("url",""),
                "status": "new",
                "checkedAt": datetime.now(timezone.utc).isoformat()
            })

    OUT.write_text(json.dumps(found[:300], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"checked_stores={checked} activities={len(found)} token={'yes' if token else 'no'}")

if __name__ == "__main__":
    main()
