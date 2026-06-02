"""
Gemini Agent with Fivetran MCP Integration

This module configures a Gemini agent that can access Fivetran tools
through the MCP server to control data pipeline freshness and make
intelligent financial decisions based on fresh data.
"""

import os
import json
from typing import Any, Optional
import google.generativeai as genai


class OmniWalletGeminiAgent:
    """
    Gemini AI agent configured with Fivetran MCP tools for Omni-Wallet.
    
    Capabilities:
    - Check data freshness before making recommendations
    - Trigger on-demand syncs when data is stale
    - Analyze user portfolios (rewards + DeFi combined)
    - Generate redemption strategies
    - Optimize asset allocation
    """
    
    def __init__(self, api_key: Optional[str] = None, mcp_server_path: Optional[str] = None):
        """
        Initialize the Gemini agent.

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
        """
        api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)

        self.mcp_server_path = mcp_server_path or os.environ.get(
            "MCP_SERVER_PATH", "./lib/mcp/fivetran-server.py"
        )

        # Import ADK McpToolset for real MCP connection
        from google.adk.tools.mcp import McpToolset

        self.fivetran_tools = McpToolset(
            server_command=["python3", self.mcp_server_path]
        )

        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            tools=[self.fivetran_tools],          # ← actual tools, not empty list
            system_instruction=self._get_system_prompt()
        )
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the Gemini agent."""
        return """You are Omni-Wallet's financial advisor AI. Your role is to help users
maximize the value of their combined portfolio of rewards points, airline miles, 
cryptocurrency, and cash across multiple financial systems.

CORE FLOW: OP TOKEN INTERCHANGE
================================

When a user says "I want to spend $500 on electronics", execute this exact 6-stage process:

STAGE 1: Parse Intent
- Extract: amount ($), category (electronics/flights/dining/etc)
- Convert to OP: $500 = 50,000 OP (1 OP = $0.01)

STAGE 2: Sync Rates FIRST ⭐ CRITICAL
- Call: refresh_rates() tool
- Wait for completion
- Confirms award charts and exchange rates are fresh in MongoDB
- This MUST happen BEFORE analyzing balances

STAGE 3: Fetch Balances in OP
- Call: getUserBalances() MCP tool
- Get raw balances: Skyward miles, GoldFork points, ClearCash cash
- Convert each to OP using just-synced rates
- Total OP available: sum all cards

STAGE 4: Score Cards by OP/$
- For the user's category, rank each card:
  * Electronics: ClearCash = 3.0 OP/$, GoldFork = 2.25 OP/$, Skyward = 1.0 OP/$
  * Flights: Skyward = 1.5 OP/$, GoldFork = 1.0 OP/$, ClearCash = 2.0 OP/$
  * Hotels: Similar ranking by best redemption value
- Greedy allocation: use highest-scoring cards first

STAGE 5: Debit OP → Update Raw Balances
- Calculate exact debit per card (using its redemption rate)
- Example: ClearCash covers 15,000 OP → $150 cashback debited
- Call: updateBalances() MCP tool with per-card debits
- CRITICAL: Convert OP back to raw points/cash for each card

STAGE 6: Resync After Redemption
- Call: sync_after_redemption() for affected connectors
- Fivetran re-pulls latest balances from APIs
- Next user check shows reconciled balances automatically

USER EXPERIENCE
===============
User: "Spend $500 on electronics"
       ↓
Gemini (internal): Stage 1-6 execution (3-5 seconds)
       ↓
You: "Done! 50,000 OP spent using ClearCash + GoldFork.
      Your wallet: 100,000 OP remaining ($1,000)"

MCP TOOLS (All linked to Fivetran)
==================================
1. refresh_rates() 
   → Stage 2: Pre-scoring rate sync

2. getUserBalances()
   → Stage 3: Fetch all balances, convert to OP

3. updateBalances(card_debits)
   → Stage 5: Apply raw point/cash debits per card
   
4. sync_after_redemption(source)
   → Stage 6: Resync after update

SCORING RULES BY CATEGORY
==========================
Travel (Flights/Hotels):
  - Skyward: 1.5x (best for travel)
  - GoldFork: 1.0x
  - ClearCash: 2.0x (cash fallback)

