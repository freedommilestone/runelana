import {fishingLevelGuideHeaders,fishingLevelGuideRows} from '../lib/fishing-progression.mjs';
export default function FishingLevelGuide(){
 return <section className="fishing-level-guide" aria-label="Fishing leveling guide">
  <h3>Fishing Level System V2: overall and branch levels 1–99</h3>
  <p>Overall Fishing starts at level 1 with 0 XP. Level 10 requires 184 cumulative XP, level 30 requires 1,428 XP, and level 99 mastery requires 239,164 XP. Its existing curve is unchanged: each step requires round(15 × 1.075^(L − 1)) XP.</p>
  <p>Commercial requires overall Fishing level 10; Treasure and Trophy require overall level 30. Each has an independent branch level starting at 1 with 0 XP. All three use the V2 branch table below: branch level 10 needs 100 XP, level 50 needs 3,500 XP, and level 99 needs 125,000 XP. Branch entry requirements and individual item requirements are separate.</p>
  <p>XP never resets when you level up or switch branches. For example, 55 Commercial XP means branch level 7: 11 of 15 XP toward level 8, with 4 XP remaining. The other branches keep their own totals. Progress bars show XP within the current level and stay full at level 99; additional XP is retained.</p>
  <p>Once training is available, Standard Fishing awards overall Fishing XP only. A specialization activity awards overall Fishing XP plus XP to its selected branch, once per completed batch. One skill or service activity runs at a time; passive rune generation continues separately.</p>
  <p>Both curves are draft balance values saved and enforced in the database. Activities and specialization training remain previews. Browsing recipes or changing a path preview spends no resources and awards no XP.</p>
  <details><summary>View all 99 Fishing and branch XP requirements</summary><div style={{maxHeight:360,overflow:'auto'}} tabIndex={0} role="region" aria-label="Fishing and branch XP requirements"><table style={{width:'100%',minWidth:680}}><caption>Independent cumulative XP curves; unlock milestones use overall Fishing level</caption><thead><tr>{fishingLevelGuideHeaders.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{fishingLevelGuideRows.map(row=><tr key={row[0]}>{row.map((value,i)=>i===0?<th scope="row" key={i}>{value}</th>:<td key={i}>{value}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
