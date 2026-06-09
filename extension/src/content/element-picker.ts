// Element picker functionality for manual product selection
import type { Product } from '@/types'
import { CONTENT_SCRIPT_CONSTANTS } from './constants'

let pickerActive = false
let pickerStep: 'name' | 'price' = 'name'
let pickedName = ''
let highlightOverlay: HTMLDivElement | null = null

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_WIDTH}px solid ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_COLOR};
    background: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BACKGROUND_COLOR};
    border-radius: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_RADIUS}px;
    z-index: ${CONTENT_SCRIPT_CONSTANTS.MAX_Z_INDEX};
    transition: all ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_TRANSITION_MS}ms ease;
  `
  document.body.appendChild(el)
  return el
}

function positionOverlay(el: HTMLDivElement, target: Element): void {
  const r = target.getBoundingClientRect()
  el.style.top = `${r.top + window.scrollY}px`
  el.style.left = `${r.left + window.scrollX}px`
  el.style.width = `${r.width}px`
  el.style.height = `${r.height}px`
}

function createToast(msg: string): HTMLDivElement {
  const old = document.getElementById('oc-picker-toast')
  if (old) {
    old.remove()
  }
  const t = document.createElement('div')
  t.id = 'oc-picker-toast'
  t.style.cssText = `
    position: fixed;
    bottom: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BOTTOM_OFFSET}px;
    left: 50%;
    transform: translateX(-50%);
    background: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BACKGROUND_COLOR};
    color: ${CONTENT_SCRIPT_CONSTANTS.TOAST_TEXT_COLOR};
    font-family: system-ui, sans-serif;
    font-size: ${CONTENT_SCRIPT_CONSTANTS.TOAST_FONT_SIZE}px;
    padding: ${CONTENT_SCRIPT_CONSTANTS.TOAST_PADDING};
    border-radius: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BORDER_RADIUS}px;
    border: 1px solid ${CONTENT_SCRIPT_CONSTANTS.TOAST_BORDER_COLOR};
    z-index: ${CONTENT_SCRIPT_CONSTANTS.MAX_Z_INDEX};
    box-shadow: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BOX_SHADOW};
  `
  t.textContent = msg
  document.body.appendChild(t)
  return t
}

function stopPicker(): void {
  pickerActive = false
  document.body.style.cursor = ''
  document.removeEventListener('mouseover', onMouseOver, true)
  document.removeEventListener('click', onPickerClick, true)
  highlightOverlay?.remove()
  highlightOverlay = null
  document.getElementById('oc-picker-toast')?.remove()
}

function onMouseOver(e: MouseEvent): void {
  if (!pickerActive || !highlightOverlay) {
    return
  }
  positionOverlay(highlightOverlay, e.target as Element)
}

function onPickerClick(e: MouseEvent): void {
  if (!pickerActive) {
    return
  }
  e.preventDefault()
  e.stopPropagation()

  const text = (e.target as Element).textContent?.trim() || ''

  if (pickerStep === 'name') {
    pickedName = text
    pickerStep = 'price'
    createToast('✅ Name captured! Now click the price.')
  } else {
    const raw = text.replace(CONTENT_SCRIPT_CONSTANTS.PRICE_REGEX, '')
    const price = parseFloat(raw)

    stopPicker()

    if (!pickedName || isNaN(price) || price <= CONTENT_SCRIPT_CONSTANTS.MIN_VALID_PRICE) {
      chrome.runtime.sendMessage({
        type: 'PICKER_RESULT',
        data: { error: 'Could not read name or price' },
      })
      return
    }

    const product: Product = {
      name: pickedName,
      price,
      url: window.location.href,
      category: 'general',
      source: 'generic',
      detectedAt: new Date().toISOString(),
    }

    chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product })
    chrome.runtime.sendMessage({ type: 'PICKER_RESULT', data: { product } })
  }
}

export function startPicker(): void {
  if (pickerActive) {
    return
  }

  pickerActive = true
  pickerStep = 'name'
  pickedName = ''

  highlightOverlay = createOverlay()
  document.body.style.cursor = 'crosshair'
  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('click', onPickerClick, true)
  createToast('👆 Click the product name')
}

export function stopPickerCleanup(): void {
  stopPicker()
}
