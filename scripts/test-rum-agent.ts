// scripts/test-rum-agent.ts
//
// Standalone test harness for the RUM persona agent + Dynatrace integration.
// Runs entirely outside Next.js — no server needed.
//
// USAGE:
//   pnpm tsx scripts/test-rum-agent.ts
//   pnpm tsx scripts/test-rum-agent.ts --dt-ping       # only test DT connectivity
//   pnpm tsx scripts/test-rum-agent.ts --mock          # force mock signals (skip live DT)
//   pnpm tsx scripts/test-rum-agent.ts --userId=usr_88374

import 'dotenv/config'

const args = process.argv.slice(2)
const ONLY_DT_PING = args.includes('--dt-ping')
const FORCE_MOCK   = args.includes('--mock')
const USER_ID      = args.find(a => a.startsWith('--userId='))?.split('=')[1] ?? 'usr_88374'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ''
const DT_ENV_URL     = process.env.DT_ENV_URL     ?? ''
const DT_API_TOKEN   = process.env.DT_API_TOKEN   ?? ''

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m` 
const red    = (s: string) => `\x1b[31m${s}\x1b[0m` 
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m` 
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m` 
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m` 
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m` 

function pass(label: string, detail = '') {
  console.log(`  ${green('✓')} ${label}${detail ? dim('  ' + detail) : ''}`)
}
function fail(label: string, detail = '') {
  console.log(`  ${red('✗')} ${label}${detail ? dim('  ' + detail) : ''}`)
}
function warn(label: string, detail = '') {
  console.log(`  ${yellow('⚠')} ${label}${detail ? dim('  ' + detail) : ''}`)
}
function section(title: string) {
  console.log(`\n${bold(cyan('━━ ' + title + ' ' + '━'.repeat(Math.max(0, 50 - title.length))))}`)
}

// ─── 1. Environment validation ─────────────────────────────────────────────────

function checkEnv() {
  section('1. Environment Variables')

  let allGood = true

  if (GOOGLE_API_KEY) {
    pass('GOOGLE_API_KEY', `set (${GOOGLE_API_KEY.slice(0, 6)}...)`)
  } else {
    fail('GOOGLE_API_KEY', 'not set — agent will fail')
    allGood = false
  }

  if (DT_ENV_URL) {
    pass('DT_ENV_URL', DT_ENV_URL)
  } else {
    warn('DT_ENV_URL', 'not set — will use mock RUM signals (OK for local dev)')
  }

  if (DT_API_TOKEN) {
    pass('DT_API_TOKEN', `set (${DT_API_TOKEN.slice(0, 12)}...)`)
  } else {
    warn('DT_API_TOKEN', 'not set — DT log ingest will be skipped')
  }

  return allGood
}

// ─── 2. Dynatrace connectivity ping ───────────────────────────────────────────

async function pingDynatrace() {
  section('2. Dynatrace Connectivity')

  if (!DT_ENV_URL || !DT_API_TOKEN) {
    warn('Skipping — DT_ENV_URL or DT_API_TOKEN not set')
    return
  }

  // 2a. API token info — cheapest authenticated call
  console.log(`  Pinging ${DT_ENV_URL} ...`)
  try {
    const res = await fetch(`${DT_ENV_URL}/api/v2/apiTokens/lookup`, {
      method: 'POST',
      headers: {
        Authorization: `Api-Token ${DT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: DT_API_TOKEN }),
    })

    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      pass('API token valid', `name: ${data.name ?? '(unnamed)'}`)

      // Check required scopes
      const scopes = (data.scopes as string[]) ?? []
      const required = ['DTAQLAccess', 'logs.ingest', 'logs.read', 'apiTokens.read']
      for (const scope of required) {
        if (scopes.includes(scope)) {
          pass(`Scope: ${scope}`)
        } else {
          fail(`Scope: ${scope}`, 'missing — add this scope in DT > Access Tokens')
        }
      }
      // Note: USQL (RUM sessions) is covered by DTAQLAccess — there is no separate sessions.read scope
    } else {
      fail(`HTTP ${res.status}`, await res.text())
    }
  } catch (err) {
    fail('Network error', String(err))
  }

  // 2b. USQL smoke query — verifies RUM data access
  try {
    const url = new URL(`${DT_ENV_URL}/api/v1/userSessionQueryLanguage/table`)
    url.searchParams.set('query', 'SELECT count(*) FROM usersession')
    url.searchParams.set('startTimestamp', String(Date.now() - 3_600_000))
    url.searchParams.set('endTimestamp',   String(Date.now()))

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Api-Token ${DT_API_TOKEN}` },
    })

    if (res.ok) {
      const data = await res.json() as { totalResults?: number }
      pass('USQL sessions query', `${data.totalResults ?? 0} sessions in last hour`)
    } else {
      fail(`USQL query HTTP ${res.status}`, await res.text())
    }
  } catch (err) {
    fail('USQL query error', String(err))
  }

  // 2c. Logs ingest smoke test — sends a test log
  try {
    const testLog = [{
      timestamp: new Date().toISOString(),
      content: JSON.stringify({
        event: 'rum.agent.connectivity_test',
        message: 'one-credit RUM agent setup test',
      }),
      'log.source':   'one-credit',
      'service.name': 'rum-agent',
      severity:       'INFO',
    }]

    const res = await fetch(`${DT_ENV_URL}/api/v2/logs/ingest`, {
      method: 'POST',
      headers: {
        Authorization:  `Api-Token ${DT_API_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(testLog),
    })

    if (res.ok || res.status === 204) {
      pass('Logs ingest (test event sent)', 'find it in DT > Logs with service.name="rum-agent"')
    } else {
      fail(`Logs ingest HTTP ${res.status}`, await res.text())
    }
  } catch (err) {
    fail('Logs ingest error', String(err))
  }
}

