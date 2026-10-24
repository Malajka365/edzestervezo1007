import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TeamTestProvider from '@/test/TeamTestProvider'

// Minden lekérdezés függőben marad, amíg a teszt kézzel fel nem oldja —
// így látszik, mi indul párhuzamosan és mi renderelődik részleges adatokkal.
const db = vi.hoisted(() => ({ calls: [] }))
vi.mock('@/lib/supabase', () => {
  function query(table) {
    const call = { table, head: false, range: null, single: false }
    const q = {}
    for (const m of ['order', 'eq', 'in', 'limit', 'delete', 'insert', 'update']) q[m] = () => q
    q.select = (_cols, opts) => ((call.head = !!opts?.head), q)
    q.range = (a, b) => ((call.range = [a, b]), q)
    q.single = () => ((call.single = true), q)
    let promise
    q.then = (res, rej) => {
      if (!promise) {
        promise = new Promise((r) => (call.resolve = r))
        db.calls.push(call)
      }
      return promise.then(res, rej)
    }
    return q
  }
  return {
    supabase: {
      from: query,
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) },
    },
  }
})
vi.mock('react-hot-toast', () => ({ default: Object.assign(() => {}, { error: () => {}, success: () => {} }) }))

const { default: ExerciseLibrary } = await import('@/pages/ExerciseLibrary')

const EXERCISES = [
  { id: 'e1', name: 'Fekvenyomás', difficulty: 'beginner', muscle_group: 'mell', gif_path: 'mell/bench-press.gif', equipment: [] },
  { id: 'e2', name: 'Tárogatás', difficulty: 'intermediate', muscle_group: 'mell', gif_path: null, equipment: [] },
]

const pending = (table, pred = () => true) => db.calls.filter((c) => c.table === table && !c.done && pred(c))
async function resolve(table, value, pred) {
  await act(async () => {
    for (const c of pending(table, pred)) {
      c.done = true
      c.resolve(value)
    }
  })
}

function renderLibrary(url = '/dashboard/gyakorlatok') {
  return render(
    <TeamTestProvider value={{ currentUserPermissions: { exercises: 'view' } }}>
      <MemoryRouter initialEntries={[url]}>
        <ExerciseLibrary />
      </MemoryRouter>
    </TeamTestProvider>
  )
}

beforeEach(() => {
  db.calls.length = 0
})

describe('Gyakorlattár betöltése', () => {
  it('a lista, a kedvencek, az izmok, az eszközök és az izom-index lekérdezése egyszerre indul', async () => {
    renderLibrary()
    await waitFor(() => {
      const tables = db.calls.map((c) => c.table)
      expect(tables).toEqual(
        expect.arrayContaining(['training_exercises', 'user_exercise_favorites', 'muscles', 'equipment_types', 'exercise_muscles'])
      )
    })
    expect(db.calls.every((c) => !c.done)).toBe(true)
    expect(pending('exercise_muscles', (c) => c.head)).toHaveLength(1)
  })

  it('a kártyák már a gyakorlatlista után megjelennek, az izomadatok közben töltődnek', async () => {
    renderLibrary()
    await waitFor(() => expect(pending('training_exercises')).toHaveLength(1))
    await resolve('training_exercises', { data: EXERCISES, error: null })
    expect(await screen.findByRole('button', { name: 'Fekvenyomás' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /izomadatok betöltése/i })).toBeInTheDocument()

    await resolve('exercise_muscles', { count: 0, data: null, error: null }, (c) => c.head)
    await resolve('muscles', { data: [], error: null })
    await resolve('equipment_types', { data: [], error: null })
    await resolve('user_exercise_favorites', { data: [], error: null })
    await waitFor(() => expect(screen.queryByRole('status', { name: /izomadatok betöltése/i })).not.toBeInTheDocument())
  })

  it('az izom-index lapjait a darabszám után egyszerre kéri le', async () => {
    renderLibrary()
    await waitFor(() => expect(pending('exercise_muscles', (c) => c.head)).toHaveLength(1))
    await resolve('exercise_muscles', { count: 2500, data: null, error: null }, (c) => c.head)
    await waitFor(() => expect(pending('exercise_muscles', (c) => c.range)).toHaveLength(3))
    expect(pending('exercise_muscles', (c) => c.range).map((c) => c.range)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('a részletnézet azonnal nyílik névvel és nehézséggel, a teljes sor előtt', async () => {
    renderLibrary()
    await waitFor(() => expect(pending('training_exercises')).toHaveLength(1))
    await resolve('training_exercises', { data: EXERCISES, error: null })
    fireEvent.click(await screen.findByRole('button', { name: 'Fekvenyomás' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Fekvenyomás')).toBeInTheDocument()
    expect(within(dialog).getByText('Kezdő')).toBeInTheDocument()
    expect(pending('training_exercises', (c) => c.single)).toHaveLength(1)
  })

  it('hiányzó thumbnail esetén a kártya nem tölti le a GIF-et', async () => {
    renderLibrary()
    await waitFor(() => expect(pending('training_exercises')).toHaveLength(1))
    await resolve('training_exercises', { data: EXERCISES, error: null })
    const img = await screen.findByAltText('Fekvenyomás')
    expect(img.getAttribute('src')).toBe('https://cdn.test/thumbs/mell/bench-press.webp')

    fireEvent.error(img)
    const srcs = Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('src') || '')
    expect(srcs.some((s) => s.endsWith('.gif'))).toBe(false)
  })

  it('az ?exercise= paraméter a lista betöltése után megnyitja a gyakorlatot', async () => {
    renderLibrary('/dashboard/gyakorlatok?exercise=e2')
    await waitFor(() => expect(pending('training_exercises')).toHaveLength(1))
    await resolve('training_exercises', { data: EXERCISES, error: null })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Tárogatás')).toBeInTheDocument()
  })
})
