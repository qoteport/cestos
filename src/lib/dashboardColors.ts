export const CHART_PALETTES={classic:['#16856b','#c4840f','#3a68b8','#c4536a','#7656c4','#1e98b8','#7a982a'],vivid:['#2563eb','#e11d48','#16a34a','#9333ea','#d97706','#0891b2','#be185d','#4f46e5'],soft:['#60a5fa','#f472b6','#34d399','#a78bfa','#fbbf24','#22d3ee','#fb923c','#94a3b8']} as const;
export type ChartPalette=keyof typeof CHART_PALETTES;
export function categoryColor(key:string,palette:ChartPalette='classic',overrides:Record<string,string>={}){
 const custom=Object.prototype.hasOwnProperty.call(overrides,key)?overrides[key]:undefined;
 if(custom&&/^#[0-9a-f]{6}$/i.test(custom))return custom;
 let hash=2166136261;for(const char of key){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const colors=CHART_PALETTES[palette]||CHART_PALETTES.classic;return colors[(hash>>>0)%colors.length];
}