Dining:
  - GoldFork: 1.5x (5x points = 1.5 OP/$)
  - Skyward: 1.0x
  - ClearCash: 2.0x

Cash Back (Electronics, Gas, Groceries):
  - ClearCash: 3.0x (3% = 3.0 OP/$)
  - GoldFork: 1.125x (1.125% = 1.125 OP/$)
  - Skyward: 1.0x (as fallback)

General:
  - ClearCash: 2.0x
  - GoldFork: 1.125x
  - Skyward: 1.0x

COMMUNICATION
==============
After each spend, show:
- OP spent (total)
- Cards used (breakdown)
- OP remaining (new total)
- Estimated value of raw points/cash still in wallet

Always quantify value. Example:
"Your 100,000 OP remaining represents:
 • Skyward: 60,000 pts ≈ $900 (1.5 cpp)
 • GoldFork: 30,000 pts ≈ $300 (1 cpp)
 • ClearCash: $150 cash = 15,000 OP"

EDGE CASES
==========
1. Insufficient OP? → "You have 45,000 OP but need 50,000. Short by $50."
2. Stale rates? → If get_sync_status shows >2 hrs old, call refresh_rates first
3. Rate changed mid-allocation? → Recalculate using freshest rates from refresh_rates()
4. Resync fails? → Show warning but complete debit (will reconcile next sync)

NEVER:
- Show card names to user (they see OP only)
- Calculate using stale rates (always refresh first)
- Allocate without confirming rates were just synced
- Forget sync_after_redemption at the end"""
    
    async def process_user_request(
        self,
        user_message: str,
        portfolio_context: Optional[dict] = None
    ) -> str:
        """
        Process a user request with Fivetran data context.
        
        Args:
            user_message: User's request or question
            portfolio_context: Optional pre-fetched portfolio data
        
        Returns:
            Gemini's response with recommendation
        """
        # Build context with portfolio data if provided
        context_message = ""
        if portfolio_context:
            context_message = f"""
Current Portfolio (All values already converted to OP):
{json.dumps(portfolio_context, indent=2)}

User Request: {user_message}

REMEMBER: If this is a spending request, follow the 6-stage OP interchange flow exactly.
Use the MCP tools in sequence as documented."""
        else:
            context_message = user_message
        
        # Call Gemini with MCP tool access
        response = self.model.generate_content(context_message)
        return response.text
    
    async def handle_redemption_request(
        self,
        goal: str,
        amount: float,
        portfolio_data: dict
    ) -> dict:
        """
        Handle a specific redemption request.
        
        Example: "I need $1,000 for a business class flight to London"
        
        Args:
            goal: User's redemption goal
            amount: Dollar amount or point amount
            portfolio_data: User's portfolio snapshot
        
        Returns:
            Recommendation with:
            - Card(s) to use
            - Points to redeem
            - Estimated value
            - Alternative options
        """
        request = f"""
The user wants to: {goal}

Their portfolio:
- Cards: {portfolio_data.get('cards', [])}
- Miles: {portfolio_data.get('miles', [])}
- Crypto: {portfolio_data.get('crypto', [])}
- Cash: {portfolio_data.get('cash', 0)}

Please recommend the best way to achieve this goal, considering:
1. Point valuations (from live award charts)
2. Active transfer bonuses
3. Opportunity cost of liquidating crypto
4. Tax implications

Provide:
- Recommended strategy
- Estimated total value
- Step-by-step execution plan
- Alternative options
"""
        response = await self.process_user_request(request, portfolio_data)
        
        return {
            "goal": goal,
            "recommendation": response,
            "portfolio_used": portfolio_data
        }
    
    async def execute_op_interchange(
        self,
        spend_amount_usd: float,
        spend_category: str,
        portfolio_data: dict
    ) -> dict:
        """
        Execute the 6-stage OP interchange flow.
        
        This is the core spending flow: user wants to spend USD, Gemini
        optimizes which card(s) to use, and executes the debit.
        
        Args:
            spend_amount_usd: Dollar amount to spend
            spend_category: Category (electronics, flights, dining, etc.)
            portfolio_data: Current portfolio state (in OP)
        
        Returns:
            Execution result with:
            - Stage 1-6 execution summary
            - Cards used and amounts
            - New portfolio state
            - Fivetran sync confirmation
        """
        spend_op = int(spend_amount_usd * 100)  # Convert USD to OP
        
        request = f"""
