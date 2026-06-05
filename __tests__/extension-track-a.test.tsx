import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OneCreditTxPortal from '@/components/OneCreditTxPortal';

describe('Track A - UI/Logic Tests', () => {
  describe('Test 1: State Machine Completeness', () => {
    it('should transition from idle to detected when pill is clicked', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Component starts in idle state with small pill
      const pill = container.querySelector('[data-testid="idle-pill"]');
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveClass('w-10', 'h-20');
      
      // Click pill to expand
      fireEvent.click(pill!);
      
      await waitFor(() => {
        const preview = container.querySelector('[data-testid="detected-preview"]');
        expect(preview).toBeInTheDocument();
      });
    });

    it('should transition from detected to calculating when analyze button is clicked', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Start with pill
      const pill = container.querySelector('[data-testid="idle-pill"]');
      fireEvent.click(pill!);
      
      await waitFor(() => {
        const analyzeBtn = screen.getByRole('button', { name: /Analyze with AI/i });
        expect(analyzeBtn).toBeInTheDocument();
        fireEvent.click(analyzeBtn);
      });
      
      await waitFor(() => {
        const calculating = container.querySelector('[data-testid="calculating-state"]');
        expect(calculating).toBeInTheDocument();
      });
    });

    it('should close detected preview when X button is clicked', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Go to detected state
      const pill = container.querySelector('[data-testid="idle-pill"]');
      fireEvent.click(pill!);
      
      await waitFor(() => {
        const closeBtn = container.querySelector('[data-testid="close-detected"]');
        expect(closeBtn).toBeInTheDocument();
        fireEvent.click(closeBtn!);
      });
      
      await waitFor(() => {
        const preview = container.querySelector('[data-testid="detected-preview"]');
        expect(preview).not.toBeInTheDocument();
      });
    });

    it('should auto-transition from calculating to results after ~2.8s', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump directly to calculating via dev switcher (simulated)
      const devCalcBtn = screen.getByTestId('dev-state-calculating');
      fireEvent.click(devCalcBtn);
      
      // Should show calculating state initially
      const calculating = container.querySelector('[data-testid="calculating-state"]');
      expect(calculating).toBeInTheDocument();
      
      // Wait for auto-transition
      await waitFor(
        () => {
          const results = container.querySelector('[data-testid="results-state"]');
          expect(results).toBeInTheDocument();
        },
        { timeout: 3500 }
      );
    });

    it('should transition from results to confirmed when card is selected', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump to results state
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const cardBtn = screen.getByRole('button', { name: /Use Chase Sapphire/i });
        expect(cardBtn).toBeInTheDocument();
        fireEvent.click(cardBtn);
      });
      
      await waitFor(() => {
        const confirmed = container.querySelector('[data-testid="confirmed-state"]');
        expect(confirmed).toBeInTheDocument();
      });
    });

    it('should allow recalculation from results state', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump to results
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const recalcBtn = screen.getByRole('button', { name: /Recalculate/i });
        fireEvent.click(recalcBtn);
      });
      
      await waitFor(() => {
        const calculating = container.querySelector('[data-testid="calculating-state"]');
        expect(calculating).toBeInTheDocument();
      });
    });

    it('should return to idle when Done is clicked from confirmed state', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump to confirmed
      const devConfirmedBtn = screen.getByTestId('dev-state-confirmed');
      fireEvent.click(devConfirmedBtn);
      
      await waitFor(() => {
        const doneBtn = screen.getByRole('button', { name: /Done/i });
        fireEvent.click(doneBtn);
      });
      
      await waitFor(() => {
        const pill = container.querySelector('[data-testid="idle-pill"]');
        expect(pill).toBeInTheDocument();
      });
    });
  });

  describe('Test 2: OP Cost Ranking Logic', () => {
    it('should always rank cards by ascending opCost', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump to results
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const cards = container.querySelectorAll('[data-testid^="card-rank-"]');
        expect(cards.length).toBe(4);
        
        // Verify ranks are in order
        expect(cards[0]).toHaveAttribute('data-rank', '1');
        expect(cards[1]).toHaveAttribute('data-rank', '2');
        expect(cards[2]).toHaveAttribute('data-rank', '3');
        expect(cards[3]).toHaveAttribute('data-rank', '4');
      });
    });

    it('should compute winner based on sorted opCost (rank 1 card)', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const winnerBanner = container.querySelector('[data-testid="winner-banner"]');
        expect(winnerBanner).toHaveTextContent('Chase Sapphire Reserve');
        expect(winnerBanner).toHaveTextContent('4,157 OP');
      });
    });

    it('should recompute ranking when mock data opCost values change', async () => {
      // This test verifies ranking is dynamic, not hardcoded
      // In a real test, you'd need to pass mutable mock data to component
      const mockCardsWithSwappedCosts = [
        { ...mockCards[0], opCost: 6230 }, // worst
        { ...mockCards[1], opCost: 5494 },
        { ...mockCards[2], opCost: 5897 },
        { ...mockCards[3], opCost: 4157 }, // best (was rank 4)
      ];
      
      const { container } = render(
        <OneCreditTxPortal initialCards={mockCardsWithSwappedCosts} />
      );
      
      await waitFor(() => {
        const winnerBanner = container.querySelector('[data-testid="winner-banner"]');
        expect(winnerBanner).toHaveTextContent('Apple Card');
        expect(winnerBanner).toHaveTextContent('4,157 OP');
      });
    });
  });

  describe('Test 3: Accordion Behavior', () => {
    it('should expand only rank 1 card on results load', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const rank1Details = container.querySelector('[data-testid="card-details-1"]');
        expect(rank1Details).toHaveClass('expanded');
        
        const rank2Details = container.querySelector('[data-testid="card-details-2"]');
        expect(rank2Details).not.toHaveClass('expanded');
      });
    });

    it('should collapse rank 1 and expand rank 2 when rank 2 header is clicked', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const rank2Header = container.querySelector('[data-testid="card-header-2"]');
        fireEvent.click(rank2Header!);
      });
      
      await waitFor(() => {
        const rank1Details = container.querySelector('[data-testid="card-details-1"]');
        expect(rank1Details).not.toHaveClass('expanded');
        
        const rank2Details = container.querySelector('[data-testid="card-details-2"]');
        expect(rank2Details).toHaveClass('expanded');
      });
    });

    it('should toggle collapse when same card header is clicked twice', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const rank1Header = container.querySelector('[data-testid="card-header-1"]');
        
        // Click to collapse
        fireEvent.click(rank1Header!);
        expect(container.querySelector('[data-testid="card-details-1"]')).not.toHaveClass('expanded');
        
        // Click to expand again
        fireEvent.click(rank1Header!);
        expect(container.querySelector('[data-testid="card-details-1"]')).toHaveClass('expanded');
      });
    });
  });

  describe('Test 4: OP Savings Calculation Accuracy', () => {
    it('should calculate correct OP savings: worst - best', async () => {
      // Formula: 6230 (worst) - 4157 (best) = 2073
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const savingsBanner = container.querySelector('[data-testid="savings-display"]');
        expect(savingsBanner).toHaveTextContent('2,073 OP');
      });
    });

    it('should display same savings number in winner banner and confirmed screen', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      // Jump to confirmed
      const devConfirmedBtn = screen.getByTestId('dev-state-confirmed');
      fireEvent.click(devConfirmedBtn);
      
      await waitFor(() => {
        const confirmedSavings = container.querySelector('[data-testid="confirmed-savings"]');
        expect(confirmedSavings).toHaveTextContent('2,073 OP');
      });
    });

    it('should recompute savings when opCost values change', async () => {
      const mockCardsWithDifferentCosts = [
        { ...mockCards[0], opCost: 3000 }, // best
        { ...mockCards[1], opCost: 5000 },
        { ...mockCards[2], opCost: 5500 },
        { ...mockCards[3], opCost: 8000 }, // worst
      ];
      
      const { container } = render(
        <OneCreditTxPortal initialCards={mockCardsWithDifferentCosts} />
      );
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        // Expected: 8000 - 3000 = 5000
        const savingsBanner = container.querySelector('[data-testid="savings-display"]');
        expect(savingsBanner).toHaveTextContent('5,000 OP');
      });
    });
  });

  describe('Test 5: Loading Steps Sequence', () => {
    it('should show step 1 spinner at 0s and resolve at 0.8s', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devCalcBtn = screen.getByTestId('dev-state-calculating');
      fireEvent.click(devCalcBtn);
      
      await waitFor(() => {
        const step1 = container.querySelector('[data-testid="step-1"]');
        expect(step1).toHaveClass('animate-spin');
      });
      
      await waitFor(
        () => {
          const step1 = container.querySelector('[data-testid="step-1"]');
          expect(step1).toHaveClass('animate-checkmark');
        },
        { timeout: 1000 }
      );
    });

    it('should show all 3 steps in correct stagger order', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devCalcBtn = screen.getByTestId('dev-state-calculating');
      fireEvent.click(devCalcBtn);
      
      // Step 1 should be spinning first
      await waitFor(() => {
        const step1 = container.querySelector('[data-testid="step-1"]');
        expect(step1).toHaveClass('animate-spin');
      }, { timeout: 200 });
      
      // Step 2 should appear ~0.8s later
      await waitFor(
        () => {
          const step2 = container.querySelector('[data-testid="step-2"]');
          expect(step2).toHaveClass('animate-spin');
        },
        { timeout: 1200 }
      );
      
      // Step 3 should appear ~1.6s later
      await waitFor(
        () => {
          const step3 = container.querySelector('[data-testid="step-3"]');
          expect(step3).toHaveClass('animate-spin');
        },
        { timeout: 2200 }
      );
    });

    it('should auto-transition to results after all steps complete (~2.8s)', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devCalcBtn = screen.getByTestId('dev-state-calculating');
      fireEvent.click(devCalcBtn);
      
      await waitFor(
        () => {
          const results = container.querySelector('[data-testid="results-state"]');
          expect(results).toBeInTheDocument();
        },
        { timeout: 3500 }
      );
    });
  });

  describe('Test 6: Responsive Sidebar Width', () => {
    it('should not overflow at preview width (1280px)', () => {
      window.innerWidth = 1280;
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      const sidebar = container.querySelector('[data-testid="results-sidebar"]');
      expect(sidebar).toHaveStyle('width: 384px'); // 96 * 4
      
      // Sidebar should not cover the dev switcher (fixed bottom-left)
      expect(sidebar).toHaveClass('fixed', 'right-0', 'top-0');
    });

    it('product chip text should not overflow container', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const chip = container.querySelector('[data-testid="product-chip"]');
        expect(chip).toHaveClass('truncate');
      });
    });

    it('card names should not wrap awkwardly', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const cardName = container.querySelector('[data-testid="card-name-1"]');
        expect(cardName).toHaveClass('truncate');
      });
    });
  });

  describe('Test 7: Card Color Strip Rendering', () => {
    it('should render distinct gradient colors for each card', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const card1 = container.querySelector('[data-testid="card-row-1"]');
        expect(card1).toHaveClass('from-slate-700', 'to-slate-900');
        
        const card2 = container.querySelector('[data-testid="card-row-2"]');
        expect(card2).toHaveClass('from-yellow-500', 'to-yellow-600');
        
        const card3 = container.querySelector('[data-testid="card-row-3"]');
        expect(card3).toHaveClass('from-slate-600', 'to-slate-700');
        
        const card4 = container.querySelector('[data-testid="card-row-4"]');
        expect(card4).toHaveClass('from-slate-500', 'to-slate-600');
      });
    });

    it('should read gradient from card data, not hardcode', async () => {
      const customCards = [
        { ...mockCards[0], color: 'from-red-600 to-red-800' },
        { ...mockCards[1], color: 'from-blue-600 to-blue-800' },
        { ...mockCards[2], color: 'from-green-600 to-green-800' },
        { ...mockCards[3], color: 'from-purple-600 to-purple-800' },
      ];
      
      const { container } = render(
        <OneCreditTxPortal initialCards={customCards} />
      );
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const card1 = container.querySelector('[data-testid="card-row-1"]');
        expect(card1).toHaveClass('from-red-600', 'to-red-800');
      });
    });
  });

  describe('Test 8: Rank Badge Display', () => {
    it('should show correct emoji badges for ranks 1-3', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        expect(container.querySelector('[data-testid="rank-badge-1"]')).toHaveTextContent('🥇');
        expect(container.querySelector('[data-testid="rank-badge-2"]')).toHaveTextContent('🥈');
        expect(container.querySelector('[data-testid="rank-badge-3"]')).toHaveTextContent('🥉');
      });
    });

    it('should show gray circle with number for rank 4', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const badge4 = container.querySelector('[data-testid="rank-badge-4"]');
        expect(badge4).toHaveTextContent('4');
        expect(badge4).toHaveClass('bg-slate-700');
      });
    });

    it('should recompute badges when ranking changes', async () => {
      const mockCardsWithSwappedCosts = [
        { ...mockCards[0], opCost: 6230 },
        { ...mockCards[1], opCost: 5494 },
        { ...mockCards[2], opCost: 5897 },
        { ...mockCards[3], opCost: 4157 }, // now rank 1
      ];
      
      const { container } = render(
        <OneCreditTxPortal initialCards={mockCardsWithSwappedCosts} />
      );
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        // Card 4 should now have 🥇
        expect(container.querySelector('[data-testid="rank-badge-4"]')).toHaveTextContent('🥇');
      });
    });
  });

  describe('Test 9: Opportunity Multiplier Display', () => {
    it('should display all 5 detail fields in expanded row', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      // Expand card 1
      await waitFor(() => {
        const expandedDetails = container.querySelector('[data-testid="card-details-1"]');
        expect(expandedDetails).toHaveTextContent('Rewards earned: 1,999 UR Points');
        expect(expandedDetails).toHaveTextContent('Net dollar cost: $1,979.01');
        expect(expandedDetails).toHaveTextContent('Token value here: 1.0¢/point');
        expect(expandedDetails).toHaveTextContent('Transfer to Hyatt · 2.1¢/pt');
        expect(expandedDetails).toHaveTextContent('Opportunity multiplier: 2.1×');
      });
    });

    it('should format all currency and multiplier values correctly', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        // Check formatting
        expect(container.querySelector('[data-testid="rewards-earned-1"]')).toHaveTextContent(
          /^\d{1,3}(?:,\d{3})*\s+\w+\s+\w+$/ // e.g., "1,999 UR Points"
        );
        expect(container.querySelector('[data-testid="net-dollar-cost-1"]')).toHaveTextContent(
          /^\$\d+\.\d{2}$/ // e.g., "$1,979.01"
        );
        expect(container.querySelector('[data-testid="opp-multiplier-1"]')).toHaveTextContent(
          /^\d+\.?\d*×$/ // e.g., "2.1×"
        );
      });
    });
  });

  describe('Test 10: Animation Smoke Test', () => {
    it('should not cause layout shift when expanding pill to detected', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const initialLayout = container.getBoundingClientRect();
      
      const pill = container.querySelector('[data-testid="idle-pill"]');
      fireEvent.click(pill!);
      
      const afterLayout = container.getBoundingClientRect();
      
      // Body layout should not shift
      expect(initialLayout.height).toBe(afterLayout.height);
    });

    it('should not show sidebar at full opacity before animating', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devResultsBtn = screen.getByTestId('dev-state-results');
      fireEvent.click(devResultsBtn);
      
      await waitFor(() => {
        const sidebar = container.querySelector('[data-testid="results-sidebar"]');
        // Should have fade-in animation, not instant full opacity
        expect(sidebar).toHaveStyle('opacity: 0'); // or fade-in class
      });
    });

    it('should complete confirmed checkmark animation fully', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devConfirmedBtn = screen.getByTestId('dev-state-confirmed');
      fireEvent.click(devConfirmedBtn);
      
      await waitFor(() => {
        const checkmark = container.querySelector('[data-testid="success-checkmark"]');
        expect(checkmark).toBeInTheDocument();
        // Animation should complete, not freeze
        expect(checkmark).not.toHaveStyle('animation: none');
      });
    });

    it('should not leave ghost elements when collapsing back to idle', async () => {
      const { container } = render(<OneCreditTxPortal />);
      
      const devConfirmedBtn = screen.getByTestId('dev-state-confirmed');
      fireEvent.click(devConfirmedBtn);
      
      await waitFor(() => {
        const doneBtn = screen.getByRole('button', { name: /Done/i });
        fireEvent.click(doneBtn);
      });
      
      await waitFor(() => {
        // After transition, no hidden sidebar should exist
        const hiddenSidebar = container.querySelector('[data-testid="results-sidebar"]');
        expect(hiddenSidebar).not.toBeInTheDocument();
      });
    });
  });
});
