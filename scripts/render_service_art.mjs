#!/usr/bin/env node
/** Render service artwork in the same visual system as generate_art.py. */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve('public/art');
const S = 2, W = 1200 * S, H = 1200 * S;
const C = { green: [12,59,46], teal: [23,89,74], black: [8,31,24], ivory: '#f6f5f0', gold: '#a87c1f' };
const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
function random(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
function mesh(seed, variant) {
  const r = random(seed), pools = [[.72,.20,.88],[.20+.08*variant,.78,.52],[.80,.83,.34]];
  const radii = pools.map(() => [.30 + (r()-.5)*.13, .28 + (r()-.5)*.13]);
  const pix = Buffer.alloc(W * H * 3); let p = 0;
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    const nx=x/W, ny=y/H, d=smooth(.22+.55*(.75*nx+.25*(1-ny))); let rgb=C.black.map((v,i)=>v*(1-d)+C.green[i]*d);
    pools.forEach(([cx,cy,strength], i) => { const [rx,ry]=radii[i]; const pool=Math.exp(-(((nx-cx)/rx)**2+((ny-cy)/ry)**2)*2.2); const a=clamp(pool*strength,0,.8), target=strength>.6?C.teal:C.green; rgb=rgb.map((v,j)=>v*(1-a)+target[j]*a); });
    const grain=(r()-.5)*3.3; pix[p++]=clamp(Math.round(rgb[0]+grain),0,255); pix[p++]=clamp(Math.round(rgb[1]+grain),0,255); pix[p++]=clamp(Math.round(rgb[2]+grain),0,255);
  }
  return pix;
}
const svg = body => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="soft"><feGaussianBlur stdDeviation="0.7"/></filter></defs><g filter="url(#soft)" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const line = (d, stroke=C.ivory, opacity=.10, width=5) => `<path d="${d}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
function rings() { let s=''; for(let i=0;i<8;i++){const r=260+i*125;s+=`<path d="M ${1340-r} 1260 A ${r} ${r} 0 0 1 ${1340+r*.75} ${1260-r*.66}" stroke="${C.ivory}" stroke-opacity=".095" stroke-width="5"/><path d="M ${1340-r*.4} ${1260+r*.92} A ${r} ${r} 0 0 0 ${1340+r*.96} ${1260+r*.28}" stroke="${C.gold}" stroke-opacity=".17" stroke-width="5"/>`; } return s; }
function database(){ let s=''; for(let i=0;i<5;i++){const y=780+i*150, rx=430-i*20, ry=110;s+=`<path d="M ${1200-rx} ${y} a ${rx} ${ry} 0 0 0 ${rx*2} 0 v 90 a ${rx} ${ry} 0 0 1 ${-rx*2} 0z" stroke="${C.ivory}" stroke-opacity=".10" stroke-width="5"/><ellipse cx="1200" cy="${y}" rx="${rx}" ry="${ry}" stroke="${i%2?C.ivory:C.gold}" stroke-opacity="${i%2?.10:.19}" stroke-width="5"/>`; } return s; }
function network(){ let s=''; const pts=[]; for(let row=0;row<5;row++)for(let col=0;col<6;col++)pts.push([360+col*340+(row%2)*90,390+row*390]); for(let row=0;row<5;row++)for(let col=0;col<6;col++){const a=pts[row*6+col]; if(col<5)s+=line(`M${a[0]} ${a[1]} L${pts[row*6+col+1][0]} ${pts[row*6+col+1][1]}`,C.ivory,.09,4);if(row<4)s+=line(`M${a[0]} ${a[1]} L${pts[(row+1)*6+col][0]} ${pts[(row+1)*6+col][1]}`,C.gold,.13,4);} return s+pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3===0?15:10}" fill="${i%3===0?C.gold:C.ivory}" fill-opacity="${i%3===0?.24:.14}"/>`).join(''); }
function pulse(){ const d='M 120 1320 L 520 1320 L 680 1305 L 790 1350 L 910 1190 L 1040 1640 L 1210 690 L 1370 1450 L 1510 1240 L 1660 1320 L 2280 1320'; let s=line(d,C.gold,.64,13)+line(d,C.ivory,.17,5); for(let y=420;y<2100;y+=270)s+=line(`M 170 ${y} L 2230 ${y}`,C.ivory,.045,3); return s; }
function gauge(){ let s=''; for(let i=0;i<5;i++){const r=560+i*110;s+=`<path d="M ${1200-r} 1670 A ${r} ${r} 0 0 1 ${1200+r} 1670" stroke="${i%2?C.ivory:C.gold}" stroke-opacity="${i%2?.09:.19}" stroke-width="6"/>`; } for(let i=0;i<13;i++){const a=Math.PI+Math.PI*i/12, r1=510,r2=570, x1=1200+Math.cos(a)*r1,y1=1670+Math.sin(a)*r1,x2=1200+Math.cos(a)*r2,y2=1670+Math.sin(a)*r2;s+=line(`M ${x1} ${y1} L ${x2} ${y2}`,i===9?C.gold:C.ivory,i===9?.42:.13,7);} return s+line('M 1200 1670 L 1575 1060',C.gold,.58,12)+`<circle cx="1200" cy="1670" r="22" fill="${C.gold}" fill-opacity=".58"/>`; }
const jobs = [ ['checkout-service', rings], ['payments-db', database], ['api-gateway', network], ['incidents', pulse], ['latency', gauge] ];
await mkdir(OUT, {recursive:true});
for (let i=0;i<jobs.length;i++) {
  const [name, motif] = jobs[i];
  // Rasterize the SVG explicitly: libvips otherwise applies SVG density when compositing.
  const detail = await sharp(Buffer.from(svg(motif())), { density: 72 }).resize(1200, 1200, { kernel: 'lanczos3' }).png().toBuffer();
  const base = await sharp(mesh(1493+i*137,i%5), {raw:{width:W,height:H,channels:3}}).resize(1200, 1200, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp(base).composite([{input:detail}]).removeAlpha().png({compressionLevel:6, adaptiveFiltering:true}).toFile(resolve(OUT,`${name}.png`));
}
