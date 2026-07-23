import { describe, it, expect } from 'vitest'
import { getStatusColor, getStatusLabel, ATTENDANCE_STATUSES } from './attendance'

// Note: saveAttendance/deleteAttendance are intentionally NOT tested here —
// they call supabase directly and are out of scope for pure-logic unit tests.

describe('ATTENDANCE_STATUSES', () => {
  it('has exactly the 5 expected statuses, in order', () => {
    expect(ATTENDANCE_STATUSES.map((s) => s.value)).toEqual([
      'jelen',
      'hiányzik',
      'beteg',
      'sérült',
      'egyéb',
    ])
  })
})

describe('getStatusColor', () => {
  it('returns bg-green-500 for "jelen"', () => {
    expect(getStatusColor('jelen')).toBe('bg-green-500')
  })

  it('returns bg-red-500 for "hiányzik"', () => {
    expect(getStatusColor('hiányzik')).toBe('bg-red-500')
  })

  it('returns bg-yellow-500 for "beteg"', () => {
    expect(getStatusColor('beteg')).toBe('bg-yellow-500')
  })

  it('returns bg-orange-500 for "sérült"', () => {
    expect(getStatusColor('sérült')).toBe('bg-orange-500')
  })

  it('returns bg-gray-500 for "egyéb"', () => {
    expect(getStatusColor('egyéb')).toBe('bg-gray-500')
  })

  it('falls back to bg-slate-600 for an unknown status', () => {
    expect(getStatusColor('nonexistent-status')).toBe('bg-slate-600')
  })

  it('falls back to bg-slate-600 for undefined', () => {
    expect(getStatusColor(undefined)).toBe('bg-slate-600')
  })

  it('falls back to bg-slate-600 for an empty string', () => {
    expect(getStatusColor('')).toBe('bg-slate-600')
  })
})

describe('getStatusLabel', () => {
  it('returns "Jelen" for "jelen"', () => {
    expect(getStatusLabel('jelen')).toBe('Jelen')
  })

  it('returns "Hiányzik" for "hiányzik"', () => {
    expect(getStatusLabel('hiányzik')).toBe('Hiányzik')
  })

  it('returns "Beteg" for "beteg"', () => {
    expect(getStatusLabel('beteg')).toBe('Beteg')
  })

  it('returns "Sérült" for "sérült"', () => {
    expect(getStatusLabel('sérült')).toBe('Sérült')
  })

  it('returns "Egyéb" for "egyéb"', () => {
    expect(getStatusLabel('egyéb')).toBe('Egyéb')
  })

  it('falls back to echoing the raw value for an unknown status', () => {
    expect(getStatusLabel('nonexistent-status')).toBe('nonexistent-status')
  })

  it('falls back to echoing undefined for an unknown/missing status', () => {
    expect(getStatusLabel(undefined)).toBe(undefined)
  })
})
