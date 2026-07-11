#!/usr/bin/env python3
"""Production render for the light-theme visual asset collection."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "art"
SCALE = 3
IVORY = (250, 250, 247)
EMERALD = (12, 138, 77)
DEEP = (12, 59, 46)
TEAL = (23, 89, 74)
GOLD = (168, 124, 31)


def rgba(color: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
    return (*color, alpha)


def layer(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    return canvas, ImageDraw.Draw(canvas)


def bezier(points: list[tuple[float, float]], samples: int = 100) -> list[tuple[int, int]]:
    p = np.asarray(points, dtype=float)
    t = np.linspace(0, 1, samples)[:, None]
    curve = (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1] + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3]
    return [(round(x), round(y)) for x, y in curve]


def composite(base: Image.Image, *layers: Image.Image) -> Image.Image:
    for item in layers:
        base = Image.alpha_composite(base, item)
    return base


def shadow_for(shape: Image.Image, blur: float, alpha: float = .05) -> Image.Image:
    shadow = Image.new("RGBA", shape.size, (0, 0, 0, 0))
    mask = shape.getchannel("A").point(lambda a: int(a * alpha))
    shadow.putalpha(mask)
    return shadow.filter(ImageFilter.GaussianBlur(blur))


def dot_matrix(size: tuple[int, int], bounds: tuple[float, float, float, float], step: int, color: tuple[int, int, int], seed: int) -> Image.Image:
    w, h = size
    x0, y0, x1, y1 = (int(v) for v in bounds)
    out, draw = layer(size)
    rng = np.random.default_rng(seed)
    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            nx, ny = (x - x0) / max(1, x1 - x0), (y - y0) / max(1, y1 - y0)
            fade = max(0, 1 - (nx * .78 + ny * .42)) ** 1.7
            a = int((11 + rng.integers(0, 10)) * fade)
            r = max(1, step // 11)
            draw.ellipse((x-r, y-r, x+r, y+r), fill=rgba(color, a))
    return out


def background(final: tuple[int, int], seed: int) -> Image.Image:
    """Ivory with barely-there tonal pools and one-percent film grain."""
    w, h = final
    y, x = np.mgrid[0:h, 0:w].astype(float)
    pixels = np.zeros((h, w, 3), dtype=float)
    pixels[:] = IVORY
    pools = [(.18, .22, 0.46, EMERALD, .020), (.84, .72, .35, TEAL, .013), (.56, .08, .28, GOLD, .010)]
    for cx, cy, radius, color, strength in pools:
        dist = ((x / w - cx) ** 2 + (y / h - cy) ** 2) / radius ** 2
        amount = np.exp(-dist * 3.5)[..., None] * strength
        pixels = pixels * (1 - amount) + np.asarray(color) * amount
    # 1% grain (roughly 2.55 levels) avoids sterile flat fields/banding.
    rng = np.random.default_rng(seed)
    pixels += rng.normal(0, 2.55, (h, w, 1))
    return Image.fromarray(np.uint8(np.clip(pixels, 0, 255)), "RGB").convert("RGBA")


def curve(draw: ImageDraw.ImageDraw, pts: list[tuple[int, int]], color: tuple[int, int, int], alpha: int, width: int) -> None:
    draw.line(pts, fill=rgba(color, alpha), width=width, joint="curve")


def chart(size: tuple[int, int], seed: int) -> Image.Image:
    w, h = size
    grid, gd = layer(size)
    # Fine, receding construction grid.
    for x in range(int(w*.10), int(w*.93), int(w*.085)):
        gd.line((x, h*.14, x, h*.84), fill=rgba(TEAL, 15), width=max(1, w//1700))
    for y in range(int(h*.18), int(h*.85), int(h*.11)):
        gd.line((w*.08, y, w*.94, y), fill=rgba(TEAL, 13), width=max(1, w//1700))
    anchors = [(w*.10,h*.73),(w*.20,h*.68),(w*.32,h*.71),(w*.43,h*.55),(w*.55,h*.61),(w*.66,h*.41),(w*.78,h*.46),(w*.91,h*.19)]
    path: list[tuple[int,int]] = []
    for a,b in zip(anchors, anchors[1:]):
        path += bezier([a,(a[0]+(b[0]-a[0])*.32,a[1]),(a[0]+(b[0]-a[0])*.70,b[1]),b], 42)[:-1]
    path.append((int(anchors[-1][0]), int(anchors[-1][1])))
    area, ad = layer(size)
    polygon = path + [(path[-1][0], int(h*.84)), (path[0][0], int(h*.84))]
    # Soft, layered area fill makes a gentle vertical gradient under the chart.
    for i in range(32):
        clipped = [(x, int(y + i * (h*.84-y)/32)) for x,y in path] + [(path[-1][0], int(h*.84)),(path[0][0], int(h*.84))]
        ad.polygon(clipped, fill=rgba(EMERALD if i < 19 else TEAL, 2))
    marks, md = layer(size)
    for offset, (color, a, width) in enumerate([(DEEP, 45, w//950), (EMERALD, 215, w//1450), (GOLD, 125, w//2400)]):
        shifted = [(x, y + offset - 1) for x,y in path]
        curve(md, shifted, color, a, max(2,width))
    for i, (x,y) in enumerate(anchors[1:]):
        r = w * (.009 if i in (2,5) else .0065)
        md.ellipse((x-r*1.75,y-r*1.75,x+r*1.75,y+r*1.75), fill=rgba(IVORY,230), outline=rgba(EMERALD,120), width=max(2,w//1100))
        md.ellipse((x-r,y-r,x+r,y+r), fill=rgba(GOLD if i==5 else EMERALD,235))
    return composite(grid, area, shadow_for(marks, w*.022, .055), marks, dot_matrix(size,(w*.67,h*.56,w*.94,h*.83),w//70,EMERALD,seed))


def network(size: tuple[int,int], seed:int) -> Image.Image:
    w,h=size; nodes=[(.15,.65),(.29,.35),(.43,.63),(.57,.24),(.68,.52),(.84,.30),(.88,.73),(.39,.84)]
    p=[(int(x*w),int(y*h)) for x,y in nodes]; art,d=layer(size)
    pairs=[(0,1),(0,2),(1,2),(1,3),(2,4),(2,7),(3,4),(3,5),(4,5),(4,6),(4,7),(5,6),(7,6)]
    for i,j in pairs:
        a,b=p[i],p[j]; dx,dy=b[0]-a[0],b[1]-a[1]
        control1=(a[0]+dx*.26-dy*.14,a[1]+dy*.26+dx*.14); control2=(a[0]+dx*.72-dy*.10,a[1]+dy*.72+dx*.10)
        curve(d,bezier([a,control1,control2,b],70),TEAL if (i+j)%3 else EMERALD,75,w//2200)
    for i,(x,y) in enumerate(p):
        r=w*(.013 if i in (3,4) else .009)
        d.ellipse((x-r*1.9,y-r*1.9,x+r*1.9,y+r*1.9),fill=rgba(IVORY,240),outline=rgba(EMERALD,80),width=max(2,w//1400))
        d.ellipse((x-r,y-r,x+r,y+r),fill=rgba(GOLD if i==3 else EMERALD,220))
    return composite(shadow_for(art,w*.026,.05),art,dot_matrix(size,(w*.08,h*.12,w*.51,h*.48),w//72,TEAL,seed))


def gauge(size: tuple[int,int], seed:int) -> Image.Image:
    w,h=size; cx,cy=w*.50,h*.64; art,d=layer(size)
    for n,(radius,color,start,end,width,alpha) in enumerate([(w*.30,DEEP,204,336,w//70,70),(w*.255,TEAL,204,326,w//64,115),(w*.210,EMERALD,204,312,w//58,220),(w*.165,GOLD,204,276,w//72,190)]):
        box=(cx-radius,cy-radius,cx+radius,cy+radius); d.arc(box,start,end,fill=rgba(color,alpha),width=width)
        if n<3: d.arc(box,end+5,end+18,fill=rgba(color,45),width=max(2,width//2))
    # Needle with a slight gold glow and a clean hub.
    angle=math.radians(292); length=w*.225; tip=(cx+math.cos(angle)*length,cy+math.sin(angle)*length)
    d.line((cx,cy,*tip),fill=rgba(GOLD,50),width=w//65)
    d.line((cx,cy,*tip),fill=rgba(GOLD,230),width=w//180)
    r=w*.028; d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=rgba(IVORY,245),outline=rgba(GOLD,190),width=w//700); d.ellipse((cx-r*.39,cy-r*.39,cx+r*.39,cy+r*.39),fill=rgba(GOLD,230))
    return composite(shadow_for(art,w*.035,.055),art,dot_matrix(size,(w*.14,h*.18,w*.43,h*.42),w//76,EMERALD,seed))


def platforms(size: tuple[int,int], seed:int) -> Image.Image:
    w,h=size; art,d=layer(size)
    def slab(cx,cy,ww,hh,depth,color,alpha):
        top=[(cx,cy-hh),(cx+ww,cy-hh*.45),(cx,cy),(cx-ww,cy-hh*.45)]
        left=[top[3],top[2],(cx,cy+depth),(cx-ww,cy-hh*.45+depth)]
        right=[top[2],top[1],(cx+ww,cy-hh*.45+depth),(cx,cy+depth)]
        d.polygon(top,fill=rgba(color,alpha),outline=rgba(DEEP,45));d.polygon(left,fill=rgba(TEAL,alpha//2),outline=rgba(DEEP,30));d.polygon(right,fill=rgba(DEEP,alpha//3),outline=rgba(DEEP,30))
    slab(w*.52,h*.75,w*.27,h*.105,h*.055,TEAL,90)
    slab(w*.48,h*.62,w*.22,h*.088,h*.048,EMERALD,145)
    slab(w*.53,h*.49,w*.16,h*.070,h*.043,DEEP,175)
    slab(w*.49,h*.38,w*.105,h*.052,h*.036,GOLD,185)
    # tiny structural connection pins
    for x,y in [(w*.48,h*.55),(w*.58,h*.56),(w*.47,h*.68),(w*.61,h*.69)]: d.ellipse((x-w*.006,y-w*.006,x+w*.006,y+w*.006),fill=rgba(IVORY,220),outline=rgba(EMERALD,130),width=max(2,w//1600))
    return composite(shadow_for(art,w*.04,.06),art,dot_matrix(size,(w*.10,h*.16,w*.42,h*.50),w//70,TEAL,seed))


def pulse(size:tuple[int,int], seed:int) -> Image.Image:
    w,h=size; grid,d=layer(size)
    step=w//29
    for x in range(0,w+1,step): d.line((x,0,x,h),fill=rgba(TEAL,12),width=max(1,w//2000))
    for y in range(0,h+1,step): d.line((0,y,w,y),fill=rgba(TEAL,12),width=max(1,w//2000))
    y=h*.55; pts=[(w*.09,y),(w*.22,y),(w*.27,y-w*.025),(w*.31,y+w*.03),(w*.35,y-w*.25),(w*.40,y+w*.17),(w*.45,y-w*.06),(w*.50,y),(w*.66,y),(w*.71,y-w*.028),(w*.75,y+w*.035),(w*.79,y-w*.17),(w*.84,y+w*.10),(w*.90,y)]
    art,d=layer(size)
    for color,a,width in [(DEEP,42,w//480),(EMERALD,220,w//1050),(GOLD,150,w//2600)]: curve(d,[(int(x),int(yy)) for x,yy in pts],color,a,max(2,width))
    return composite(grid,shadow_for(art,w*.025,.06),art,dot_matrix(size,(w*.09,h*.16,w*.36,h*.38),w//70,EMERALD,seed))


RENDERERS={"slide-1":chart,"slide-2":network,"slide-3":gauge,"slide-4":platforms,"slide-5":pulse,
           "checkout-service":gauge,"payments-db":platforms,"api-gateway":network,"incidents":pulse}


def render(name:str, final:tuple[int,int], seed:int, folder:str)->Path:
    high=(final[0]*SCALE,final[1]*SCALE)
    image=background(high,seed)
    image=composite(image,RENDERERS[name](high,seed))
    image=image.resize(final,Image.Resampling.LANCZOS).convert("RGB")
    path=ART/folder/f"{name}.png"; path.parent.mkdir(parents=True,exist_ok=True)
    image.save(path,format="PNG",optimize=True,compress_level=6)
    return path


def main()->None:
    jobs=[(f"slide-{i}",(2400,1350),"slides") for i in range(1,6)] + [(x,(1200,1200),"light") for x in ("checkout-service","payments-db","api-gateway","incidents")]
    paths=[render(name,size,701+i*101,folder) for i,(name,size,folder) in enumerate(jobs)]
    for path in paths: print(f"{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes")


if __name__ == "__main__": main()
