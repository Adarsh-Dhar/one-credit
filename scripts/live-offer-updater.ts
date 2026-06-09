/**
 * Background script to simulate live offer updates
 * Periodically modifies mock offer stores with realistic changes
 * Run with: pnpm tsx scripts/live-offer-updater.ts
 */

import { cardlyticsStore } from '../lib/mock-apis/cardlytics-banyan';
import { networkOfferStore } from '../lib/mock-apis/visa-mastercard';
import { affiliateStore } from '../lib/mock-apis/rakuten-impact';

// Configuration
const UPDATE_INTERVAL_MS = 30000; // Update every 30 seconds
const RATE_CHANGE_RANGE = 0.5; // Max rate change in percentage points
const NEW_OFFER_CHANCE = 0.2; // 20% chance to add a new offer
const EXPIRE_OFFER_CHANCE = 0.1; // 10% chance to expire an offer

// Pool of potential new offers
const NEW_OFFER_POOL = [
  {
    merchantName: 'Target',
    category: 'shopping',
    cashbackRate: 4,
    minSpend: 25,
    maxCashback: 50,
    cardNetworks: ['VISA', 'MASTERCARD'],
  },
  {
    merchantName: 'Nike',
    category: 'shopping',
    cashbackRate: 5,
    minSpend: 75,
    maxCashback: 100,
    cardNetworks: ['VISA', 'AMEX'],
  },
  {
    merchantName: 'McDonalds',
    category: 'dining',
    cashbackRate: 6,
    minSpend: 10,
    maxCashback: 20,
    cardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
  },
  {
    merchantName: 'Best Buy',
    category: 'electronics',
    cashbackRate: 3,
    minSpend: 100,
    maxCashback: 150,
    cardNetworks: ['VISA', 'MASTERCARD'],
  },
  {
    merchantName: 'Shell',
    category: 'gas',
    cashbackRate: 4,
    minSpend: 20,
    maxCashback: 40,
    cardNetworks: ['VISA', 'MASTERCARD'],
  },
];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateOfferId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Update Cardlytics offers
function updateCardlyticsOffers() {
  const offers = cardlyticsStore.listOffers() as any[];
  
  // Randomly adjust rates on existing offers
  offers.forEach(offer => {
    if (Math.random() < 0.3) { // 30% chance to change rate
      const change = getRandomInRange(-RATE_CHANGE_RANGE, RATE_CHANGE_RANGE);
      offer.cashbackRate = Math.max(1, Math.min(10, offer.cashbackRate + change));
      offer.cashbackRate = Math.round(offer.cashbackRate * 10) / 10; // Round to 1 decimal
      console.log(`[Cardlytics] Updated ${offer.merchantName} rate to ${offer.cashbackRate}%`);
    }
  });

  // Randomly expire offers
  if (Math.random() < EXPIRE_OFFER_CHANCE && offers.length > 2) {
    const randomIndex = Math.floor(Math.random() * offers.length);
    const expiredOffer = offers[randomIndex];
    expiredOffer.active = false;
    console.log(`[Cardlytics] Expired offer: ${expiredOffer.merchantName}`);
  }

  // Randomly add new offers
  if (Math.random() < NEW_OFFER_CHANCE) {
    const template = getRandomItem(NEW_OFFER_POOL);
    const newOffer = {
      offerId: generateOfferId('CL'),
      merchantName: template.merchantName,
      category: template.category,
      cashbackRate: template.cashbackRate,
      minSpend: template.minSpend,
      maxCashback: template.maxCashback,
      active: true,
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 90 days from now
      description: `${template.cashbackRate}% cashback on ${template.merchantName} purchases`,
      terms: ['Valid at participating locations', 'While supplies last'],
      cardNetworks: template.cardNetworks,
      impressionCount: 0,
      clickCount: 0,
      redemptionCount: 0,
      syncCount: 0,
    };
    offers.push(newOffer);
    console.log(`[Cardlytics] Added new offer: ${newOffer.merchantName} at ${newOffer.cashbackRate}%`);
  }
}

