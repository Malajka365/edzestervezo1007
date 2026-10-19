import { describe, it, expect } from 'vitest'
import { filterExercises } from './filterExercises'

const EX = [
  { id: 1, name: 'Fekvenyomás', name_en: 'Bench press', muscle_group: 'mell', difficulty: 'intermediate', modality: 'erosites' },
  { id: 2, name: 'Húzódzkodás', name_en: 'Pull-up', muscle_group: 'hat', difficulty: 'advanced', modality: 'erosites' },
  { id: 3, name: 'Guggolás', name_en: 'Squat', muscle_group: 'quad', difficulty: 'beginner', modality: 'kalisztenika' },
]
const MUSCLES = { 1: 'nagy mellizom pectoralis major', 2: 'széles hátizom latissimus dorsi', 3: 'egyenes combizom rectus femoris' }
const base = { searchTerm: '', muscleGroup: 'mell', difficulty: 'all', modality: 'all', favoritesOnly: false, favorites: [], muscleSearchByExercise: MUSCLES }

describe('filterExercises — böngészés', () => {
  it('csak a kiválasztott izomcsoportot adja vissza', () => {
    const r = filterExercises(EX, { ...base, muscleGroup: 'mell' })
    expect(r.map((e) => e.id)).toEqual([1])
  })
})

describe('filterExercises — keresés', () => {
  it('névre talál minden csoporton át', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'guggol' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
  it('izom latin nevére talál (a kiválasztott csoporton kívül is)', () => {
    const r = filterExercises(EX, { ...base, muscleGroup: 'mell', searchTerm: 'latissimus' })
    expect(r.map((e) => e.id)).toEqual([2])
  })
  it('izom magyar nevére talál', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'combizom' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
})

describe('filterExercises — rátét szűrők', () => {
  it('nehézségre szűr keresés közben', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', difficulty: 'advanced' })
    expect(r.map((e) => e.id)).toEqual([2])
  })
  it('modalitásra szűr', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', modality: 'kalisztenika' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
  it('kedvencekre szűr', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', favoritesOnly: true, favorites: [2] })
    expect(r.map((e) => e.id)).toEqual([2])
  })
})

describe('filterExercises — hiányzó modality', () => {
  const LEGACY = [
    { id: 9, name: 'Régi gyakorlat', name_en: 'Legacy move', muscle_group: 'mell', difficulty: 'beginner', modality: null },
  ]
  it('a null modality erősítésnek számít', () => {
    const r = filterExercises(LEGACY, { ...base, searchTerm: 'legacy', modality: 'erosites' })
    expect(r.map((e) => e.id)).toEqual([9])
  })
  it('és más modalitásra szűrve kiesik', () => {
    const r = filterExercises(LEGACY, { ...base, searchTerm: 'legacy', modality: 'kalisztenika' })
    expect(r).toEqual([])
  })
})
