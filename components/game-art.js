export function GameArt({box,className='',stretch=false,cover=false}){
 const [x,y,width,height]=box.split(' ').map(Number);
 return <svg className={`ga-art ${className}`} viewBox={box} preserveAspectRatio={stretch?'none':cover?'xMidYMid slice':'xMidYMid meet'} aria-hidden="true"><svg x={x} y={y} width={width} height={height} overflow="hidden"><image x={-x} y={-y} href="/assets/use-skill-reference.png" width="1536" height="1024"/></svg></svg>;
}
export function GameFrame(){return <span className="g-frame-art" aria-hidden="true">{[['tl','1191 77 18 18'],['tr','1517 77 18 18'],['bl','1191 480 18 18'],['br','1517 480 18 18'],['top','1210 77 302 8'],['bottom','1210 490 302 8'],['left','1191 97 8 379'],['right','1527 97 8 379']].map(([side,box])=><GameArt key={side} className={`g-edge-${side}`} box={box} stretch/>)}</span>}
export const activitySkills=[
 {id:'fishing',name:'Fishing',icon:'252 192 66 62',verb:'Gather',description:'Catch fish from rivers, lakes, and the ocean. Discover ingredients for cooking, valuable materials, and rare collectibles.'},
 {id:'farming',name:'Farming',icon:'252 274 66 64',verb:'Gather',description:'Grow crops and herbs to supply cooks, crafters, and other adventurers.'},
 {id:'mining',name:'Mining',icon:'252 354 66 66',verb:'Gather',description:'Gather ores, stone, and rare minerals for equipment and crafting.'},
 {id:'smithing',name:'Smithing',icon:'252 438 66 62',verb:'Create',description:'Refine metals and forge tools and equipment. Browse recipes and their resource requirements.'},
 {id:'crafting',name:'Crafting',icon:'252 521 66 63',verb:'Create',description:'Turn raw materials into accessories, useful tools, and collectible equipment.'},
 {id:'enchanting',name:'Enchanting',icon:'252 603 66 64',verb:'Enchant',description:'Combine runes and materials to explore powerful enchantments and magical creations.'},
 {id:'cooking',name:'Cooking',icon:'252 688 66 67',verb:'Cook',description:'Prepare meals from fish, crops, and rare ingredients for the adventurers of Runelana.'}
];
