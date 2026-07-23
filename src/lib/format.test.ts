import { describe, it, expect } from 'vitest'
import { formatHungarianDate } from './format'

describe('formatHungarianDate', () => {
  it('formats an ISO date string in hu-HU format', () => {
    expect(formatHungarianDate('2026-07-23')).toBe('2026. 07. 23.')
  })

  it('returns an empty string for null', () => {
    expect(formatHungarianDate(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(formatHungarianDate(undefined)).toBe('')
  })
})
