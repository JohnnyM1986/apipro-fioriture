// Illustrazioni delle specie nello stile dei petali del logo ApiPRO (usate finché non ci sono foto con licenza libera).
/* eslint-disable */
const SP: Record<string, { c1: string; c2: string; bg: string; shape: string }> = {
  robinia:{c1:'#FFFFFF',c2:'#8A9A5B',bg:'#DCE5C8',shape:'cluster'},
  castagno:{c1:'#E9C85A',c2:'#C9A63A',bg:'#F4ECD2',shape:'catkin'},
  tiglio:{c1:'#F2E48A',c2:'#D8C25A',bg:'#F1F0D8',shape:'star'},
  tarassaco:{c1:'#F7C531',c2:'#E0A410',bg:'#FBEFC8',shape:'ray'},
  colza:{c1:'#F5D332',c2:'#D9B417',bg:'#F8F0C6',shape:'cross'},
  amorfa:{c1:'#7B4E9E',c2:'#E8A33C',bg:'#ECE3F1',shape:'spike'},
  edera:{c1:'#B9C46A',c2:'#7E8A3A',bg:'#E7ECD6',shape:'umbel'},
  rododendro:{c1:'#E0628A',c2:'#B83A62',bg:'#F7E1E8',shape:'star'},
  limonio:{c1:'#A99BD6',c2:'#7A6BB0',bg:'#ECE8F6',shape:'cluster'},
  girasole:{c1:'#F4B400',c2:'#6B4A1E',bg:'#FAEBC2',shape:'ray'},
  astro_marino:{c1:'#B7A6E0',c2:'#E8B53C',bg:'#EEE9F8',shape:'ray'}
}
function petals(cx: number, cy: number, r: number, n: number, rx: number, ry: number, fill: string, rot = 0): string{let s='';for(let i=0;i<n;i++){const a=rot+i*360/n;s+=`<ellipse cx="${cx}" cy="${cy-r}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${a} ${cx} ${cy})"/>`}return s}
export function speciesSvg(id: string, size = 30): string {const s = SP[id] ?? SP.tiglio; let g = '';
 if(s.shape==='ray'){g=petals(20,20,8,14,2.3,7,s.c1)+`<circle cx="20" cy="20" r="5" fill="${s.c2}"/>`}
 else if(s.shape==='cross'){[[13,15],[27,14],[20,27]].forEach(([x, y]: number[]) =>g+=petals(x,y,3.6,4,3,3.8,s.c1,45)+`<circle cx="${x}" cy="${y}" r="1.8" fill="${s.c2}"/>`)}
 else if(s.shape==='catkin'){g=`<path d="M8 32 C14 22 18 14 30 6" stroke="#7a6a3a" stroke-width="2" fill="none"/>`;[[11,26],[15,20],[19,15],[24,10]].forEach(([x, y]: number[]) =>g+=`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="7" fill="${s.c1}" transform="rotate(-50 ${x} ${y})"/>`)}
 else if(s.shape==='spike'){g=`<rect x="17" y="6" width="6" height="26" rx="3" fill="${s.c1}"/>`;for(let y=9;y<31;y+=4)g+=`<circle cx="${y%8?16:24}" cy="${y}" r="1.4" fill="${s.c2}"/>`}
 else if(s.shape==='umbel'){for(let i=0;i<7;i++){const a=(-160+i*23)*Math.PI/180;g+=`<line x1="20" y1="30" x2="${20+11*Math.cos(a)}" y2="${30+11*Math.sin(a)}" stroke="${s.c2}" stroke-width="1.6"/><circle cx="${20+12*Math.cos(a)}" cy="${30+12*Math.sin(a)}" r="2.8" fill="${s.c1}"/>`}}
 else if(s.shape==='cluster'){[[20,8],[14,15],[26,15],[17,23],[24,23],[20,31]].forEach(([x, y]: number[]) =>g+=`<path d="M${x-4} ${y} q4 -6 8 0 q-4 4 -8 0z" fill="${s.c1}" stroke="${s.c2}" stroke-width=".8"/>`)}
 else {g=petals(20,20,7,5,5,7,s.c1)+`<circle cx="20" cy="20" r="3.5" fill="${s.c2}"/>`}
 return `<svg width="${size}" height="${size}" viewBox="0 0 40 40">${g}</svg>`}

export function speciesBg(id: string): string { return (SP[id] ?? SP.tiglio).bg }
