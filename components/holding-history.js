const date = seconds => new Date(seconds*1000).toLocaleString();
const duration = seconds => `${Math.floor(seconds/86400)} days, ${Math.floor(seconds%86400/3600)} hours`;
export default function HoldingHistory({history}) {
  const summary=history?.summary;
  return <section className="g-wallet-holding" aria-label="Historical GP holdings">
    <h4>Longest GP holding streak</h4>
    {summary ? <>
      <strong>{summary.longestDays} completed days</strong>
      <p>This record is retained when your wallet reaches zero. Purchases and incoming transfers count toward holding time.</p>
      <dl><dt>First GP received</dt><dd>{summary.firstReceivedAt === null ? 'No GP receipts recorded' : date(summary.firstReceivedAt)}</dd>
        <dt>Current streak at last scan</dt><dd>{duration(summary.currentSeconds)}</dd>
        <dt>Total time holding GP</dt><dd>{duration(summary.totalSeconds)}</dd>
        <dt>Time without GP after first receipt</dt><dd>{duration(summary.zeroSeconds)}</dd>
        <dt>History verified through</dt><dd>{date(summary.throughTime)}</dd></dl>
      {history.isStale && <p>The latest historical scan is incomplete or unavailable. These are the last verified results.</p>}
      {summary.zeroPeriods?.length > 0 && <details><summary>Recent zero-balance gaps</summary><ul>{summary.zeroPeriods.slice(-10).map((gap,i)=><li key={`${gap.start}-${i}`}>{date(gap.start)} – {date(gap.end)}<br/>{duration(gap.end-gap.start)}</li>)}</ul></details>}
      <p>Measured across all indexed GP accounts in this wallet, using finalized transactions. Rune thresholds are still proposed.</p>
    </> : <p>{history?.status === 'error' ? 'Historical scanning is temporarily unavailable. Refresh to try again; no holding days have been assigned.' : history?.status === 'pending' ? 'Scanning past GP transactions. Your balance is available while history is being checked. Large histories may take several scans.' : 'Historical holding time is not available yet. Daily observations below are a separate counter.'}</p>}
  </section>;
}
