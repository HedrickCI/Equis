import { useState } from 'react'
import { api } from './api'

export default function App() {
  const [group, setGroup] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

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

  const createGroup = (event) => {
    event.preventDefault()
    const name = new FormData(event.target).get('name')
    run(async () => {
      const created = await api.createGroup(name)
      setGroup(created)
      setResult(null)
      event.target.reset()
    })
  }

  const addMember = (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    run(async () => {
      await api.addMember(group.id, {
        name: form.get('name'),
        capacity: Number(form.get('capacity')),
      })
      setGroup(await api.getGroup(group.id))
      event.target.reset()
    })
  }

  const addTask = (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    run(async () => {
      await api.addTask(group.id, {
        title: form.get('title'),
        weight: Number(form.get('weight')),
      })
      setGroup(await api.getGroup(group.id))
      event.target.reset()
    })
  }

  const allocate = () =>
    run(async () => {
      setResult(await api.allocate(group.id))
      setGroup(await api.getGroup(group.id))
    })

  const memberName = (id) =>
    group?.members.find((m) => m.id === id)?.name ?? 'Unassigned'

  return (
    <div className="container">
      <h1>Equis</h1>
      <p className="subtitle">Group work the fair way</p>

      {error && <p className="error">{error}</p>}

      {!group && (
        <form className="card" onSubmit={createGroup}>
          <h2>Create a group</h2>
          <div className="row">
            <input name="name" placeholder="Group name" required />
            <button disabled={busy}>Create</button>
          </div>
        </form>
      )}

      {group && (
        <>
          <div className="card">
            <h2>{group.name}</h2>

            <form className="row" onSubmit={addMember}>
              <input name="name" placeholder="Member name" required />
              <input
                name="capacity"
                type="number"
                step="0.1"
                min="0"
                max="2"
                defaultValue="1.0"
                title="Relative capacity: 1.0 is a normal load"
              />
              <button disabled={busy}>Add member</button>
            </form>

            {group.members.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Tasks</h2>

            <form className="row" onSubmit={addTask}>
              <input name="title" placeholder="Task title" required />
              <input
                name="weight"
                type="number"
                min="1"
                max="10"
                defaultValue="5"
                title="Effort weight, 1 to 10"
              />
              <button disabled={busy}>Add task</button>
            </form>

            {group.tasks.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Weight</th>
                    <th>Assigned to</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td>{t.weight}</td>
                      <td>{memberName(t.assignee_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button
            onClick={allocate}
            disabled={busy || !group.tasks.length || !group.members.length}
          >
            Allocate fairly
          </button>

          {result && (
            <p>
              Fairness score: <strong>{result.fairness_score}</strong> (1.0 is a
              perfectly even split)
            </p>
          )}
        </>
      )}
    </div>
  )
}
