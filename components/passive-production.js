'use client';
import {useInventoryTicks} from './rune-production';
import RuneIcon from './rune-icon';
import {runeProgression} from '../lib/rune-progression.mjs';
export default function PassiveProduction({runes}){
 const {data,error}=runes,ticks=useInventoryTicks(data,error);
 const producing=runeProgression.tiers.filter(t=>data?.allocations?.[t.id]>0);
 const selected=producing[0],rate=selected?data.allocations[selected.id]:0;
 const fraction=selected?Number(ticks[selected.id]%3600000000n)/3600000000:0;
 const seconds=rate?Math.ceil((1-fraction)*3600/rate):0;
 return <section className="g-passive" aria-label="Passive rune production"><h3>Passive Rune Production</h3><div className="g-passive-content"><RuneIcon id={selected?.id||'air'}/><div><p>{!data?error?'Production unavailable':'Loading production…':!data.active?'Awaiting first unlock':selected?`${selected.name} Rune (${rate}/hr)`:'No allocation'}</p><div className="g-passive-progress" role="progressbar" aria-label="Next passive rune progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(fraction*100)}><span style={{width:`${fraction*100}%`}}/></div><small>{error?'Last saved production data':data?.active&&selected?`${Math.floor(seconds/60)}m ${seconds%60}s to next ${selected.name.toLowerCase()} rune${producing.length>1?` · +${producing.length-1} other types`:''}`:'Production continues automatically after eligibility.'}</small></div></div></section>;
}
