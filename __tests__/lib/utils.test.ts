// __tests__/lib/utils.test.ts
//
// Unit tests for utility functions in lib/utils.ts

import { describe, it, expect } from '@jest/globals'
import { inferCategory } from '@/lib/utils'

describe('inferCategory', () => {
  describe('grocery patterns', () => {
    it('should match rice', () => {
      expect(inferCategory('rice')).toBe('grocery')
    })

    it('should match dal', () => {
      expect(inferCategory('dal')).toBe('grocery')
    })

    it('should match flour', () => {
      expect(inferCategory('flour')).toBe('grocery')
    })

    it('should match cashew nuts', () => {
      expect(inferCategory('cashew nuts')).toBe('grocery')
    })

    it('should match almonds', () => {
      expect(inferCategory('almonds')).toBe('grocery')
    })

    it('should match milk', () => {
      expect(inferCategory('milk')).toBe('grocery')
    })

    it('should match curd', () => {
      expect(inferCategory('curd')).toBe('grocery')
    })

    it('should match biscuits', () => {
      expect(inferCategory('biscuits')).toBe('grocery')
    })
  })

  describe('electronics patterns', () => {
    it('should match iPhone', () => {
      expect(inferCategory('iPhone')).toBe('electronics')
    })

    it('should match laptop', () => {
      expect(inferCategory('laptop')).toBe('electronics')
    })

    it('should match tablet', () => {
      expect(inferCategory('tablet')).toBe('electronics')
    })

    it('should match headphones', () => {
      expect(inferCategory('headphones')).toBe('electronics')
    })

    it('should match charger', () => {
      expect(inferCategory('charger')).toBe('electronics')
    })
  })

  describe('travel patterns', () => {
    it('should match flight ticket', () => {
      expect(inferCategory('flight ticket')).toBe('travel')
    })

    it('should match hotel booking', () => {
      expect(inferCategory('hotel booking')).toBe('travel')
    })

    it('should match train ticket', () => {
      expect(inferCategory('train ticket')).toBe('travel')
    })

    it('should match tour package', () => {
      expect(inferCategory('tour package')).toBe('travel')
    })
  })

  describe('fashion patterns', () => {
    it('should match shirt', () => {
      expect(inferCategory('shirt')).toBe('fashion')
    })

    it('should match jeans', () => {
      expect(inferCategory('jeans')).toBe('fashion')
    })

    it('should match saree', () => {
      expect(inferCategory('saree')).toBe('fashion')
    })

    it('should match shoes', () => {
      expect(inferCategory('shoes')).toBe('fashion')
    })
  })

  describe('dining patterns', () => {
    it('should match restaurant', () => {
      expect(inferCategory('restaurant')).toBe('dining')
    })

    it('should match food delivery', () => {
      expect(inferCategory('food delivery')).toBe('dining')
    })

    it('should match zomato', () => {
      expect(inferCategory('zomato')).toBe('dining')
    })
  })

  describe('streaming patterns', () => {
    it('should match netflix', () => {
      expect(inferCategory('netflix')).toBe('streaming')
    })

    it('should match spotify', () => {
      expect(inferCategory('spotify')).toBe('streaming')
    })

    it('should match prime video', () => {
      expect(inferCategory('prime video')).toBe('streaming')
    })
  })

  describe('fallback to shopping', () => {
    it('should fallback for random product', () => {
      expect(inferCategory('random product')).toBe('shopping')
    })

    it('should fallback for unknown item', () => {
      expect(inferCategory('unknown item')).toBe('shopping')
    })

    it('should fallback for empty string', () => {
      expect(inferCategory('')).toBe('shopping')
    })
  })

  describe('case insensitivity', () => {
    it('should match uppercase RICE', () => {
      expect(inferCategory('RICE')).toBe('grocery')
    })

    it('should match uppercase LAPTOP', () => {
      expect(inferCategory('LAPTOP')).toBe('electronics')
    })

    it('should match uppercase FLIGHT', () => {
      expect(inferCategory('FLIGHT')).toBe('travel')
    })
  })
})