// ─── 3. Mock RUM signal matrix ─────────────────────────────────────────────────
// Each fixture forces a different persona so you can verify all branches.

const PERSONA_FIXTURES: Record<string, object> = {
  Simplifier: {
    rageClicksOnRotatingCategory: 4,
    cashbackTabClicks: 8,
    transferPartnerTabClicks: 0,
    dwellOnCashbackCards: 60,
    dwellOnTransferGuides: 2,
    abandonedRotatingActivation: true,
    extensionFireCount: 0,
    transferPartnersClicked: [],
    redemptionTypesViewed: ['cashback'],
  },
  Maximizer: {
    rageClicksOnRotatingCategory: 0,
    transferPartnerTabClicks: 7,
    dwellOnTransferGuides: 65,
    transferPartnersClicked: ['SkyMiles', 'Aeroplan'],
    redemptionTypesViewed: ['travel_portal'],
    scrolledPastAnnualFee: true,
  },
  CarryProne: {
    dwellOnAprSection: 45,
    cashbackTabClicks: 2,
    rageClicksOnRotatingCategory: 0,
  },
  AmazonAnchored: {
    extensionFireCount: 7,
    extensionAnalyzeApiCallCount: 8,
    dwellOnTravelCards: 5,
    dwellOnCashbackCards: 10,
  },
  FeeAverse: {
    dwellOnAnnualFeeField: 18,
    abandonedCardComparison: true,
    scrolledPastAnnualFee: false,
    cashbackTabClicks: 3,
  },
}

// ─── 4. Agent smoke test against Gemini ───────────────────────────────────────

async function testAgent() {
  section('3. Gemini Agent — Mock Signal Run')

  if (!GOOGLE_API_KEY) {
    warn('Skipping — GOOGLE_API_KEY not set')
    return
  }

  // We don't import the actual rum-agent here (it pulls Next.js internals).
  // Instead we fire the /api/ai/analyze endpoint if the server is running,
  // OR we call Gemini directly with a mock-signals prompt.

  console.log(`  Target userId: ${bold(USER_ID)}`)
  console.log(`  Mode: ${FORCE_MOCK ? yellow('forced mock') : dim('auto (DT if configured, mock otherwise)')}`)

  // Check if local Next.js dev server is up
  const serverUp = await fetch('http://localhost:3000/api/ai/analyze', {
    method: 'HEAD',
  }).then(r => r.status !== 404 && r.status !== 502).catch(() => false)

  if (serverUp) {
    console.log(`  ${green('→')} Dev server is running — calling live endpoint`)
    await testViaServer()
  } else {
    console.log(`  ${yellow('→')} Dev server not running — calling Gemini directly with mock signals`)
    await testViaDirectGemini()
  }
}