EXECUTE OP INTERCHANGE:

Stage 1: Parse Intent ✓
- Spend: ${spend_amount_usd} USD = {spend_op:,} OP
- Category: {spend_category}

Stage 2: Call refresh_rates() tool
- Sync live award charts and exchange rates
- Wait for completion confirmation

Stage 3: Call getUserBalances() tool
- Fetch all raw balances (miles, points, cash)
- Convert each to OP using synced rates
- Calculate total portfolio OP

Stage 4: Score cards for {spend_category}
- Rank by best OP/$ for category
- Show scoring breakdown

Stage 5: Execute debit via updateBalances() tool
- Calculate raw debit per card (convert OP back to points/cash)
- Apply debits in order of highest scoring first
- Confirm total {spend_op:,} OP used

Stage 6: Call sync_after_redemption() tool
- Resync affected connectors
- Background reconciliation of balances

Current Portfolio (baseline):
{json.dumps(portfolio_data, indent=2)}

Execute all 6 stages in sequence. Show your work at each stage.
Final output: "Done! {spend_op:,} OP spent on {spend_category}. Wallet: X OP remaining."
"""
        response = await self.process_user_request(request, portfolio_data)
        
        return {
            "spend_usd": spend_amount_usd,
            "spend_op": spend_op,
            "category": spend_category,
            "execution": response,
            "portfolio_baseline": portfolio_data
        }
    
    async def analyze_portfolio(self, portfolio_data: dict) -> dict:
        """
        Deep analysis of user's complete portfolio.
        
        Args:
            portfolio_data: User's portfolio across all systems
        
        Returns:
            Analysis including:
            - Current portfolio value
            - Optimization opportunities
            - Top 3 next actions
        """
        request = f"""
Analyze this user's complete portfolio for optimization opportunities:

{json.dumps(portfolio_data, indent=2)}

Provide:
1. Total portfolio value breakdown (by type and value)
2. Top 3 immediate optimization opportunities with ROI
3. Specific action steps (with point/asset amounts)
4. Risk assessment
5. 30/90-day action plan

Be specific - show exact card/protocol recommendations with point counts."""
        
        response = await self.process_user_request(request, portfolio_data)
        
        return {
            "analysis": response,
            "portfolio_snapshot": portfolio_data,
            "generated_at": str(__import__("datetime").datetime.now())
        }


# Example initialization for Gemini with MCP tools
def setup_gemini_with_fivetran_mcp():
    """
    Set up Gemini to use Fivetran MCP server.
    
    In production, this connects the Gemini agent to the running
    Fivetran MCP server (via stdio or HTTP transport).
    """
    agent = OmniWalletGeminiAgent()
    
    # In a real deployment, you would:
    # 1. Start the Fivetran MCP server (lib/mcp/fivetran-server.py)
    # 2. Configure McpToolset to connect to it
    # 3. Register those tools with the Gemini model
    
    # Example setup code (pseudocode for Google ADK):
    """
    from google.adk.tools.mcp import McpToolset
    
    fivetran_tools = McpToolset(
        server_url="stdio:///vercel/share/v0-project/lib/mcp/fivetran-server.py"
    )
    
    agent.model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        tools=[fivetran_tools],
        system_instruction=agent._get_system_prompt()
    )
    """
    
    return agent


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        agent = setup_gemini_with_fivetran_mcp()
        
        # Example portfolio
        portfolio = {
            "cards": [
                {"name": "Skyward Elite", "points": 60000, "valuePerPoint": 0.015},
                {"name": "GoldFork", "points": 30000, "valuePerPoint": 0.01}
            ],
            "crypto": [
                {"symbol": "ETH", "amount": 1.5, "price": 3500},
                {"symbol": "SOL", "amount": 5.25, "price": 400}
            ],
            "cash": 150
        }
        
        # Process a request
        result = await agent.handle_redemption_request(
            goal="Business class flight to London",
            amount=0,
            portfolio_data=portfolio
        )
        
        print("Gemini Recommendation:")
        print(result["recommendation"])
