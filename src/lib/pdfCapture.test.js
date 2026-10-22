import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('html2canvas', () => ({ default: vi.fn() }))

import html2canvas from 'html2canvas'
import { captureForPdf } from './pdfCapture'

describe('captureForPdf', () => {
  let el

  beforeEach(() => {
    html2canvas.mockReset()
    el = document.createElement('div')
  })

  it('sets the light theme during the capture and removes it afterwards', async () => {
    let themeDuringCall
    const canvas = {}
    html2canvas.mockImplementation(async (element) => {
      themeDuringCall = element.dataset.theme
      return canvas
    })

    const result = await captureForPdf(el)

    expect(themeDuringCall).toBe('light')
    expect(result).toBe(canvas)
    expect(el.hasAttribute('data-theme')).toBe(false)
  })

  it('restores a previous theme value', async () => {
    el.dataset.theme = 'dark'
    html2canvas.mockImplementation(async (element) => {
      expect(element.dataset.theme).toBe('light')
      return {}
    })

    await captureForPdf(el)

    expect(el.dataset.theme).toBe('dark')
  })

  it('passes a white background and lets options override it', async () => {
    html2canvas.mockResolvedValue({})

    await captureForPdf(el, { scale: 2 })
    expect(html2canvas).toHaveBeenLastCalledWith(el, { backgroundColor: '#ffffff', scale: 2 })

    await captureForPdf(el, { backgroundColor: '#eeeeee' })
    expect(html2canvas).toHaveBeenLastCalledWith(el, { backgroundColor: '#eeeeee' })
  })

  it('restores the attribute when html2canvas rejects', async () => {
    el.dataset.theme = 'dark'
    html2canvas.mockRejectedValue(new Error('boom'))

    await expect(captureForPdf(el)).rejects.toThrow('boom')
    expect(el.dataset.theme).toBe('dark')

    const bare = document.createElement('div')
    await expect(captureForPdf(bare)).rejects.toThrow('boom')
    expect(bare.hasAttribute('data-theme')).toBe(false)
  })
})