async function testViaServer() {
  try {
    const res = await fetch('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID }),
    })
    const data = await res.json() as Record<string, unknown>

    if (res.ok) {
      const persona = data.persona as Record<string, unknown>
      pass(`Persona inferred: ${bold(String(persona?.label))}`, `confidence: ${persona?.confidence}`)
      pass('Recommendation', String((persona?.cardStackRecommendation as Record<string, unknown>)?.primary ?? ''))
      if (data.dynatraceLogId) {
        pass('DT log ingested', String(data.dynatraceLogId))
      } else {
        warn('DT log not ingested', 'DT creds may not be configured')
      }
      console.log(`\n  ${dim('Agent reasoning:')}`)
      console.log(`  ${dim(String(data.agentReasoning ?? '').slice(0, 300))}...`)
    } else {
      fail(`HTTP ${res.status}`, JSON.stringify(data).slice(0, 200))
    }
  } catch (err) {
    fail('Request failed', String(err))
  }
}

async function testViaDirectGemini() {
  // Minimal direct Gemini call — no tool loop, just inject mock signals
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const mockSignals = {
    userId:                         USER_ID,
    rageClicksOnRotatingCategory:   3,
    transferPartnerTabClicks:        0,
    cashbackTabClicks:               6,
    dwellOnCashbackCards:            55,
    dwellOnTransferGuides:           4,
    extensionFireCount:              1,
    abandonedRotatingActivation:     true,
    scrolledPastAnnualFee:           false,
    dwellOnAnnualFeeField:           14,
    transferPartnersClicked:         [],
    redemptionTypesViewed:           ['cashback'],
    cardAddedToWallet:               null,
  }

  const prompt = `
You are the RUMPersonaAgent. Given these Dynatrace RUM signals, infer the user persona and recommend a card stack.

Signals:
${JSON.stringify(mockSignals, null, 2)}

Decision table:
- Maximizer: dwellOnTransferGuides > 30 + transferPartnersClicked not empty
- Simplifier: rageClicksOnRotatingCategory >= 2 + cashbackTabClicks dominant
- CarryProne: dwellOnAprSection > 20
- AmazonAnchored: extensionFireCount >= 3
- FeeAverse: dwellOnAnnualFeeField > 10 + abandonedCardComparison true

Respond ONLY with JSON (no markdown):
{
  "persona": {
    "label": string,
    "confidence": number,
    "signals": [string],
    "cardStackRecommendation": { "primary": string, "rationale": string, "avoid": [string] },
    "filterPremiumCards": boolean,
    "focusOnTransferPartners": boolean,
    "focusOnCashback": boolean,
    "focusOnFinancing": boolean
  },
  "agentReasoning": string
}
`.trim()

  const startMs = Date.now()
  const result = await model.generateContent(prompt)
  const elapsed = Date.now() - startMs
  const text = result.response.text()

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as Record<string, unknown>
    const persona = parsed.persona as Record<string, unknown>
    pass(`Persona: ${bold(String(persona?.label))}`, `confidence: ${persona?.confidence}  ${elapsed}ms`)
    pass('Card recommendation', String((persona?.cardStackRecommendation as Record<string, unknown>)?.primary ?? ''))
    console.log(`\n  ${dim('Agent reasoning:')}`)
    console.log(`  ${dim(String(parsed.agentReasoning ?? '').slice(0, 300))}`)
  } catch {
    fail('Gemini returned invalid JSON', text.slice(0, 200))
  }
}

// ─── 5. Persona fixture matrix ─────────────────────────────────────────────────

