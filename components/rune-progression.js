import { runeProgression } from '../lib/rune-progression.mjs';
import './rune-progression.css';

export default function RuneProgression() {
  return <section className="g-rune-proposal" aria-label="Proposed rune progression">
    <h3>Rune unlock progression <span>Proposed</span></h3>
    <p>Character level represents GP holding status, separate from profession levels. These milestones are a design preview; they are not active unlock or production rules.</p>
    <table>
      <caption>Proposed milestones · not your current unlocks</caption>
      <thead><tr><th scope="col">Rune</th><th scope="col">Character<br/>level</th><th scope="col">Holding<br/>time</th><th scope="col">Status</th></tr></thead>
      <tbody>{runeProgression.tiers.map(tier => <tr key={tier.id}>
        <th scope="row"><span className="g-rune-symbol" style={{ color: tier.color }} aria-hidden="true">{tier.symbol}</span>{tier.name} Rune</th>
        <td>{tier.characterLevel}</td><td>{tier.holdingDays} {tier.holdingDays === 1 ? 'day' : 'days'}</td><td>{tier.status}</td>
      </tr>)}</tbody>
    </table>
    <p className="g-rune-proposal-note">Your holding-based character level is not assigned yet. Historical wallet scans and the holding-time rules still need to be finalized.</p>
  </section>;
}
