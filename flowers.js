/*
  Glowrist hand-drawn SVG flower library (original artwork, no images needed).
  Injects <symbol>s once, then pages use <svg><use href="#fl-rose"/></svg>.
*/
(function () {
  const defs = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
 <defs>
  <radialGradient id="g-rose" cx="45%" cy="40%" r="60%">
    <stop offset="0" stop-color="#D98493"/><stop offset=".6" stop-color="#B9566B"/><stop offset="1" stop-color="#8E3349"/>
  </radialGradient>
  <radialGradient id="g-peony" cx="50%" cy="45%" r="60%">
    <stop offset="0" stop-color="#FBE3E1"/><stop offset=".7" stop-color="#EDB9BC"/><stop offset="1" stop-color="#D99198"/>
  </radialGradient>
  <radialGradient id="g-cream" cx="50%" cy="45%" r="60%">
    <stop offset="0" stop-color="#FFF8EA"/><stop offset="1" stop-color="#EAD9B8"/>
  </radialGradient>
  <linearGradient id="g-tulip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E7909B"/><stop offset="1" stop-color="#A8455A"/>
  </linearGradient>
 </defs>

 <symbol id="fl-rose" viewBox="-24 -24 48 48">
  <circle r="21" fill="url(#g-rose)"/>
  <path d="M-15,-7 C-13,-19 11,-21 16,-8 C20,3 12,15 0,16 C-11,17 -18,6 -15,-7Z" fill="#A9475E" opacity=".9"/>
  <path d="M-9,-5 C-7,-13 9,-13 10,-3 C11,6 3,11 -3,10 C-10,9 -11,2 -9,-5Z" fill="#93364D"/>
  <path d="M-4,-3 C-3,-8 5,-8 5,-2 C5,3 0,5 -2,3 C-4,1 -1,-2 1,-1" fill="none" stroke="#5E1B2D" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M-18,5 C-13,13 -4,19 7,18" fill="none" stroke="#EBAAB4" stroke-width="1.6" opacity=".75" stroke-linecap="round"/>
  <path d="M8,-17 C14,-14 18,-8 18,-2" fill="none" stroke="#EBAAB4" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>
 </symbol>

 <symbol id="fl-bud" viewBox="-12 -16 24 32">
  <path d="M0,-14 C8,-10 9,2 0,6 C-9,2 -8,-10 0,-14Z" fill="#B9566B"/>
  <path d="M0,-14 C4,-8 4,0 0,6" fill="none" stroke="#7E2A40" stroke-width="1.2"/>
  <path d="M-7,2 C-4,8 4,8 7,2 C5,10 -5,10 -7,2Z" fill="#7F8F5C"/>
  <path d="M0,8 L0,15" stroke="#5F6E45" stroke-width="1.6"/>
 </symbol>

 <symbol id="fl-peony" viewBox="-26 -26 52 52">
  <g fill="url(#g-peony)" stroke="#D08990" stroke-width=".8">
   <path d="M0,-23 C9,-23 13,-14 8,-9 C14,-13 23,-9 22,0 C23,9 14,13 9,8 C13,14 9,23 0,22 C-9,23 -13,14 -8,9 C-14,13 -23,9 -22,0 C-23,-9 -14,-13 -9,-8 C-13,-14 -9,-23 0,-23Z"/>
  </g>
  <path d="M-12,-3 C-10,-12 10,-12 12,-3 C14,8 -14,8 -12,-3Z" fill="#F4CFD0" stroke="#D08990" stroke-width=".8"/>
  <path d="M-7,-2 C-5,-8 6,-8 7,-2 C8,4 -8,4 -7,-2Z" fill="#E9AEB3"/>
  <circle r="3" fill="#D9939A"/>
  <path d="M-18,6 C-12,14 -3,17 4,16" fill="none" stroke="#fff" stroke-width="1.3" opacity=".6" stroke-linecap="round"/>
 </symbol>

 <symbol id="fl-blossom" viewBox="-20 -20 40 40">
  <g fill="url(#g-cream)" stroke="#CDB68C" stroke-width=".7">
   <ellipse cx="0" cy="-10" rx="6" ry="10"/>
   <ellipse cx="0" cy="-10" rx="6" ry="10" transform="rotate(72)"/>
   <ellipse cx="0" cy="-10" rx="6" ry="10" transform="rotate(144)"/>
   <ellipse cx="0" cy="-10" rx="6" ry="10" transform="rotate(216)"/>
   <ellipse cx="0" cy="-10" rx="6" ry="10" transform="rotate(288)"/>
  </g>
  <circle r="4.5" fill="#C9A15A"/>
  <circle r="2" fill="#9C7637"/>
 </symbol>

 <symbol id="fl-tulip" viewBox="-14 -20 28 44">
  <path d="M0,20 C0,10 1,4 0,-2" stroke="#5F6E45" stroke-width="2" fill="none"/>
  <path d="M0,16 C-8,10 -11,4 -10,-2 C-5,2 -1,8 0,14Z" fill="#7F8F5C"/>
  <path d="M-10,-16 L-5,-10 L0,-18 L5,-10 L10,-16 C12,-4 7,4 0,4 C-7,4 -12,-4 -10,-16Z" fill="url(#g-tulip)"/>
  <path d="M0,-18 L0,2" stroke="#8E3349" stroke-width=".8" opacity=".6"/>
 </symbol>

 <symbol id="fl-leaf" viewBox="0 -9 34 18">
  <path d="M0,0 C9,-10 25,-9 34,0 C25,9 9,10 0,0Z" fill="#8A9A6B"/>
  <path d="M1,0 C10,-1 22,-1 31,0" stroke="#5F6E45" stroke-width="1" fill="none"/>
  <path d="M10,0 L15,-4 M18,0 L23,-4 M10,0 L15,4 M18,0 L23,4" stroke="#6E7D52" stroke-width=".7"/>
 </symbol>

 <symbol id="fl-sprig" viewBox="-6 -40 40 44">
  <path d="M0,2 C6,-10 14,-24 28,-36" stroke="#6E7D62" stroke-width="1.4" fill="none"/>
  <g fill="#A7B79A" stroke="#7E8F72" stroke-width=".6">
   <circle cx="5" cy="-7" r="4.2"/><circle cx="-1" cy="-12" r="3.6"/>
   <circle cx="12" cy="-17" r="4"/><circle cx="7" cy="-23" r="3.4"/>
   <circle cx="19" cy="-26" r="3.6"/><circle cx="16" cy="-32" r="3"/>
   <circle cx="27" cy="-35" r="2.6"/>
  </g>
 </symbol>

 <symbol id="fl-ribbon" viewBox="-30 -12 60 40">
  <path d="M-4,0 C-14,-12 -28,-8 -22,2 C-18,8 -8,4 -4,0Z" fill="#E9C5C4" stroke="#B88488" stroke-width=".8"/>
  <path d="M4,0 C14,-12 28,-8 22,2 C18,8 8,4 4,0Z" fill="#E9C5C4" stroke="#B88488" stroke-width=".8"/>
  <path d="M-3,2 C-8,12 -12,20 -16,27 L-10,25 L-7,29 C-3,20 -1,10 0,3Z" fill="#E1B3B4" stroke="#B88488" stroke-width=".8"/>
  <path d="M3,2 C8,12 12,20 16,27 L10,25 L7,29 C3,20 1,10 0,3Z" fill="#E1B3B4" stroke="#B88488" stroke-width=".8"/>
  <circle r="4" fill="#D9A6A8" stroke="#B88488" stroke-width=".8"/>
 </symbol>
 </svg>`;
  const holder = document.createElement("div");
  holder.innerHTML = defs;
  document.body.prepend(holder.firstElementChild);
})();

function flowerFor(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("peon")) return "fl-peony";
  if (n.includes("tulip")) return "fl-tulip";
  if (n.includes("lily") || n.includes("daisy") || n.includes("white") || n.includes("blossom")) return "fl-blossom";
  return "fl-rose";
}

// A little bouquet: 3 blooms + leaves, used on batch cards
function bouquetSVG(main, size = 120) {
  return `<svg viewBox="0 0 120 110" width="${size}" height="${size * 110 / 120}" aria-hidden="true">
    <use href="#fl-leaf" x="8" y="52" width="40" height="22" transform="rotate(-25 28 63)"/>
    <use href="#fl-leaf" x="72" y="52" width="40" height="22" transform="rotate(205 92 63)"/>
    <use href="#fl-sprig" x="70" y="4" width="44" height="48"/>
    <use href="#fl-sprig" x="6" y="4" width="44" height="48" transform="scale(-1 1) translate(-56 0)"/>
    <use href="#${main}" x="14" y="34" width="42" height="42"/>
    <use href="#${main}" x="64" y="34" width="42" height="42"/>
    <use href="#${main}" x="34" y="12" width="52" height="52"/>
    <use href="#fl-ribbon" x="40" y="72" width="40" height="27"/>
  </svg>`;
}

// Garland swag drawn across a container (vintage festoon)
function drawSwag(svgEl, { swags = 4, depth = 46, flowerEvery = 1 } = {}) {
  const W = svgEl.clientWidth || svgEl.parentElement.clientWidth || 1200;
  const H = depth + 46;
  svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svgEl.setAttribute("height", H);
  const seg = W / swags;
  let out = "";
  const pt = (x0, x1, t) => {
    // quadratic bezier from (x0,10) to (x1,10) control (mid, 10+2*depth)
    const cx = (x0 + x1) / 2, cy = 10 + depth * 2;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * cy + t * t * 10;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - 10) + 2 * t * (10 - cy);
    return { x, y, a: Math.atan2(dy, dx) * 180 / Math.PI };
  };
  for (let i = 0; i < swags; i++) {
    const x0 = i * seg, x1 = (i + 1) * seg;
    out += `<path d="M${x0},10 Q${(x0 + x1) / 2},${10 + depth * 2} ${x1},10" fill="none" stroke="#6E7D52" stroke-width="2"/>`;
    const steps = Math.max(10, Math.round(seg / 20));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const p = pt(x0, x1, t);
      const flip = s % 2 ? -1 : 1;
      out += `<use href="#fl-leaf" x="${p.x}" y="${p.y - 6}" width="22" height="12" transform="rotate(${p.a + 40 * flip} ${p.x} ${p.y})"/>`;
    }
    for (let s = 1; s < steps; s += 3) {
      const p = pt(x0, x1, s / steps + 0.03);
      out += `<use href="#fl-sprig" x="${p.x - 4}" y="${p.y - 22}" width="20" height="22" transform="rotate(${p.a} ${p.x} ${p.y})" opacity=".9"/>`;
    }
    const m = pt(x0, x1, 0.5);
    out += `<use href="#fl-peony" x="${m.x - 18}" y="${m.y - 16}" width="36" height="36"/>`;
    out += `<use href="#fl-rose" x="${m.x - 34}" y="${m.y - 18}" width="22" height="22"/>`;
    out += `<use href="#fl-rose" x="${m.x + 12}" y="${m.y - 18}" width="22" height="22"/>`;
    const q1 = pt(x0, x1, 0.25), q3 = pt(x0, x1, 0.75);
    out += `<use href="#fl-blossom" x="${q1.x - 9}" y="${q1.y - 9}" width="18" height="18"/>`;
    out += `<use href="#fl-blossom" x="${q3.x - 9}" y="${q3.y - 9}" width="18" height="18"/>`;
    // ribbon knot where swags meet
    out += `<use href="#fl-ribbon" x="${x0 - 18}" y="0" width="36" height="24"/>`;
    out += `<use href="#fl-rose" x="${x0 - 11}" y="-2" width="22" height="22"/>`;
  }
  out += `<use href="#fl-ribbon" x="${W - 18}" y="0" width="36" height="24"/><use href="#fl-rose" x="${W - 11}" y="-2" width="22" height="22"/>`;
  svgEl.innerHTML = out;
}
