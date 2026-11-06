'use client';
import {useInventoryTicks} from './rune-production';
import RuneIcon from './rune-icon';
import {runeProgression} from '../lib/rune-progression.mjs';
export default function PassiveProduction({runes}){
 const {data,error}=runes,ticks=useInventoryTicks(data,error);
 const producing=data?.active?runeProgression.tiers.filter(t=>data.allocations?.[t.id]>0):[];
 return <section className="g-passive" aria-label="Passive rune production"><h3>Passive Rune Production</h3>
 {producing.map(tier=>{
  const rate=data.allocations[tier.id],fraction=Number(ticks[tier.id]%3600000000n)/3600000000;
  const seconds=Math.ceil((1-fraction)*3600/rate);
  return <div className="g-passive-content" key={tier.id}><RuneIcon id={tier.id}/><div><p>{tier.name} Rune ({rate}/hr)</p><div className="g-passive-progress" role="progressbar" aria-label={`Next ${tier.name} rune progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(fraction*100)}><span style={{width:`${fraction*100}%`}}/></div><small>{error?'Last saved production data':`${Math.floor(seconds/60)}m ${seconds%60}s to next ${tier.name.toLowerCase()} rune`}</small></div></div>;
 })}
 {!producing.length&&<p className="g-passive-empty" role="status">{!data?error?'Production unavailable':'Loading production…':!data.active?'Production starts automatically after a verified holding unlock.':'No runes allocated to production.'}</p>}
 </section>;
}
