import json,re,requests
from bs4 import BeautifulSoup
from pathlib import Path

SOURCE='https://uxux11.github.io/funbox-line/'
OUT=Path('Funbox-Fb--main/gyro-data.json')
DRAW_RE=re.compile(r'^https?://(?:liff\.line\.me|lin\.ee)/',re.I)
CITY_RE=re.compile(r'^(台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)$')
STORE_RE=re.compile(r'^(?:Fun\s*box|Funbox|來玩聚)(?:[\s\-—_:：]*).{1,80}$',re.I)
DATE_RE=re.compile(r'抽選開始時間\s*[:：]?\s*(\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?)')

def clean(s): return re.sub(r'\s+',' ',str(s or '').replace('\xa0',' ')).strip()
def is_draw(h): return bool(DRAW_RE.match(h or ''))

def main():
    r=requests.get(SOURCE,timeout=30,headers={'User-Agent':'Mozilla/5.0'})
    r.raise_for_status()
    soup=BeautifulSoup(r.text,'html.parser')
    all_tags=list(soup.find_all(True)); pos={id(t):i for i,t in enumerate(all_tags)}
    store_heads=[]
    for t in all_tags:
        text=clean(t.get_text(' ',strip=True))
        if len(text)<=100 and STORE_RE.match(text): store_heads.append((pos[id(t)],t,text))
    city_heads=[]
    for t in all_tags:
        text=clean(t.get_text(' ',strip=True))
        if CITY_RE.match(text): city_heads.append((pos[id(t)],text))
    anchors=[]
    for a in soup.find_all('a',href=True):
        h=a.get('href','').strip()
        if h.startswith('//'): h='https:'+h
        if is_draw(h): anchors.append((pos[id(a)],a,h))
    items=[]; seen=set()
    for ai,a,url in anchors:
        prev=[x for x in store_heads if x[0]<ai]
        if not prev: continue
        _,head,store=max(prev,key=lambda x:x[0])
        prevc=[x for x in city_heads if x[0] < pos[id(head)]]
        city=max(prevc,key=lambda x:x[0])[1] if prevc else '未分類'
        # date from text between store heading and current anchor
        date='抽選中'
        start=pos[id(head)]
        for t in all_tags[start:ai+1]:
            m=DATE_RE.search(clean(t.get_text(' ',strip=True)))
            if m: date=m.group(1); break
        # product: smallest ancestor with one draw link
        product='陀螺抽選商品'
        el=a
        for _ in range(8):
            if not el: break
            links=[x for x in el.find_all('a',href=True) if is_draw(x.get('href','').strip())]
            if len(links)==1:
                raw=clean(el.get_text(' ',strip=True)).replace(clean(a.get_text(' ',strip=True)),' ')
                raw=re.sub(r'抽獎',' ',raw)
                raw=re.sub(r'抽選開始時間\s*[:：]?\s*\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?',' ',raw)
                raw=clean(raw)
                if raw and raw!=store and not CITY_RE.match(raw): product=raw; break
            el=el.parent
        key=(store,product,url)
        if key in seen: continue
        seen.add(key); items.append({'city':city,'store':store,'product':product,'date':date,'url':url})
    if not items: raise SystemExit('No draw items parsed; refusing to overwrite gyro-data.json')
    data={'source':SOURCE,'syncedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'items':items}
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Parsed {len(items)} draw items across {len(set((x["city"],x["store"]) for x in items))} stores')
if __name__=='__main__': main()
