import {fishingLevels} from '../lib/fishing-progression.mjs';
export default function FishingLevelGuide(){
 return <section className="fishing-level-guide" aria-label="Fishing leveling guide">
  <h3>Fishing levels 1–99</h3>
  <p>Fishing starts at level 1 with 0 XP. Level 10 requires 184 cumulative XP, level 30 requires 1,428 XP, and level 99 mastery requires 239,164 XP.</p>
  <p>Each step requires round(15 × 1.075^(L − 1)) XP, where L is your current level. Total XP never resets when you level up. The bar shows progress within your current level; at level 99 it stays full.</p>
  <p>For example, 20 total XP means level 2: 5 of the 16 XP needed for level 3, with 11 XP remaining. Commercial, Treasure, and Trophy Fishing each require Fishing level 10 and begin at branch level 1. Branch XP thresholds are not configured yet.</p>
  <p>Fishing XP comes from completed Fishing activities once training is available. Browsing recipes, waiting, holding GP, and prototype Smithing do not award Fishing XP. Specialization XP is tracked separately. Activities and specialization training remain previews; this V1 leveling curve is saved and enforced now.</p>
  <details><summary>View all 99 Fishing XP requirements</summary><div style={{maxHeight:360,overflow:'auto'}} tabIndex={0} role="region" aria-label="Fishing XP requirements"><table style={{width:'100%'}}><caption>Cumulative XP and XP from this level to the next</caption><thead><tr><th scope="col">Level</th><th scope="col">Total XP</th><th scope="col">XP to next</th><th scope="col">Milestone</th></tr></thead><tbody>{fishingLevels.map(r=><tr key={r.level}><th scope="row">{r.level}</th><td>{r.totalXp.toLocaleString()}</td><td>{r.xpToNext?.toLocaleString()??'MAX'}</td><td>{r.milestone||'—'}</td></tr>)}</tbody></table></div></details>
 </section>;
}
