// Code-native starter item illustrations; the manifest has no supplied item artwork.
export default function StarterItemArt({id,className=''}){
 const handle=<path d="M25 82 71 26" stroke="#321e10" strokeWidth="12"/>;
 const shaft=<>{handle}<path d="M25 80 70 27" stroke="#a36d36" strokeWidth="7"/></>;
 let art;
 switch(id){
 case 'small-fishing-net':art=<>{shaft}<ellipse cx="65" cy="28" rx="25" ry="15" fill="#bec7ba" fillOpacity=".12" stroke="#bc9c61" strokeWidth="5"/><path d="m41 29 12 32 24 0 12-32M48 31l15 29m-4-29 12 30m8-30-15 29m-12-8h27m-32-10h37" fill="none" stroke="#c6c4a4" strokeWidth="2"/></>;break;
 case 'wooden-rake':art=<>{shaft}<path d="m48 15 40 27m-40-27-9 13m22-4-10 14m24-5-10 15m23-6-10 14" stroke="#a77c42" strokeWidth="7"/></>;break;
 case 'bronze-pickaxe':art=<>{shaft}<path d="M35 28Q66-2 91 49L63 29Z" fill="#b68045" stroke="#4b3321" strokeWidth="3"/></>;break;
 case 'basic-smithing-hammer':art=<>{shaft}<path d="m44 12 20-6 27 25-16 18-33-23Z" fill="#929393" stroke="#343536" strokeWidth="4"/></>;break;
 case 'basic-crafting-toolkit':art=<><path d="M19 41h65l5 43H14Z" fill="#925d2f" stroke="#412b1d" strokeWidth="4"/><path d="M33 42V26q19-18 37 0v16M16 58h72" fill="none" stroke="#c8a15e" strokeWidth="6"/><path d="M46 51h12v20H46Z" fill="#e1bc64"/></>;break;
 case 'cooking-pot':art=<><path d="M20 39Q5 25 10 54l12 9M80 39q15-14 10 15L78 64" fill="none" stroke="#8f8b80" strokeWidth="7"/><path d="M20 38h60l-7 42q-23 17-46 0Z" fill="#575952" stroke="#262824" strokeWidth="4"/><ellipse cx="50" cy="36" rx="31" ry="10" fill="#a69c86" stroke="#343833" strokeWidth="4"/><ellipse cx="50" cy="36" rx="22" ry="5" fill="#372e23"/></>;break;
 case 'apprentice-enchanting-focus':art=<><path d="m42 44-13 43 11 4 15-44" fill="#9b743b" stroke="#4c361d" strokeWidth="3"/><path d="m50 10 19 22-17 23-20-22Z" fill="#b475ee" stroke="#583579" strokeWidth="4"/><path d="m50 13 1 36-14-17Z" fill="#e7c1ff"/></>;break;
 case 'bronze-sword':art=<><path d="m25 72 9 9 47-51 4-19-19 8Z" fill="#bb8145" stroke="#4b321e" strokeWidth="3"/><path d="m33 74 42-49" stroke="#e8be74" strokeWidth="3"/><path d="m17 64 27 23m-15-9-14 15" stroke="#cba14d" strokeWidth="8"/></>;break;
 case 'wooden-shield':art=<><path d="m20 19 30-9 30 9-4 46Q66 81 50 93 29 78 24 65Z" fill="#956335" stroke="#c0a173" strokeWidth="6"/><path d="M40 18v63m20-63v63M25 43h50" stroke="#4e341f" strokeWidth="3"/><circle cx="50" cy="45" r="9" fill="#b9b5a1" stroke="#544e3a" strokeWidth="3"/></>;break;
 case 'leather-body':art=<><path d="m29 16 13 4h16l13-4 22 22-17 15-5-8 6 41H23l6-41-5 8L7 38Z" fill="#916039" stroke="#392b20" strokeWidth="4"/><path d="M42 20q8 15 16 0M50 36v48m-6-41h12m-12 10h12m-12 10h12m-12 10h12" fill="none" stroke="#c9a374" strokeWidth="3"/></>;break;
 case 'leather-boots':art=<><path d="M25 14h25v42L38 79H8V64l18-12ZM58 20h25v42L71 85H41V70l18-12Z" fill="#986a3c" stroke="#3d2c1b" strokeWidth="4"/><path d="M28 26h19m-19 10h19M61 32h19m-19 10h19" stroke="#d2b17a" strokeWidth="3"/></>;break;
 case 'basic-bait':art=<><path d="M21 33c-12-25 27-25 20-2s-17 49 4 41 40-38 37-6-20 27-22 17" fill="none" stroke="#542d20" strokeWidth="15"/><path d="M21 33c-12-25 27-25 20-2s-17 49 4 41 40-38 37-6-20 27-22 17" fill="none" stroke="#d39973" strokeWidth="10"/></>;break;
 case 'wheat-seeds':case 'potato-seeds':art=<><path d="m32 22-7-14h50L64 25q28 41 17 57-30 16-60 0-12-18 11-60" fill="#aa8750" stroke="#4c3920" strokeWidth="4"/><path d="M31 23h34" stroke="#e1c68a" strokeWidth="5"/>{id==='wheat-seeds'?<path d="M50 75V39m0 20-13-10m13 1 13-10m-13 28 13-10" fill="none" stroke="#f6d66e" strokeWidth="5"/>:<ellipse cx="50" cy="57" rx="16" ry="12" fill="#d8b377" stroke="#73552d" strokeWidth="3"/>}</>;break;
 default:art=<><ellipse cx="50" cy="72" rx="39" ry="15" fill="#a7a096" stroke="#45433a" strokeWidth="4"/><path d="M16 64Q22 29 62 40l21 25q-27 23-67-1" fill="#c58a42" stroke="#704019" strokeWidth="4"/><path d="m31 49 8 15m10-21 8 17m8-14 8 13" stroke="#efd3a1" strokeWidth="5"/></>;
 }
 return <svg className={`starter-item-art ${className}`} viewBox="0 0 100 100" aria-hidden="true">{art}</svg>;
}