async function testPersonaMatrix() {
  section('4. Persona Matrix — All Branches')

  if (!GOOGLE_API_KEY) {
    warn('Skipping — GOOGLE_API_KEY not set')
    return
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  for (const [expectedPersona, signals] of Object.entries(PERSONA_FIXTURES)) {
    const prompt = `
You are the RUMPersonaAgent. Signals: ${JSON.stringify(signals)}
Decision table:
- Maximizer: dwellOnTransferGuides > 30 + transferPartnersClicked not empty
- Simplifier: rageClicksOnRotatingCategory >= 2 + cashbackTabClicks dominant
- CarryProne: dwellOnAprSection > 20
- AmazonAnchored: extensionFireCount >= 3
- FeeAverse: dwellOnAnnualFeeField > 10 + abandonedCardComparison true
Respond ONLY with JSON: {"persona":{"label":string,"confidence":number}}`

    try {
      const result = await model.generateContent(prompt)
      const text   = result.response.text().replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text) as { persona: { label: string; confidence: number } }
      const got    = parsed.persona.label
      const conf   = parsed.persona.confidence

      if (got === expectedPersona) {
        pass(`${expectedPersona} → ${got}`, `confidence: ${conf}`)
      } else {
        warn(`${expectedPersona} → got ${got}`, `expected ${expectedPersona}, confidence: ${conf}`)
      }
    } catch (err) {
      fail(`${expectedPersona}`, String(err))
    }

    // Small delay to avoid hitting Gemini rate limits
    await new Promise(r => setTimeout(r, 500))
  }
}

// ─── 6. DT log query — verify logs are visible in DT ──────────────────────────

async function verifyDTLogs() {
  section('5. Dynatrace Log Visibility Check')

  if (!DT_ENV_URL || !DT_API_TOKEN) {
    warn('Skipping — DT not configured')
    return
  }

  try {
    // Requires logs.read scope. If Grail is enabled on your tenant, use the Grail API instead.
    const res = await fetch(
      `${DT_ENV_URL}/api/v2/logs/search?` +
      new URLSearchParams({
        query: 'service.name="rum-agent" AND event="rum.persona.inferred"',
        from:  'now-1h',
        limit: '5',
      }),
      { headers: { Authorization: `Api-Token ${DT_API_TOKEN}` } },
    )

    if (res.ok) {
      const data = await res.json() as { results?: unknown[]; totalCount?: number }
      const count = data.results?.length ?? 0
      if (count > 0) {
        pass(`Found ${count} persona log(s) in DT from the last hour`)
        console.log(`  ${dim('Query in DT: Logs > service.name="rum-agent"')}`)
      } else {
        warn('No persona logs found yet', 'run a full agent test first, then re-check')
      }
    } else {
      fail(`DT logs search HTTP ${res.status}`, await res.text())
    }
  } catch (err) {
    fail('DT logs search error', String(err))
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold('\n🧠 one-credit — RUM Agent & Dynatrace Setup Tester'))
  console.log(dim('━'.repeat(55)))

  const envOk = checkEnv()

  if (!envOk && !DT_ENV_URL) {
    console.log(`\n${red('→ Fix GOOGLE_API_KEY first, then re-run.')}`)
    process.exit(1)
  }

  await pingDynatrace()

  if (!ONLY_DT_PING) {
    await testAgent()
    await testPersonaMatrix()
    await verifyDTLogs()
  }

  section('Done')
  console.log(`  ${dim('Next steps:')}`)
  console.log(`  ${dim('1. pnpm dev  →  curl -X POST http://localhost:3000/api/ai/analyze -H "Content-Type: application/json" -d \'{"userId":"usr_88374"}\'')}`)
  console.log(`  ${dim('2. DT > Logs > filter: service.name="rum-agent"')}`)
  console.log(`  ${dim('3. DT > Dashboards > create a tile: event="rum.persona.inferred" by persona.label')}`)
  console.log()
}

main().catch(err => {
  console.error(red('\nFatal: ' + String(err)))
  process.exit(1)
})
