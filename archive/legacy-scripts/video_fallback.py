from pathlib import Path
p=Path(__file__).resolve().parent.parent/'outputs/studysphere-ai/src/pages/StudentPages.tsx'
s=p.read_text(encoding='utf-8')
old='''{c.kind==='video'&&c.video_id&&<div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${c.video_id}`} title={c.title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>}'''
new='''{c.kind==='video'&&c.video_id&&<div><div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${c.video_id}`} title={c.title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div><p className="video-credit">{c.attribution&&<span>Source: {c.attribution} · </span>}<a href={`https://www.youtube.com/watch?v=${c.video_id}`} target="_blank" rel="noopener noreferrer">Open on YouTube if the player is unavailable</a></p></div>}'''
if old not in s:raise RuntimeError('Video block missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
