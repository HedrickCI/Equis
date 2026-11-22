import { useState, useMemo, useEffect } from 'react'
import { api } from './api'
import './equis.css'

/* Equis — group work the fair way.
 *
 * One tab per SRS area. Each panel is tagged with the functional requirements
 * it covers: a solid tag is wired to the API, an outlined tag is a placeholder
 * for a later release.
 */

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'group', label: 'Group' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'progress', label: 'Progress' },
  { id: 'dashboard', label: 'Dashboard' },
]

function Head({ title, live = [], planned = [] }) {
  return (
    <div className="eq-section-head">
      <h2>{title}</h2>
      <span className="eq-frs">
        {live.map((id) => (
          <span key={id} className="eq-fr is-live" title="Implemented">FR {id}</span>
        ))}
        {planned.map((id) => (
          <span key={id} className="eq-fr" title="Planned for a later release">FR {id}</span>
        ))}
      </span>
    </div>
  )
}

const Stub = () => <span className="eq-stub">Later release</span>

export default function App() {
  const [tab, setTab] = useState('group')
  const [group, setGroup] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const [theme, setTheme] = useState('auto')
  const [statuses, setStatuses] = useState({})
  const [history, setHistory] = useState([])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark)

  async function run(action) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function note(entry) {
    setHistory((h) => [{ at: new Date(), entry }, ...h].slice(0, 25))
  }

  const createGroup = (event) => {
    event.preventDefault()
    const name = new FormData(event.target).get('name')
    run(async () => {
      const created = await api.createGroup(name)
      setGroup(created)
      setResult(null)
      setHistory([{ at: new Date(), entry: `Group "${name}" created` }])
      event.target.reset()
    })
  }

  const addMember = (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    const name = form.get('name')
    run(async () => {
      await api.addMember(group.id, { name, capacity: Number(form.get('capacity')) })
      setGroup(await api.getGroup(group.id))
      note(`${name} added at capacity ${form.get('capacity')}`)
      event.target.reset()
    })
  }

  const addTask = (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    const title = form.get('title')
    run(async () => {
      await api.addTask(group.id, {
        title,
        description: form.get('description') || '',
        weight: Number(form.get('weight')),
      })
      setGroup(await api.getGroup(group.id))
      note(`Task "${title}" added at weight ${form.get('weight')}`)
      event.target.reset()
    })
  }

  const allocate = () =>
    run(async () => {
      const allocation = await api.allocate(group.id)
      setResult(allocation)
      setGroup(await api.getGroup(group.id))
      note(`Allocation run — fairness ${allocation.fairness_score}`)
    })

  const reassign = (taskId, memberId, taskTitle) =>
    run(async () => {
      await api.reassign(taskId, memberId ? Number(memberId) : null)
      setGroup(await api.getGroup(group.id))
      note(`"${taskTitle}" reassigned by hand`)
    })

  const memberName = (id) =>
    group?.members.find((m) => m.id === id)?.name ?? 'Unassigned'

  /* Workload per member, derived from whatever the allocator last saved. */
  const loads = useMemo(() => {
    if (!group) return []
    return group.members.map((m) => {
      const tasks = group.tasks.filter((t) => t.assignee_id === m.id)
      const load = tasks.reduce((sum, t) => sum + t.weight, 0)
      return { ...m, tasks, load, relative: m.capacity > 0 ? load / m.capacity : null }
    })
  }, [group])

  const relatives = loads.map((l) => l.relative).filter((v) => v !== null)
  const peakRelative = relatives.length ? Math.max(...relatives, 1) : 1
  const meanRelative = relatives.length
    ? relatives.reduce((a, b) => a + b, 0) / relatives.length
    : 0

  function exportCsv() {
    if (!group) return
    const rows = [['Member', 'Capacity', 'Assigned weight', 'Relative load', 'Tasks']]
    loads.forEach((l) => {
      rows.push([
        l.name,
        l.capacity,
        l.load,
        l.relative === null ? 'unavailable' : l.relative.toFixed(2),
        l.tasks.map((t) => t.title).join('; '),
      ])
    })
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `equis-${group.name.replace(/\s+/g, '-').toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    note('Dashboard exported as CSV')
  }

  const joinCode = group ? `EQ-${String(group.id).padStart(4, '0')}` : '—'
  const noGroup = <div className="eq-card"><p className="eq-empty">Create a group first.</p></div>

  return (
    <div className="eq-app">
      <header className="eq-masthead">
        <div className="eq-brand">
          <div className="eq-mark" aria-hidden="true">E</div>
          <h1 className="eq-wordmark">Equis</h1>
        </div>
        <div className="eq-masthead-right">
          {group && <span className="eq-group-chip">{group.name}</span>}
          <button
            type="button"
            className="eq-theme-toggle"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <nav className="eq-tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'is-active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="eq-alert">{error}</div>}

      {/* ---------------- Account ---------------- */}

      {tab === 'account' && (
        <>
          <Head title="Account" planned={['1.1', '1.2', '1.3']} />
          <div className="eq-card">
            <div className="eq-subtabs">
              <button type="button" className={authTab === 'login' ? 'is-active' : ''} onClick={() => setAuthTab('login')}>Log in</button>
              <button type="button" className={authTab === 'register' ? 'is-active' : ''} onClick={() => setAuthTab('register')}>Register</button>
              <button type="button" className={authTab === 'reset' ? 'is-active' : ''} onClick={() => setAuthTab('reset')}>Reset password</button>
            </div>

            <div className="eq-row">
              {authTab === 'register' && (
                <div className="eq-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input id="auth-name" disabled />
                </div>
              )}
              <div className="eq-field">
                <label htmlFor="auth-email">Email</label>
                <input id="auth-email" type="email" disabled />
              </div>
              {authTab !== 'reset' && (
                <div className="eq-field">
                  <label htmlFor="auth-pw">Password</label>
                  <input id="auth-pw" type="password" disabled />
                </div>
              )}
              <button type="button" disabled>
                {authTab === 'login' ? 'Log in' : authTab === 'register' ? 'Create account' : 'Send reset link'}
              </button>
              <Stub />
            </div>
            <p className="eq-hint">Accounts are out of scope for the alpha; groups are addressed directly.</p>
          </div>
        </>
      )}

      {/* ---------------- Group ---------------- */}

      {tab === 'group' && (
        <>
          <Head title="Group" live={['2.1', '2.3']} planned={['2.2', '2.4']} />

          {!group ? (
            <div className="eq-card">
              <h3>Create a group</h3>
              <form onSubmit={createGroup}>
                <div className="eq-row">
                  <div className="eq-field">
                    <label htmlFor="g-name">Project name</label>
                    <input id="g-name" name="name" placeholder="Capstone — Term 3" required />
                  </div>
                  <div className="eq-field">
                    <label htmlFor="g-deadline">Deadline <Stub /></label>
                    <input id="g-deadline" type="date" disabled />
                  </div>
                  <button disabled={busy}>Create group</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="eq-grid-2">
                <div className="eq-card">
                  <h3>Join code</h3>
                  <p className="eq-code">{joinCode}</p>
                  <div className="eq-row" style={{ marginTop: 12 }}>
                    <div className="eq-field">
                      <label htmlFor="join">Join an existing group</label>
                      <input id="join" placeholder="EQ-0000" disabled />
                    </div>
                    <button type="button" disabled>Join</button>
                    <Stub />
                  </div>
                </div>

                <div className="eq-card">
                  <h3>Add a member</h3>
                  <form onSubmit={addMember}>
                    <div className="eq-field">
                      <label htmlFor="m-name">Name</label>
                      <input id="m-name" name="name" required />
                    </div>
                    <div className="eq-row">
                      <div className="eq-field">
                        <label htmlFor="m-cap">Capacity · 1.0 is a normal load</label>
                        <input id="m-cap" name="capacity" type="number" step="0.1" min="0" max="2" defaultValue="1.0" />
                      </div>
                      <div className="eq-field">
                        <label htmlFor="m-hours">Hours per week <Stub /></label>
                        <input id="m-hours" type="number" min="0" disabled />
                      </div>
                      <button disabled={busy}>Add</button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="eq-card">
                <h3>Members</h3>
                {loads.length === 0 ? (
                  <p className="eq-empty">No members yet.</p>
                ) : (
                  <div className="eq-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th className="eq-num">Capacity</th>
                          <th className="eq-num">Tasks</th>
                          <th className="eq-num">Weight</th>
                          <th className="eq-right">Leave</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loads.map((m) => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td className="eq-num">{m.capacity}</td>
                            <td className="eq-num">{m.tasks.length}</td>
                            <td className="eq-num">{m.load}</td>
                            <td className="eq-right">
                              <button type="button" className="eq-ghost eq-small" disabled>Leave</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ---------------- Tasks ---------------- */}

      {tab === 'tasks' && (
        <>
          <Head title="Tasks" live={['3.1']} planned={['3.2', '3.3', '3.4']} />
          {!group ? noGroup : (
            <>
              <div className="eq-card">
                <h3>Add a task</h3>
                <form onSubmit={addTask}>
                  <div className="eq-row">
                    <div className="eq-field">
                      <label htmlFor="t-title">Title</label>
                      <input id="t-title" name="title" required />
                    </div>
                    <div className="eq-field">
                      <label htmlFor="t-weight">Effort weight · 1–10</label>
                      <input id="t-weight" name="weight" type="number" min="1" max="10" defaultValue="5" />
                    </div>
                    <div className="eq-field">
                      <label htmlFor="t-deadline">Deadline <Stub /></label>
                      <input id="t-deadline" type="date" disabled />
                    </div>
                  </div>
                  <div className="eq-field" style={{ marginTop: 10 }}>
                    <label htmlFor="t-desc">Description</label>
                    <textarea id="t-desc" name="description" />
                  </div>
                  <div className="eq-row">
                    <button disabled={busy}>Add task</button>
                    <button type="button" className="eq-ghost" disabled>Lock estimates</button>
                    <Stub />
                  </div>
                </form>
              </div>

              <div className="eq-card">
                <h3>Backlog</h3>
                {group.tasks.length === 0 ? (
                  <p className="eq-empty">No tasks yet.</p>
                ) : (
                  <div className="eq-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th className="eq-num">Weight</th>
                          <th>Estimate</th>
                          <th>Assigned to</th>
                          <th className="eq-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((t) => (
                          <tr key={t.id}>
                            <td>{t.title}</td>
                            <td className="eq-num">{t.weight}</td>
                            <td><input type="number" min="0" disabled style={{ width: 76 }} /></td>
                            <td>{memberName(t.assignee_id)}</td>
                            <td className="eq-right" style={{ whiteSpace: 'nowrap' }}>
                              <button type="button" className="eq-ghost eq-small" disabled>Edit</button>{' '}
                              <button type="button" className="eq-danger eq-small" disabled>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ---------------- Allocation ---------------- */}

      {tab === 'allocation' && (
        <>
          <Head title="Allocation" live={['4.1', '4.4', '4.5']} planned={['4.2', '4.3']} />
          {!group ? noGroup : (
            <>
              <div className="eq-card">
                <div className="eq-row">
                  <button onClick={allocate} disabled={busy || !group.tasks.length || !group.members.length}>
                    Allocate fairly
                  </button>
                  <button type="button" className="eq-ghost" onClick={allocate} disabled={busy || !result}>
                    Re-run
                  </button>
                  <button type="button" className="eq-ghost" disabled>Preview before saving</button>
                  <Stub />
                </div>
                {(!group.tasks.length || !group.members.length) && (
                  <p className="eq-hint">Add at least one member and one task to run an allocation.</p>
                )}
              </div>

              {result && (
                <div className="eq-card">
                  <div className="eq-score">
                    <span className="eq-score-value">{result.fairness_score}</span>
                    <span className="eq-score-label">
                      1.0 is a perfectly even split relative to capacity. It falls as the gap
                      between the busiest and least busy member widens.
                    </span>
                  </div>
                </div>
              )}

              <div className="eq-card">
                <h3>Override an assignment</h3>
                {group.tasks.length === 0 ? (
                  <p className="eq-empty">Nothing to reassign yet.</p>
                ) : (
                  <div className="eq-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th className="eq-num">Weight</th>
                          <th>Move to</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((t) => (
                          <tr key={t.id}>
                            <td>{t.title}</td>
                            <td className="eq-num">{t.weight}</td>
                            <td>
                              <select
                                value={t.assignee_id ?? ''}
                                onChange={(e) => reassign(t.id, e.target.value, t.title)}
                                disabled={busy}
                              >
                                <option value="">Unassigned</option>
                                {group.members.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </td>
                            <td><input placeholder="Why the change?" disabled /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ---------------- Progress ---------------- */}

      {tab === 'progress' && (
        <>
          <Head title="Progress" planned={['5.1', '5.2', '5.3']} />
          <div className="eq-card">
            {!group || group.tasks.length === 0 ? (
              <p className="eq-empty">No tasks to track yet.</p>
            ) : (
              <div className="eq-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th className="eq-right">Confirm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.tasks.map((t) => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>{memberName(t.assignee_id)}</td>
                        <td>
                          <select
                            value={statuses[t.id] ?? 'todo'}
                            onChange={(e) => setStatuses({ ...statuses, [t.id]: e.target.value })}
                          >
                            <option value="todo">To do</option>
                            <option value="doing">In progress</option>
                            <option value="waiting">Waiting for confirmation</option>
                            <option value="done">Done</option>
                          </select>
                        </td>
                        <td className="eq-right">
                          <button type="button" className="eq-ghost eq-small" disabled>Confirm done</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="eq-row" style={{ marginTop: 14 }}>
              <label className="eq-checkline">
                <input type="checkbox" disabled />
                Email members 24 hours before a deadline
              </label>
              <Stub />
            </div>
            <p className="eq-hint">Status is held in the browser for this release; it is not yet persisted.</p>
          </div>
        </>
      )}

      {/* ---------------- Dashboard ---------------- */}

      {tab === 'dashboard' && (
        <>
          <Head title="Dashboard" live={['6.1', '6.4']} planned={['6.2', '6.3']} />
          {!group ? noGroup : (
            <>
              <div className="eq-card">
                <h3>Workload relative to capacity</h3>
                {loads.length === 0 ? (
                  <p className="eq-empty">No members yet.</p>
                ) : (
                  loads.map((m) => {
                    const rel = m.relative
                    const pct = rel === null ? 0 : Math.min(100, (rel / peakRelative) * 100)
                    const over = rel !== null && meanRelative > 0 && rel > meanRelative * 1.2
                    return (
                      <div className="eq-load-row" key={m.id}>
                        <div className="eq-load-top">
                          <span className="eq-load-name">{m.name}</span>
                          <span className="eq-load-meta">
                            {m.load} weight · capacity {m.capacity} ·{' '}
                            {rel === null ? 'unavailable' : `${rel.toFixed(1)} relative`}
                            {over ? ' · over share' : ''}
                          </span>
                        </div>
                        <div className="eq-bar">
                          <div className={`eq-bar-fill${over ? ' is-over' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="eq-grid-2">
                <div className="eq-card">
                  <h3>History</h3>
                  {history.length === 0 ? (
                    <p className="eq-empty">Nothing recorded yet this session.</p>
                  ) : (
                    <ul className="eq-log">
                      {history.map((h, i) => (
                        <li key={i}>
                          <time>{h.at.toLocaleTimeString()}</time> {h.entry}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="eq-hint">Held in the browser for this release. <Stub /></p>
                </div>

                <div className="eq-card">
                  <h3>Share and export</h3>
                  <div className="eq-row">
                    <button type="button" className="eq-ghost" disabled>Create facilitator link</button>
                    <Stub />
                  </div>
                  <div className="eq-row" style={{ marginTop: 11 }}>
                    <button type="button" onClick={exportCsv} disabled={!group.members.length}>
                      Export dashboard as CSV
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <footer className="eq-foot">
        <span>Hedrick Credo Iranzi</span>
        <a href="https://github.com/HedrickCI/Equis" target="_blank" rel="noreferrer">Source</a>
      </footer>
    </div>
  )
}