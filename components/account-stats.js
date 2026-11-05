'use client';
import {accountStatRows,displayedHolding,statsDate} from '../lib/account-stats.mjs';
export default function AccountStats({stats,error,walletSnapshot,onRefresh}){
 const holding=displayedHolding(stats,walletSnapshot);
 const holdingNote=holding?.verifiedThrough?`${holding.status==='stale'?'Last known holding history':'Holding history verified'} through ${statsDate(holding.verifiedThrough,true)}.`:holding?.status==='unverified'?'Verify a wallet in Settings to load holding history.':holding?.status==='error'?'Holding history is unavailable. Refresh your wallet history in Settings.':'Holding history is pending; unknown values are shown as —.';
 return <section className="cp-frame cp-stats" aria-label="Account Stats"><h3>Account Stats</h3>
 <dl>{accountStatRows(stats,holding).map(([icon,label,value])=><div key={label}><dt><span aria-hidden="true">{icon}</span>{label}</dt><dd>{value}</dd></div>)}</dl>
 {(error||!stats)&&<p className="cp-stats-status" role="status">{stats?'Showing the last saved stats. Refresh failed.':'Account stats are unavailable.'} <button onClick={onRefresh}>Retry stats</button></p>}
 <small className="cp-stat-note">{holdingNote} Zero-GP gaps are excluded from total holding time. Best streak determines rune unlocks.</small>
 <details className="cp-stat-definitions"><summary>How these stats are counted</summary><p>Skills count only professions with XP, completed activities, or recorded training time. Starting at level 1 does not count.</p><p>Equipment counts distinct items currently in your saved collection, including imported equipment, starter combat gear, and reusable profession tools. It excludes steel bars, supplies, runes, and appearance previews. Equipping an item does not add another item.</p><p>Services count completed and collected merchant services, tracked since {statsDate(stats?.servicesTrackedSince)}. Canceled or unfinished tasks do not count; older browser-only service counts were not recorded.</p><p>Holding durations stop at the verified chain checkpoint, rather than assuming GP stayed in the wallet afterward. Stats checked: {statsDate(stats?.updatedAt,true)}.</p></details>
 </section>;
}
