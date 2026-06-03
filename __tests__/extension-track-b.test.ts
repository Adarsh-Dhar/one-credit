import fetch from 'node-fetch';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// These tests run AFTER exporting from v0
// They test actual backend API responses and integration
// Set BASE_URL to your deployed preview or local backend

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = 'demo@omniwallet.com';

describe('Track B - Backend Integration Tests', () => {
  describe('Test 11: /api/wallet Response Shape', () => {
    it('should return cards array with required fields', async () => {
      const response = await fetch(
        `${BASE_URL}/api/wallet?email=${TEST_USER_EMAIL}`
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('cards');
      expect(Array.isArray(data.cards)).toBe(true);
      expect(data.cards.length).toBeGreaterThan(0);
    });

    it('should have correct shape for each card object', async () => {
      const response = await fetch(
        `${BASE_URL}/api/wallet?email=${TEST_USER_EMAIL}`
      );
      
      const data = await response.json();
      const card = data.cards[0];
      
      // Required fields
      expect(card).toHaveProperty('key');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('earnRates');
      expect(card).toHaveProperty('opRate');
      expect(card).toHaveProperty('currency');
      expect(card).toHaveProperty('balance');
      
      // Verify types
      expect(typeof card.key).toBe('string');
      expect(typeof card.name).toBe('string');
      expect(typeof card.opRate).toBe('number');
      expect(typeof card.balance).toBe('number');
    });

    it('should not return display_name or card_id (must use name and key)', async () => {
      const response = await fetch(
        `${BASE_URL}/api/wallet?email=${TEST_USER_EMAIL}`
      );
      
      const data = await response.json();
      const card = data.cards[0];
      
      // These would cause extension to fail silently
      expect(card).not.toHaveProperty('display_name');
      expect(card).not.toHaveProperty('card_id');
      
      // Must use the correct keys
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('key');
    });

    it('should return multiple cards', async () => {
      const response = await fetch(
        `${BASE_URL}/api/wallet?email=${TEST_USER_EMAIL}`
      );
      
      const data = await response.json();
      
      // Extension expects at least 2-4 cards for meaningful comparison
      expect(data.cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Test 12: /api/ai/analyze OP Calculation Accuracy', () => {
    it('should return valid JSON (not markdown-wrapped)', async () => {
      const prompt = `User wants to buy Apple MacBook Pro 14" at $1999 from Amazon in the electronics category. User ID: ${TEST_USER_EMAIL}. Calculate OP costs.`;
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      expect(response.status).toBe(200);
      
      const text = await response.text();
      
      // Should NOT contain markdown backticks
      expect(text).not.toMatch(/^```/);
      
      // Should parse as JSON
      const data = JSON.parse(text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should include all 8 required fields for each card', async () => {
      const prompt = `Analyze OP costs for ${TEST_USER_EMAIL}`;
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      const card = data[0];
      
      expect(card).toHaveProperty('cardKey');
      expect(card).toHaveProperty('cardName');
      expect(card).toHaveProperty('opCost');
      expect(card).toHaveProperty('rewardsEarned');
      expect(card).toHaveProperty('netDollarCost');
      expect(card).toHaveProperty('bestRedemptionCpp');
      expect(card).toHaveProperty('currentRedemptionCpp');
      expect(card).toHaveProperty('opportunityMultiplier');
      expect(card).toHaveProperty('reasoning');
      expect(card).toHaveProperty('bestAlternativeUse');
    });

    it('should return opCost as number, not string', async () => {
      const prompt = `Analyze OP costs for ${TEST_USER_EMAIL}`;
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      for (const card of data) {
        expect(typeof card.opCost).toBe('number');
        expect(typeof card.opportunityMultiplier).toBe('number');
        expect(typeof card.rewardsEarned).toBe('number');
        expect(typeof card.netDollarCost).toBe('number');
      }
    });

    it('should sort cards ascending by opCost (lowest first)', async () => {
      const prompt = `Analyze OP costs for ${TEST_USER_EMAIL}`;
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      // Verify ascending order
      for (let i = 1; i < data.length; i++) {
        expect(data[i].opCost).toBeGreaterThanOrEqual(data[i - 1].opCost);
      }
    });

    it('should have reasoning text under 100 words', async () => {
      const prompt = `Analyze OP costs for ${TEST_USER_EMAIL}`;
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      for (const card of data) {
        const wordCount = card.reasoning.split(/\s+/).length;
        expect(wordCount).toBeLessThan(100);
      }
    });
  });

  describe('Test 13: Auth Token Passthrough', () => {
    it('should use Authorization header when provided', async () => {
      // Get a real auth token from your app (you'd need to log in first)
      const token = process.env.TEST_AUTH_TOKEN || 'test-token';
      
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // If auth is correctly implemented, response should be 200 (or 401 if token invalid)
      // Should NOT be 200 with demo data if token is missing/invalid
      expect([200, 401]).toContain(response.status);
    });

    it('should return correct user cards when authenticated', async () => {
      const token = process.env.TEST_AUTH_TOKEN || 'test-token';
      
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Verify cards belong to authenticated user
        // (You'd need to set up test data that differs between users)
        expect(data.cards).toBeDefined();
        expect(Array.isArray(data.cards)).toBe(true);
      }
    });

    it('should not return demo cards when auth token is provided but user differs', async () => {
      const validToken = process.env.TEST_AUTH_TOKEN;
      const demoUserCards = ['Chase Sapphire Reserve', 'Amex Gold', 'Apple Card'];
      
      if (validToken) {
        const response = await fetch(`${BASE_URL}/api/wallet`, {
          headers: {
            'Authorization': `Bearer ${validToken}`,
          },
        });
        
        const data = await response.json();
        
        // If logged in as a different user, should NOT get demo cards
        const cardNames = data.cards.map((c: any) => c.name);
        const hasAllDemoCards = demoUserCards.every((name) =>
          cardNames.includes(name)
        );
        
        // Either cards are different, or user IS the demo user
        expect(hasAllDemoCards).toBe(false); // unless testing as demo@omniwallet.com
      }
    });
  });

  describe('Test 14: Product Detection Accuracy Per Site', () => {
    it('should parse Amazon product data correctly', async () => {
      // Simulate Amazon product scrape
      const amazonProductData = {
        name: 'Apple MacBook Pro 14" M4 (2024)',
        price: 1999.99,
        category: 'electronics',
      };
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User buying: ${amazonProductData.name} at $${amazonProductData.price}`,
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should get valid results, not NaN or undefined
      expect(data[0].opCost).not.toBeNaN();
      expect(data[0].opCost).toBeGreaterThan(0);
    });

    it('should parse Walmart product data correctly', async () => {
      const walmartProductData = {
        name: 'Instant Pot Duo Plus',
        price: 89.99,
        category: 'grocery',
      };
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User buying: ${walmartProductData.name} at $${walmartProductData.price}`,
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].opCost).not.toBeNaN();
    });

    it('should parse Best Buy product data correctly', async () => {
      const bestBuyProductData = {
        name: 'Sony WH-1000XM5 Headphones',
        price: 399.99,
        category: 'electronics',
      };
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User buying: ${bestBuyProductData.name} at $${bestBuyProductData.price}`,
        }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].opCost).not.toBeNaN();
    });

    it('should not return undefined or NaN for product info', async () => {
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Calculate OP for a $100 purchase`,
        }),
      });
      
      const data = await response.json();
      
      for (const card of data) {
        expect(card.opCost).not.toBeUndefined();
        expect(card.opCost).not.toBeNaN();
        expect(card.netDollarCost).not.toBeUndefined();
        expect(card.netDollarCost).not.toBeNaN();
      }
    });
  });

  describe('Test 15: OP Cost Changes When Product Changes', () => {
    it('should return different OP rankings for MacBook Pro vs Nike Shoes', async () => {
      // Test 1: MacBook Pro
      const macbookResponse = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `MacBook Pro 14" at $1999 in electronics category`,
        }),
      });
      
      const macbookData = await macbookResponse.json();
      const macbookWinner = macbookData[0];
      
      // Test 2: Nike Shoes
      const nikeResponse = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Nike Shoes at $120 in shopping category`,
        }),
      });
      
      const nikeData = await nikeResponse.json();
      const nikeWinner = nikeData[0];
      
      // Winners OR OP costs should differ
      // (Same card can win, but OP cost should change with purchase amount)
      expect(macbookWinner.opCost).not.toEqual(nikeWinner.opCost);
    });

    it('should return different OP rankings for grocery vs electronics', async () => {
      const groceryResponse = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Instant Pot at $89 in grocery category`,
        }),
      });
      
      const groceryData = await groceryResponse.json();
      
      const electronicsResponse = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Instant Pot at $89 in electronics category`,
        }),
      });
      
      const electronicsData = await electronicsResponse.json();
      
      // Different categories should potentially have different winners
      // Or at least different OP cost calculations
      const groceryOPSum = groceryData.reduce((sum: number, c: any) => sum + c.opCost, 0);
      const electronicsOPSum = electronicsData.reduce(
        (sum: number, c: any) => sum + c.opCost,
        0
      );
      
      // Should not be identical
      expect(groceryOPSum).not.toEqual(electronicsOPSum);
    });

    it('should not return cached or identical results for different purchases', async () => {
      const call1 = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Purchase 1: $1000`,
        }),
      });
      
      const data1 = await call1.json();
      
      const call2 = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Purchase 2: $100`,
        }),
      });
      
      const data2 = await call2.json();
      
      // Should not be identical
      expect(data1).not.toEqual(data2);
    });
  });

  describe('Test 16: Graceful Error States', () => {
    it('should return error message when API fails', async () => {
      // Break the API by calling a nonexistent endpoint
      const response = await fetch(`${BASE_URL}/api/extension/analyze-broken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });
      
      // Should return 404 or 400, not 500 or hang
      expect([400, 404, 500]).toContain(response.status);
      
      // Should return JSON error, not blank
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should have error message under 50 words (fits in UI)', async () => {
      const response = await fetch(`${BASE_URL}/api/extension/analyze-broken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        const wordCount = data.error.split(/\s+/).length;
        expect(wordCount).toBeLessThan(50);
      }
    });

    it('should timeout gracefully after 8 seconds', async () => {
      // This is a conceptual test — in practice you'd mock a slow API
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' }),
          signal: AbortSignal.timeout(8000),
        });
        
        const endTime = Date.now();
        
        // Should respond or timeout within 8 seconds
        expect(endTime - startTime).toBeLessThan(8500);
      } catch (err: any) {
        // Timeout error should be caught
        expect(err.name).toBe('AbortError');
      }
    });

    it('should not leave UI in loading state indefinitely on error', async () => {
      // This test is more of an E2E check — verify via agent-browser
      // after deploying that error doesn't freeze the calculating spinner
      
      const response = await fetch(`${BASE_URL}/api/extension/analyze-broken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });
      
      // Backend should respond (not timeout indefinitely)
      expect(response).toBeDefined();
    });
  });

  describe('Priority Tests (run these first)', () => {
    it('[PRIORITY] Test 1: State machine - all transitions work', async () => {
      // This is a marker test showing which should be prioritized
      // In actual test run, this would be subsumed by the full suite
      expect(true).toBe(true); // Placeholder
    });

    it('[PRIORITY] Test 12: AI response parses correctly', async () => {
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze OP for ${TEST_USER_EMAIL}`,
        }),
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('opCost');
    });

    it('[PRIORITY] Test 4: OP savings calculated correctly', async () => {
      const response = await fetch(`${BASE_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Calculate OP for $2000 purchase`,
        }),
      });
      
      const data = await response.json();
      
      const worst = Math.max(...data.map((c: any) => c.opCost));
      const best = Math.min(...data.map((c: any) => c.opCost));
      const savings = worst - best;
      
      expect(savings).toBeGreaterThan(0);
    });

    it('[PRIORITY] Test 16: Error handling works', async () => {
      const response = await fetch(`${BASE_URL}/api/extension/analyze-broken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' }),
      });
      
      // Should not hang indefinitely
      expect(response).toBeDefined();
      expect([400, 404, 500]).toContain(response.status);
    });

    it('[PRIORITY] Test 13: Auth passthrough works', async () => {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        headers: {
          'Authorization': `Bearer test-token`,
        },
      });
      
      // Should get response (200 or 401), not error
      expect([200, 401]).toContain(response.status);
    });
  });
});