// Update Network offers
function updateNetworkOffers() {
  const offers = networkOfferStore.listOffers() as any[];
  
  offers.forEach(offer => {
    if (Math.random() < 0.3) {
      const change = getRandomInRange(-RATE_CHANGE_RANGE, RATE_CHANGE_RANGE);
      offer.discountRate = Math.max(1, Math.min(15, offer.discountRate + change));
      offer.discountRate = Math.round(offer.discountRate * 10) / 10;
      console.log(`[Network] Updated ${offer.merchantName} rate to ${offer.discountRate}%`);
    }
  });

  if (Math.random() < EXPIRE_OFFER_CHANCE && offers.length > 2) {
    const randomIndex = Math.floor(Math.random() * offers.length);
    const expiredOffer = offers[randomIndex];
    expiredOffer.active = false;
    console.log(`[Network] Expired offer: ${expiredOffer.merchantName}`);
  }

  if (Math.random() < NEW_OFFER_CHANCE) {
    const template = getRandomItem(NEW_OFFER_POOL);
    const newOffer = {
      offerId: generateOfferId('NW'),
      merchantName: template.merchantName,
      category: template.category,
      discountRate: template.cashbackRate,
      minSpend: template.minSpend,
      maxDiscount: template.maxCashback,
      active: true,
      network: getRandomItem(template.cardNetworks),
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), // 60 days from now
      description: `${template.cashbackRate}% off at ${template.merchantName}`,
      geoTargets: [{ country: 'US' }],
    };
    offers.push(newOffer);
    console.log(`[Network] Added new offer: ${newOffer.merchantName} at ${newOffer.discountRate}%`);
  }
}

// Update Affiliate offers
function updateAffiliateOffers() {
  const result = affiliateStore.sync() as any;
  const deals = [...result.rakuten, ...result.impact];
  
  deals.forEach(deal => {
    if (Math.random() < 0.3) {
      const change = getRandomInRange(-RATE_CHANGE_RANGE, RATE_CHANGE_RANGE);
      deal.commissionRate = Math.max(1, Math.min(20, deal.commissionRate + change));
      deal.commissionRate = Math.round(deal.commissionRate * 10) / 10;
      console.log(`[Affiliate] Updated ${deal.merchantName} rate to ${deal.commissionRate}%`);
    }
  });

  if (Math.random() < EXPIRE_OFFER_CHANCE && deals.length > 2) {
    const randomIndex = Math.floor(Math.random() * deals.length);
    const expiredDeal = deals[randomIndex];
    expiredDeal.active = false;
    console.log(`[Affiliate] Expired offer: ${expiredDeal.merchantName}`);
  }

  if (Math.random() < NEW_OFFER_CHANCE) {
    const template = getRandomItem(NEW_OFFER_POOL);
    const newDeal = {
      dealId: generateOfferId('AF'),
      merchantName: template.merchantName,
      vertical: template.category,
      commissionRate: template.cashbackRate,
      commissionType: 'percentage',
      minSpend: template.minSpend,
      maxReward: template.maxCashback,
      active: true,
      network: getRandomItem(template.cardNetworks),
      startDate: formatDate(new Date()),
      endDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      description: `${template.cashbackRate}% commission on ${template.merchantName}`,
      minEpc: 0.5,
    };
    if (Math.random() < 0.5) {
      result.rakuten.push(newDeal);
      console.log(`[Affiliate/Rakuten] Added new offer: ${newDeal.merchantName} at ${newDeal.commissionRate}%`);
    } else {
      result.impact.push(newDeal);
      console.log(`[Affiliate/Impact] Added new offer: ${newDeal.merchantName} at ${newDeal.commissionRate}%`);
    }
  }
}

function updateAllOffers() {
  console.log(`\n[${new Date().toISOString()}] Updating offers...`);
  updateCardlyticsOffers();
  updateNetworkOffers();
  updateAffiliateOffers();
  console.log(`[${new Date().toISOString()}] Update complete\n`);
}

// Main loop
function startUpdater() {
  console.log('Starting live offer updater...');
  console.log(`Update interval: ${UPDATE_INTERVAL_MS}ms`);
  console.log('Press Ctrl+C to stop\n');
  
  // Initial update
  updateAllOffers();
  
  // Periodic updates
  setInterval(updateAllOffers, UPDATE_INTERVAL_MS);
}

// Start the updater
startUpdater();
