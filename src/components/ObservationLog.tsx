import type { PassesResponse, Target } from '../api/types'
import './ObservationLog.css'

type Props = {
  target: Target | null
  passesData: PassesResponse | null
}

const STATUS_LABEL = { candidate: 'Candidate', confirmed: 'Confirmed', unreviewed: 'Unreviewed' }

export default function ObservationLog({ target, passesData }: Props) {
  const passes = passesData?.passes ?? []
  const candidates = passesData?.candidates ?? []
  const labelFor = (passId: string) => passes.find((p) => p.id === passId)?.label ?? passId

  return (
    <section id="log" className="log panel" aria-labelledby="log-heading">
      <div className="log__head">
        <h2 id="log-heading" className="panel-heading">
          Observation Log{target && ` · ${target.name}`}
        </h2>
        {/* Visual only for the MVP */}
        <a className="log__record" href="#log">
          + Record observation
        </a>
      </div>

      <div className="log__scroll" tabIndex={0} role="region" aria-labelledby="log-heading">
        <table className="log__table">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">RA</th>
              <th scope="col">Dec</th>
              <th scope="col">Seen in</th>
              <th scope="col">Shift</th>
              <th scope="col">Note</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="data">{c.id}</td>
                <td className="data">—</td>
                <td className="data">—</td>
                <td>{c.positions.map((p) => labelFor(p.passId)).join(', ')}</td>
                <td className="data">—</td>
                <td className="log__note">{c.note}</td>
                <td>
                  <span className={`log__status log__status--${c.status}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="log__placeholder">
              <td colSpan={7}>
                {passesData && candidates.length === 0
                  ? 'No movers flagged here yet. Blink the passes and see what you find.'
                  : 'Next observation goes here.'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
