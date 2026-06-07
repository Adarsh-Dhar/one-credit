// __tests__/lib/utils.test.ts
//
// Unit tests for utility functions in lib/utils.ts

import { describe, it, expect } from '@jest/globals'
import { inferCategory } from '@/lib/utils'

describe('inferCategory', () => {
  it('should match grocery patterns', () => {
    expect(inferCategory('rice')).toBe('grocery')
    expect(inferCategory('dal')).toBe('grocery')
    expect(inferCategory('flour')).toBe('grocery')
    expect(inferCategory('cashew nuts')).toBe('grocery')
    expect(inferCategory('almonds')).toBe('grocery')
    expect(inferCategory('milk')).toBe('grocery')
    expect(inferCategory('curd')).toBe('grocery')
    expect(inferCategory('biscuits')).toBe('grocery')
  })

  it('should match electronics patterns', () => {
    expect(inferCategory('iPhone')).toBe('electronics')
    expect(inferCategory('laptop')).toBe('electronics')
    expect(inferCategory('tablet')).toBe('electronics')
    expect(inferCategory('headphones')).toBe('electronics')
    expect(inferCategory('charger')).toBe('electronics')
  })

  it('should match travel patterns', () => {
    expect(inferCategory('flight ticket')).toBe('travel')
    expect(inferCategory('hotel booking')).toBe('travel')
    expect(inferCategory('train ticket')).toBe('travel')
    expect(inferCategory('tour package')).toBe('travel')
  })

  it('should match fashion patterns', () => {
    expect(inferCategory('shirt')).toBe('fashion')
    expect(inferCategory('jeans')).toBe('fashion')
    expect(inferCategory('saree')).toBe('fashion')
    expect(inferCategory('shoes')).toBe('fashion')
  })

  it('should match dining patterns', () => {
    expect(inferCategory('restaurant')).toBe('dining')
    expect(inferCategory('food delivery')).toBe('dining')
    expect(inferCategory('zomato')).toBe('dining')
  })

  it('should match streaming patterns', () => {
    expect(inferCategory('netflix')).toBe('streaming')
    expect(inferCategory('spotify')).toBe('streaming')
    expect(inferCategory('prime video')).toBe('streaming')
  })

  it('should fallback to shopping for unknown patterns', () => {
    expect(inferCategory('random product')).toBe('shopping')
    expect(inferCategory('unknown item')).toBe('shopping')
    expect(inferCategory('')).toBe('shopping')
  })

  it('should be case-insensitive', () => {
    expect(inferCategory('RICE')).toBe('grocery')
    expect(inferCategory('LAPTOP')).toBe('electronics')
    expect(inferCategory('FLIGHT')).toBe('travel')
  })
})
