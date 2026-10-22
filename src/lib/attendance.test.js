import { describe, it, expect } from 'vitest'
import { getStatusColor, getStatusChipClass, getStatusLabel, ATTENDANCE_STATUSES } from './attendance'

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
  it('returns bg-ok for "jelen"', () => {
    expect(getStatusColor('jelen')).toBe('bg-ok')
  })

  it('returns bg-bad for "hiányzik"', () => {
    expect(getStatusColor('hiányzik')).toBe('bg-bad')
  })

  it('returns bg-warn for "beteg"', () => {
    expect(getStatusColor('beteg')).toBe('bg-warn')
  })

  it('returns bg-accent for "sérült"', () => {
    expect(getStatusColor('sérült')).toBe('bg-accent')
  })

  it('returns bg-muted for "egyéb"', () => {
    expect(getStatusColor('egyéb')).toBe('bg-muted')
  })

  it('falls back to bg-surface-3 for an unknown status', () => {
    expect(getStatusColor('nonexistent-status')).toBe('bg-surface-3')
  })

  it('falls back to bg-surface-3 for undefined', () => {
    expect(getStatusColor(undefined)).toBe('bg-surface-3')
  })

  it('falls back to bg-surface-3 for an empty string', () => {
    expect(getStatusColor('')).toBe('bg-surface-3')
  })
})

describe('getStatusChipClass', () => {
  it('pairs a status background with a readable text colour', () => {
    expect(getStatusChipClass('jelen')).toBe('bg-ok text-on-status')
    expect(getStatusChipClass('hiányzik')).toBe('bg-bad text-on-status')
    expect(getStatusChipClass('beteg')).toBe('bg-warn text-on-status')
    expect(getStatusChipClass('sérült')).toBe('bg-accent text-accent-fg')
    expect(getStatusChipClass('egyéb')).toBe('bg-muted text-bg')
  })

  it('falls back to a neutral chip for an unknown status', () => {
    expect(getStatusChipClass('nonexistent-status')).toBe('bg-surface-3 text-fg')
    expect(getStatusChipClass(undefined)).toBe('bg-surface-3 text-fg')
  })

  it('uses the same background as getStatusColor for every status', () => {
    for (const { value } of ATTENDANCE_STATUSES) {
      expect(getStatusChipClass(value).startsWith(getStatusColor(value))).toBe(true)
    }
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
