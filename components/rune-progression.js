import { runeProgression } from '../lib/rune-progression.mjs';
import './rune-progression.css';

export default function RuneProgression() {
  return <section className="g-rune-proposal" aria-label="Rune unlock progression">
    <h3>Rune unlock progression <span>Longest streak</span></h3>
    <p>Character level represents GP holding status, separate from profession levels. These milestones unlock automatic rune production.</p>
    <table>
      <caption>Rune unlock milestones</caption>
      <thead><tr><th scope="col">Rune</th><th scope="col">Character<br/>level</th><th scope="col">Holding<br/>time</th><th scope="col">Status</th></tr></thead>
      <tbody>{runeProgression.tiers.map(tier => <tr key={tier.id}>
        <th scope="row"><span className="g-rune-symbol" style={{ color: tier.color }} aria-hidden="true">{tier.symbol}</span>{tier.name} Rune</th>
        <td>{tier.characterLevel}</td><td>{tier.holdingDays} {tier.holdingDays === 1 ? 'day' : 'days'}</td><td>{tier.status}</td>
      </tr>)}</tbody>
    </table>
    <p className="g-rune-proposal-note">Unlocks use your longest uninterrupted GP holding streak, including GP received by transfer. Historical scans are required to assign this status.</p>
  </section>;
}
