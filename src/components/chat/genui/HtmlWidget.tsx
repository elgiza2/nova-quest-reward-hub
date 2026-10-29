/** @doc Renders a model-written ```widget HTML block inside a sandboxed iframe
 *  (scripts allowed, no same-origin — it cannot touch the app or the session).
 *  A built-in stylesheet gives every widget the same clean look; the widget
 *  calls megsy.send("text") to answer the agent and auto-sizes to its content. */
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GenUIActionContext } from "./GenUIBlock";
import { connectFromWidget } from "./connectFromWidget";

/* MagicOS-style frosted glass kit: soft tinted glass, squircle radii, crisp text. */
const BASE_CSS = `
:root{--fg:#0f1115;--muted:#5d6370;--line:rgba(15,17,21,.08);--glass:rgba(255,255,255,.72);--glass2:rgba(255,255,255,.5);--soft:rgba(15,17,21,.045);--hi:rgba(255,255,255,.9);--accent:#2f6bff;--accent2:#7a5cff;--accent-fg:#fff;--good:#12a150;--warn:#e08a00;--bad:#e5484d;--info:#2f6bff;--r:26px;--rs:18px;--sh:0 1px 1px rgba(0,0,0,.03),0 18px 40px -20px rgba(20,30,60,.28)}
html.dark{--fg:#f4f5f7;--muted:#a1a6b2;--line:rgba(255,255,255,.09);--glass:rgba(34,36,42,.66);--glass2:rgba(255,255,255,.06);--soft:rgba(255,255,255,.06);--hi:rgba(255,255,255,.14);--accent:#5b8cff;--accent2:#9b84ff;--sh:0 1px 1px rgba(0,0,0,.2),0 22px 44px -22px rgba(0,0,0,.7)}
*{box-sizing:border-box;margin:0}
html,body{background:transparent;color:var(--fg);font:14.5px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","HONOR Sans","Segoe UI","IBM Plex Sans Arabic",Tahoma,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:4px}
h1,h2,h3{letter-spacing:-.015em;line-height:1.25;font-weight:700}h1{font-size:24px}h2{font-size:19px}h3{font-size:15.5px}
p{color:var(--muted)}ul,ol{padding-inline-start:20px}li+li{margin-top:4px}
img{max-width:100%;display:block;border-radius:var(--rs);object-fit:cover;background:var(--soft)}
.card{position:relative;overflow:hidden;isolation:isolate;background:radial-gradient(120% 80% at 0% 0%,color-mix(in srgb,#4f8bff 38%,transparent),transparent 60%),radial-gradient(90% 70% at 100% 10%,color-mix(in srgb,#b06bff 34%,transparent),transparent 60%),radial-gradient(100% 80% at 70% 110%,color-mix(in srgb,#ff7aa8 30%,transparent),transparent 60%),radial-gradient(80% 60% at 0% 100%,color-mix(in srgb,#2fd3c0 28%,transparent),transparent 60%),var(--glass);border:1px solid rgba(255,255,255,.55);border-radius:var(--r);padding:18px;box-shadow:var(--sh),inset 0 1px 0 var(--hi)}
html.dark .card{border-color:rgba(255,255,255,.12)}
.card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(160deg,rgba(255,255,255,.35),transparent 40%);pointer-events:none}
.card>*{position:relative}
.glass,.tile,.stat{background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.6);border-radius:var(--rs);padding:14px;backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 6px 18px -12px rgba(20,30,60,.35)}
html.dark .glass,html.dark .tile,html.dark .stat{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(96px,1fr))}.g2{grid-template-columns:1fr 1fr}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.between{justify-content:space-between}.center{justify-content:center;text-align:center}
.stack>*+*{margin-top:14px}
.stat b{display:block;font-size:22px;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.stat span{font-size:12px;color:var(--muted)}
.stat .ic,.ic{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;font-size:18px;margin-bottom:8px;background:linear-gradient(135deg,var(--c,#4f8bff),color-mix(in srgb,var(--c,#4f8bff) 55%,#fff));color:#fff;box-shadow:0 6px 14px -6px var(--c,#4f8bff)}
.c1{--c:#3b82f6}.c2{--c:#a855f7}.c3{--c:#f43f5e}.c4{--c:#10b981}.c5{--c:#f59e0b}.c6{--c:#06b6d4}
.stat[class*=" c"],.tile[class*=" c"]{background:linear-gradient(150deg,color-mix(in srgb,var(--c) 22%,rgba(255,255,255,.45)),rgba(255,255,255,.35))}
html.dark .stat[class*=" c"],html.dark .tile[class*=" c"]{background:linear-gradient(150deg,color-mix(in srgb,var(--c) 26%,transparent),rgba(255,255,255,.05))}
.hero{position:relative;margin:-18px -18px 14px;height:170px;overflow:hidden;background:linear-gradient(135deg,#4f8bff,#b06bff)}.hero img{width:100%;height:100%;border-radius:0}.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.6))}.hero>div{position:absolute;inset:auto 16px 14px;z-index:1;color:#fff}.hero h2,.hero h3{color:#fff}.hero p{color:rgba(255,255,255,.85)}
.thumb{width:56px;height:56px;border-radius:16px;flex:0 0 auto}
.sec{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.02em;margin-bottom:-4px}
hr{border:0;height:1px;background:var(--line)}
.big{font-size:56px;font-weight:300;letter-spacing:-.05em;line-height:1}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:600;background:var(--soft);border:1px solid var(--line)}
.good{color:var(--good)}.warn{color:var(--warn)}.bad{color:var(--bad)}.info{color:var(--info)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:currentColor}
button,.btn{font:inherit;font-weight:600;border:1px solid var(--line);background:var(--glass2);color:var(--fg);padding:10px 18px;border-radius:999px;cursor:pointer;transition:transform .15s,background .15s;backdrop-filter:blur(12px)}
button:hover{background:var(--soft)}button:active{transform:scale(.96)}
button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-fg);border-color:transparent;width:100%;padding:13px;box-shadow:0 10px 24px -12px var(--accent)}
button.ok{background:color-mix(in srgb,var(--good) 16%,transparent);color:var(--good);border-color:color-mix(in srgb,var(--good) 30%,transparent);flex:1}
button.no{background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad);border-color:color-mix(in srgb,var(--bad) 26%,transparent);flex:1}
.chip{border-radius:16px;padding:11px 14px;text-align:start}.chip.on,.chip[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.seg{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--soft)}.seg button{flex:1;border:0;background:transparent;padding:8px}.seg button.on{background:var(--glass);box-shadow:var(--sh)}
input,select,textarea{font:inherit;width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:16px;background:var(--glass2);color:var(--fg);outline:none}input:focus,textarea:focus{border-color:var(--accent)}
input[type=range]{padding:0;accent-color:var(--accent);background:none;border:0}input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent)}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:start;font-size:12px;color:var(--muted);font-weight:600;padding:9px 10px}td{padding:10px;border-top:1px solid var(--line)}
.bar{height:8px;border-radius:99px;background:var(--soft);overflow:hidden}.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .4s}
.timeline{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory}.timeline>*{flex:0 0 160px;scroll-snap-align:start}
.kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kanban>div{background:var(--soft);border-radius:var(--rs);padding:8px;min-height:80px}.kanban .tile{padding:10px;margin-top:6px;font-size:13px;cursor:pointer}
details{border:1px solid var(--line);border-radius:14px;padding:8px 12px;background:var(--glass2)}details details{margin-top:6px}summary{cursor:pointer;font-weight:600}
.seats{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}.seat{aspect-ratio:1;border-radius:8px;padding:0}.seat.on{background:var(--accent);color:var(--accent-fg)}.seat[disabled]{opacity:.3}
.swatch{height:64px;border-radius:14px;border:1px solid var(--line)}
pre,code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px}pre{background:#0f1115;color:#e7e9ee;padding:14px;border-radius:var(--rs);overflow:auto;direction:ltr}
svg text{fill:currentColor;font-family:inherit}
/* flat, borderless: blend into the conversation */
body{padding:0}
.card{background:transparent!important;border:0!important;box-shadow:none!important;padding:0;overflow:visible;border-radius:0}
.card::before{display:none}
.glass,.tile,.stat{border:0!important;box-shadow:none!important;backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--soft)}
.stat[class*=" c"],.tile[class*=" c"],html.dark .stat[class*=" c"],html.dark .tile[class*=" c"]{background:color-mix(in srgb,var(--c) 9%,transparent)}
.stat .ic,.ic{width:auto;height:auto;background:none!important;box-shadow:none!important;color:var(--c,var(--accent));font-size:15px;opacity:.85;margin-bottom:4px;display:block}
.hero{margin:0 0 14px;border-radius:var(--rs)}
details,button,.btn,input,select,textarea,.badge,.swatch{border-color:transparent}
button.primary,button.ok,button.no,button.fx{--round:.75rem;position:relative;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border:none!important;outline:none;padding:12px 18px;min-height:48px;border-radius:var(--round);color:#fff!important;box-shadow:none;backdrop-filter:none;transition:all .25s ease;background:radial-gradient(65.28% 65.28% at 50% 100%,rgba(223,113,255,.8) 0%,rgba(223,113,255,0) 100%),linear-gradient(0deg,#7a5af8,#7a5af8)}
button.ok{background:radial-gradient(65.28% 65.28% at 50% 100%,rgba(110,255,170,.7) 0%,rgba(110,255,170,0) 100%),linear-gradient(0deg,#12a150,#12a150)}
button.no{background:radial-gradient(65.28% 65.28% at 50% 100%,rgba(255,140,150,.75) 0%,rgba(255,140,150,0) 100%),linear-gradient(0deg,#e5484d,#e5484d)}
button.primary::before,button.ok::before,button.no::before,button.fx::before{content:"";position:absolute;inset:1px;border-radius:calc(var(--round) - 1px);z-index:0;background:linear-gradient(177.95deg,rgba(255,255,255,.19) 0%,rgba(255,255,255,0) 100%)}
button.primary:active,button.ok:active,button.no:active,button.fx:active{transform:scale(.95)}
.fold{z-index:1;position:absolute;top:0;right:0;height:1.15rem;width:1.15rem;transition:all .5s ease-in-out;background:radial-gradient(100% 75% at 55%,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 100%);border-bottom-left-radius:.6rem;border-top-right-radius:var(--round);overflow:hidden}
.fold::after{content:"";position:absolute;top:0;right:0;width:130%;height:130%;transform:rotate(45deg) translateY(-19px);background:linear-gradient(225deg,#fff 0%,rgba(255,255,255,.75) 60%,rgba(255,255,255,0) 100%);pointer-events:none}
button:hover .fold{margin-top:-1rem;margin-right:-1rem}
.points_wrapper{overflow:hidden;pointer-events:none;position:absolute;inset:0;z-index:1}
.points_wrapper .point{bottom:-10px;position:absolute;animation:floating-points infinite ease-in-out;width:2px;height:2px;background:#fff;border-radius:9999px}
@keyframes floating-points{0%{transform:translateY(0)}85%{opacity:0}100%{transform:translateY(-55px);opacity:0}}
.point:nth-child(1){left:10%;animation-duration:2.35s;animation-delay:.2s}.point:nth-child(2){left:30%;opacity:.7;animation-duration:2.5s;animation-delay:.5s}.point:nth-child(3){left:25%;opacity:.8;animation-duration:2.2s;animation-delay:.1s}.point:nth-child(4){left:44%;opacity:.6;animation-duration:2.05s}.point:nth-child(5){left:50%;animation-duration:1.9s}.point:nth-child(6){left:75%;opacity:.5;animation-duration:1.5s;animation-delay:1.5s}.point:nth-child(7){left:88%;opacity:.9;animation-duration:2.2s;animation-delay:.2s}.point:nth-child(8){left:58%;opacity:.8;animation-duration:2.25s;animation-delay:.2s}.point:nth-child(9){left:98%;opacity:.6;animation-duration:2.6s;animation-delay:.1s}.point:nth-child(10){left:65%;animation-duration:2.5s;animation-delay:.2s}
.inner{z-index:2;gap:6px;position:relative;width:100%;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;line-height:1.5}

img:not([src]),img[src=""],.thumb:not([src]){display:none}
.hero:not(:has(img[src])){height:auto;background:none}.hero:not(:has(img[src]))::after{display:none}.hero:not(:has(img[src]))>div{position:static;color:var(--fg)}.hero:not(:has(img[src])) h2,.hero:not(:has(img[src])) h3{color:var(--fg)}.hero:not(:has(img[src])) p{color:var(--muted)}
.glass:empty,.tile:empty,.stat:empty,.grid:empty,.card:empty,div:empty:not(.bar>i):not(.swatch):not(.dot):not([style]){display:none}
.muted{color:var(--muted)}.small{font-size:12px}
/* clean saturated tiles: solid color + bottom glow + rising dots (same treatment as the action buttons) */
:root{--accent:#7a5af8;--accent2:#ffd23f;--info:#7a5af8}
html.dark{--accent:#9b86ff;--accent2:#ffd76a;--info:#b7a4ff}
.c1{--c:#7a5af8;--glow:rgba(223,113,255,.85)}
.c2{--c:#2f6bff;--glow:rgba(125,180,255,.85)}
.c3{--c:#e8a33d;--glow:rgba(255,214,140,.9);--tfg:#2a1c04}
.c4{--c:#ffd23f;--glow:rgba(255,244,180,.95);--tfg:#2a1c04}
.c5{--c:#6d4de0;--glow:rgba(185,155,255,.85)}
.c6{--c:#00a8d9;--glow:rgba(125,225,255,.85)}
.stat[class*=" c"],.tile[class*=" c"],html.dark .stat[class*=" c"],html.dark .tile[class*=" c"]{position:relative;isolation:isolate;overflow:hidden;border:0!important;box-shadow:none;border-radius:20px;padding:14px;color:var(--tfg,#fff);background:radial-gradient(65.28% 65.28% at 50% 100%,var(--glow) 0%,rgba(255,255,255,0) 100%),linear-gradient(0deg,var(--c),var(--c))!important;backdrop-filter:none;-webkit-backdrop-filter:none}
.stat[class*=" c"]::before,.tile[class*=" c"]::before{content:"";position:absolute;inset:1px;border-radius:19px;z-index:0;pointer-events:none;background:linear-gradient(177.95deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 100%)}
.stat[class*=" c"]>*:not(.points_wrapper),.tile[class*=" c"]>*:not(.points_wrapper){position:relative;z-index:2}
.stat[class*=" c"] b,.tile[class*=" c"] b,.stat[class*=" c"] .big,.tile[class*=" c"] .big{color:var(--tfg,#fff)}
.stat[class*=" c"] span:not(.ic),.tile[class*=" c"] span:not(.ic),html.dark .stat[class*=" c"] span:not(.ic){color:color-mix(in srgb,var(--tfg,#fff) 78%,transparent)}
.stat[class*=" c"] .ic,.tile[class*=" c"] .ic{color:var(--tfg,#fff);opacity:.9}
.stat[class*=" c"] .bar,.tile[class*=" c"] .bar{background:color-mix(in srgb,var(--tfg,#fff) 22%,transparent)}
.stat[class*=" c"] .bar>i,.tile[class*=" c"] .bar>i{background:var(--tfg,#fff)}
.hero{background:linear-gradient(120deg,#4b2fd6,#7a5af8 42%,#e8a33d)}
.bar>i{background:linear-gradient(90deg,#7a5af8,#ffd23f)}
.big{background:linear-gradient(135deg,#7a5af8,#e8a33d);-webkit-background-clip:text;background-clip:text;color:transparent}
.points_wrapper .point{background:var(--tfg,#fff)}
.stat[class*=" c"] *,.tile[class*=" c"] *{color:inherit}
.stat[class*=" c"] .small,.tile[class*=" c"] .small{opacity:.85}
/* 2 or 4 tiles fill the row evenly instead of leaving a half-empty last row */
.grid:has(> :nth-child(2):last-child),.grid:has(> :nth-child(4):last-child){grid-template-columns:1fr 1fr}
/* Bars: Uiverse style (violet fill, pink glow, gloss, moving sparkle) */
.bar{height:12px;border-radius:99px;background:color-mix(in srgb,#7a5af8 12%,transparent);overflow:hidden;position:relative}
.bar>i{position:relative;overflow:hidden;border-radius:99px;background:radial-gradient(65% 120% at 50% 100%,rgba(255,105,180,.85) 0%,rgba(255,255,255,0) 100%),linear-gradient(90deg,#7a5af8,#9b7dff)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 12px -4px #7a5af8;animation:barIn .9s cubic-bezier(.2,.8,.2,1) both;transform-origin:left}
.bar>i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);width:40%;animation:barShine 2.4s ease-in-out infinite}
.bar>i.c2,.bar.c2>i{background:radial-gradient(65% 120% at 50% 100%,rgba(120,200,255,.8),transparent),linear-gradient(90deg,#2f6bff,#5b8cff)!important;box-shadow:0 4px 12px -4px #2f6bff}
.bar>i.c3,.bar.c3>i{background:radial-gradient(65% 120% at 50% 100%,rgba(255,230,150,.9),transparent),linear-gradient(90deg,#e8a33d,#f5c26b)!important;box-shadow:0 4px 12px -4px #e8a33d}
.bar>i.c4,.bar.c4>i{background:radial-gradient(65% 120% at 50% 100%,rgba(255,250,200,.9),transparent),linear-gradient(90deg,#f5c400,#ffd23f)!important;box-shadow:0 4px 12px -4px #ffd23f}
@keyframes barIn{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes barShine{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
/* Vertical columns chart: <div class="cols"><div class="col"><i style="height:70%"></i><span>Jan</span></div>...</div> */
.cols{display:flex;align-items:flex-end;gap:10px;height:160px;padding-top:8px}
.col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px;min-width:0}
.col>span{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.col>b{font-size:12px}
.col>i{display:block;width:100%;max-width:44px;border-radius:14px 14px 8px 8px;position:relative;overflow:hidden;isolation:isolate;background:radial-gradient(80% 50% at 50% 100%,rgba(255,105,180,.85) 0%,rgba(255,255,255,0) 100%),linear-gradient(0deg,#7a5af8,#9b7dff);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 10px 20px -12px #7a5af8;animation:colIn .9s cubic-bezier(.2,.8,.2,1) both;transform-origin:bottom}
.col:nth-child(4n+2)>i{background:radial-gradient(80% 50% at 50% 100%,rgba(120,200,255,.85),transparent),linear-gradient(0deg,#2f6bff,#5b8cff)}
.col:nth-child(4n+3)>i{background:radial-gradient(80% 50% at 50% 100%,rgba(255,230,150,.95),transparent),linear-gradient(0deg,#e8a33d,#f5c26b)}
.col:nth-child(4n+4)>i{background:radial-gradient(80% 50% at 50% 100%,rgba(255,250,200,.95),transparent),linear-gradient(0deg,#f5c400,#ffd23f)}
.col>i::before{content:"";position:absolute;inset:1px;border-radius:13px 13px 7px 7px;background:linear-gradient(178deg,rgba(255,255,255,.3),rgba(255,255,255,0) 60%);z-index:0}
@keyframes colIn{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.suggestions,.suggest,.followups,.follow-ups,.related{display:none!important}
/* no icons, no shadows: words, numbers, colour, bars and photos only */
.ic,.ic *{display:none!important}
*{box-shadow:none!important;text-shadow:none!important}
/* Tree / mind map: <div class="tree"><div class="node c1">root</div><ul><li><div class="node c2">branch</div><ul><li><div class="node">leaf</div></li></ul></li></ul></div> */
.tree{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.tree ul{list-style:none;padding:0;margin:0 0 0 14px;padding-inline-start:16px;border-inline-start:2px solid color-mix(in srgb,#7a5af8 35%,transparent);display:flex;flex-direction:column;gap:8px}
.tree li{position:relative}
.tree li::before{content:"";position:absolute;inset-inline-start:-16px;top:18px;width:14px;height:2px;background:color-mix(in srgb,#7a5af8 35%,transparent)}
.tree ul ul{margin-top:8px}
.node{display:inline-block;padding:9px 14px;border-radius:16px;background:var(--soft);font-size:13px;font-weight:600;cursor:default}
.node[data-send]{cursor:pointer}
.node small{display:block;font-weight:400;font-size:11.5px;opacity:.8;margin-top:2px}
.node[class*=" c"]{position:relative;overflow:hidden;color:var(--tfg,#fff);background:radial-gradient(65% 65% at 50% 100%,var(--glow) 0%,rgba(255,255,255,0) 100%),var(--c)}
/* Email composer */
.mail{display:flex;flex-direction:column;gap:8px}
.mail label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);padding:8px 12px;border-radius:14px;background:var(--soft)}
.mail label input{flex:1;border:0!important;background:transparent!important;padding:0!important;font-size:13px;color:var(--fg);outline:none}
.mail textarea{width:100%;min-height:150px;resize:vertical;border:0;border-radius:16px;padding:12px;background:var(--soft);color:var(--fg);font:inherit;font-size:13px;line-height:1.7;outline:none}
/* App connect card */
.connect{display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;background:var(--soft)}
.connect .app{width:44px;height:44px;border-radius:14px;flex:0 0 auto;display:grid;place-items:center;font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,#7a5af8,#2f6bff)}
.connect .app img{width:28px;height:28px;object-fit:contain}
.connect>div{flex:1;min-width:0}
/* Priority matrix 2x2 */
.matrix{display:grid;grid-template-columns:1fr 1fr;gap:8px}
/* Compact rectangular submit actions; retain the gloss and floating points. */
.row:has(>button),.actions,.btns{display:flex!important;flex-wrap:wrap;gap:8px!important;align-items:center;margin-top:12px}.chips,.row:has(>.chip){display:flex!important;flex-wrap:wrap;gap:6px!important;margin:8px 0}.chip{min-height:32px;padding:6px 12px;border-radius:999px;font-size:13px;line-height:1.2;flex:0 0 auto}button.ok,button.no,button:not(.chip):not(.primary){min-height:34px;padding:6px 14px;border-radius:8px;font-size:13px;width:auto!important;flex:0 0 auto}button+button{margin:0}input,textarea,select{width:100%;box-sizing:border-box;margin:6px 0}form>button,.mail button,.card>button:last-child{margin-top:10px}button.primary{--round:8px;width:auto!important;max-width:100%;min-width:72px;min-height:34px;padding:6px 14px;flex:0 0 auto;font-size:13px}
button.primary .inner{font-size:13px;line-height:1.5}
button.primary .fold{width:.8rem;height:.8rem}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

const BRIDGE = `<script>
window.megsy={send:function(t){parent.postMessage({__megsy:'send',id:window.name,text:String(t)},'*')},connect:function(a){parent.postMessage({__megsy:'connect',id:window.name,app:String(a)},'*')}};
window.addEventListener('message',function(e){var d=e.data||{};if(d.__megsyHost!=='connect')return;document.querySelectorAll('[data-connect="'+d.app+'"]').forEach(function(b){b.disabled=d.state==='busy';var t=b.querySelector('.inner')||b;if(d.state==='busy')t.textContent=b.dataset.busy||'...';if(d.state==='ok'){t.textContent=b.dataset.done||'Connected';b.classList.add('ok')}if(d.state==='err')t.textContent=b.dataset.retry||'Retry'})});
function pts(el){if(el.dataset.pts)return;el.dataset.pts='1';var w=document.createElement('span');w.className='points_wrapper';w.innerHTML='<i class="point"></i>'.repeat(10);el.insertBefore(w,el.firstChild)}
function fxb(){var re=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F2FF}\\u{FE0F}\\u{200D}]/gu;var w=document.createTreeWalker(document.body,4);var n;while(n=w.nextNode()){if(/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(n.nodeValue))n.nodeValue=n.nodeValue.replace(re,'')}document.querySelectorAll('.ic').forEach(function(e){e.remove()});document.querySelectorAll('.stat svg,.tile svg,.sec svg,.badge svg').forEach(function(s){var b=s.getBoundingClientRect();if(b.width<=34&&b.height<=34)s.remove()});var ci=0;document.querySelectorAll('.stat').forEach(function(e){if(!/\\bc[1-6]\\b/.test(e.className)){e.classList.add(['c1','c2','c3','c4'][ci%4]);}ci++});document.querySelectorAll('.stat[class*=" c"],.tile[class*=" c"],.col>i').forEach(pts);var L=document.body&&document.body.lastElementChild;while(L&&L.tagName==='SCRIPT')L=L.previousElementSibling;if(L&&!L.dataset.keep){var bs=L.querySelectorAll('button,.chip,a');var ok=bs.length>1&&!L.querySelector('input,select,textarea,.ok,.no,.stat,.tile,.bar,.cols,svg,canvas,img');if(ok){var all=true;bs.forEach(function(b){if(!b.hasAttribute('data-send'))all=false});if(all&&L.textContent.trim().length<400)L.remove()}}document.querySelectorAll('button.primary,button.ok,button.no,button.fx').forEach(function(b){if(b.dataset.fx)return;b.dataset.fx='1';var i=document.createElement('span');i.className='inner';while(b.firstChild)i.appendChild(b.firstChild);b.innerHTML='<span class="fold"></span><span class="points_wrapper">'+'<i class="point"></i>'.repeat(10)+'</span>';b.appendChild(i)})}document.readyState!=='loading'?fxb():document.addEventListener('DOMContentLoaded',fxb);new MutationObserver(function(){fxb()}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',function(e){var c=e.target.closest('.chip[data-toggle],.seat:not([disabled])');if(c)c.classList.toggle('on');var s=e.target.closest('.seg button');if(s){s.parentNode.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b===s)})}var cn=e.target.closest('[data-connect]');if(cn&&!cn.disabled){e.preventDefault();megsy.connect(cn.getAttribute('data-connect'));return}var el=e.target.closest('[data-send]');if(el){e.preventDefault();megsy.send(el.getAttribute('data-send')||el.textContent.trim())}});
function __h(){parent.postMessage({__megsy:'h',id:window.name,h:Math.ceil(document.body.getBoundingClientRect().height)+8},'*')}
document.addEventListener('error',function(e){if(e.target.tagName==='IMG'){e.target.remove();__h()}},true);document.querySelectorAll('img[data-q]').forEach(function(im){fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=800&gsrsearch='+encodeURIComponent(im.getAttribute('data-q'))).then(function(r){return r.json()}).then(function(j){var p=Object.values((j.query||{}).pages||{}).sort(function(a,b){return a.index-b.index}).find(function(x){return x.thumbnail});if(p){im.src=p.thumbnail.source}else{im.remove()}__h()}).catch(function(){im.remove();__h()})});
new ResizeObserver(__h).observe(document.body);addEventListener('load',__h);document.addEventListener('load',__h,true);[50,300,1000,2500].forEach(function(t){setTimeout(__h,t)});
</script>`;

export function HtmlWidget({ html, done }: { html: string; done: boolean }) {
  const onSend = useContext(GenUIActionContext);
  const ref = useRef<HTMLIFrameElement>(null);
  const id = useMemo(() => `w${Math.random().toString(36).slice(2)}`, []);
  const [h, setH] = useState(120);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Unclosed fence (truncated/stopped reply): render once content stops changing.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (done) return;
    const t = setTimeout(() => setSettled(true), 2000);
    return () => clearTimeout(t);
  }, [html, done]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (!e.data?.__megsy || e.data.id !== id) return;
      if (e.data.__megsy === "h") setH(Math.min(2400, Math.max(40, Number(e.data.h) || 0)));
      if (e.data.__megsy === "send" && onSend) onSend(String(e.data.text).slice(0, 2000));
      if (e.data.__megsy === "connect") {
        const reply = (state: string) => ref.current?.contentWindow?.postMessage({ __megsyHost: "connect", app: e.data.app, state }, "*");
        void connectFromWidget(String(e.data.app), reply).then((name) => {
          if (name && onSend) onSend(`تم ربط ${name}، كمّل المطلوب.`);
        });
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [onSend]);

  const dark = useMemo(() => {
    if (typeof window === "undefined") return false;
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
    return m ? (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 < 110 : false;
  }, []);
  const doc = useMemo(
    () => `<!doctype html><html class="${dark ? "dark" : ""}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${BASE_CSS}</style></head><body dir="auto">${html}${BRIDGE}</body></html>`,
    [html, dark],
  );

  if (!html.trim()) return null;
  if ((!done && !settled) || !mounted) {
    return <div className="my-4 h-24 animate-pulse rounded-3xl bg-muted/40" />;
  }
  return (
    <iframe
      ref={ref}
      name={id}
      title="Interactive answer"
      sandbox="allow-scripts"
      srcDoc={doc}
      style={{ height: h }}
      className="my-4 block w-full border-0 bg-transparent transition-[height] duration-200"
    />
  );
}
