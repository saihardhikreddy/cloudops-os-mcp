# CloudOps OS Multi-Agent Terraform Pipeline — Testing Guide

## Overview

This guide explains how to run the comprehensive test suite for CloudOps OS, a 4-stage autonomous governance pipeline that ingests Terraform HCL and governance policies, then executes:

1. **Resource & Route Optimization Agent (FinOps)** — Detects NAT Gateway inefficiency, recommends VPC Endpoints
2. **Cost Optimization Agent** — Right-sizes compute, upgrades storage tiers, identifies waste
3. **Policy & Governance Compliance Agent** — Enforces SCP/SLA compliance, validates tags, detects security violations
4. **Platform Release Agent** — Validates HCL syntax, simulates terraform plan
5. **LLM Reasoning Agent (optional)** — Supplementary review for structural smells and naming issues

---

## Test Fixtures

### 1. Verified Baseline (`verified-baseline.tf`)
**Status:** ✅ COMPLIANT  
**Description:** Production-ready 3-tier infrastructure (VPC, ALB, ASG, RDS)  
**Expected Findings:** 0 CRITICAL, 0 WARNING, 0 INFO (or only informational optimizations)  
**Cost:** ~$150/month (optimized)  
**Key Features:**
- Authorized region: `us-east-1`
- Proper security groups (no 0.0.0.0/0 on SSH)
- Multi-AZ RDS with encryption
- gp3 storage (modern, cost-effective)
- Right-sized compute (t3.medium)
- Mandatory compliance tags
- Valid HCL syntax

### 2. Flawed Cost (`flawed-cost.tf`)
**Status:** ⚠️ COST OPTIMIZATION NEEDED  
**Description:** Over-provisioned infrastructure with legacy storage and NAT inefficiency  
**Expected Findings:** 0 CRITICAL, 0 WARNING, 3 INFO  
**Cost Impact:** ~$250/month → ~$80/month (68% savings)  
**Flagged Issues:**
- **RTE-001 (FinOps):** NAT Gateway tax ($77.40/month) → Replace with VPC Endpoints
- **CST-001 (Cost):** Over-provisioned compute (m5.2xlarge → t3.medium, saves $250/month)
- **CST-002 (Cost):** Legacy gp2 storage (→ gp3, saves $2/month per 100GB)

### 3. Flawed Policy & Syntax (`flawed-policy-syntax.tf`)
**Status:** ❌ POLICY VIOLATIONS + SYNTAX ERRORS  
**Description:** Unauthorized region, exposed SSH, missing tags, malformed HCL  
**Expected Findings:** 3 CRITICAL, 1 WARNING, 0 INFO  
**Flagged Issues:**
- **GOV-001 (Policy):** Unauthorized region (eu-west-2 → eu-central-1, SCP violation)
- **GOV-002 (Policy):** Exposed SSH port (0.0.0.0/0 → 10.0.0.0/8, security violation)
- **GOV-003 (Policy):** Missing compliance tags (Environment, Owner, CostCenter)
- **SYNTAX (Release):** Bracket mismatch (missing closing brace in S3 bucket resource)

---

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Jest and ts-jest
npm install --save-dev jest ts-jest @types/jest

# Ensure Node.js >= 18
node --version
```

### Unit Tests (Agent Isolation)

Test individual agents in isolation:

```bash
# Run all unit tests
npm test -- tests/terraform-pipeline.test.ts

# Run specific test suite
npm test -- tests/terraform-pipeline.test.ts -t "Resource & Route Optimization Agent"
npm test -- tests/terraform-pipeline.test.ts -t "Cost Optimization Agent"
npm test -- tests/terraform-pipeline.test.ts -t "Policy & Governance Compliance Agent"
npm test -- tests/terraform-pipeline.test.ts -t "Platform Release Agent"

# Run with coverage
npm test -- tests/terraform-pipeline.test.ts --coverage
```

### Integration Tests (Full Pipeline)

Run the complete 4-agent pipeline on all fixtures:

```bash
# Run integration test runner
npx ts-node tests/integration-runner.ts

# Output: test-report.txt and test-report.json
```

### Real-Time LLM Orchestration Test

Test with real LLM providers (OpenRouter or Groq):

```bash
# Set up environment variables
export OPENROUTER_API_KEY="your-key-here"
# OR
export GROQ_API_KEY="your-key-here"

# Run pipeline with LLM enabled
npm test -- tests/terraform-pipeline.test.ts -t "LLM Reasoning Agent"
```

### Rego Policy Evaluation Test

Test custom governance policies:

```bash
# Test with enterprise-policy.rego
npm test -- tests/terraform-pipeline.test.ts -t "Rego Policy Evaluation"

# Test with simple-policy.rego (rego-lite compatible)
npm test -- tests/terraform-pipeline.test.ts -t "rego-lite fallback"
```

---

## Test Execution Flow

### 1. Fixture Loading Phase
```
✓ Load verified-baseline.tf
✓ Load flawed-cost.tf
✓ Load flawed-policy-syntax.tf
✓ Load enterprise-policy.rego
✓ Load simple-policy.rego
```

### 2. Agent Isolation Phase
```
ResourceRoute Agent:
  ✓ Detect NAT Gateway inefficiency
  ✓ Flag for VPC Endpoint replacement
  ✓ Calculate $77.40/month savings

CostOptimization Agent:
  ✓ Detect over-provisioned compute (m5.2xlarge)
  ✓ Detect legacy gp2 storage
  ✓ Calculate $250/month + $2/month savings

PolicyGovernance Agent:
  ✓ Detect unauthorized region (eu-west-2)
  ✓ Detect exposed SSH (0.0.0.0/0)
  ✓ Detect missing compliance tags
  ✓ Evaluate .rego policies

Release Agent:
  ✓ Validate HCL syntax (bracket balance)
  ✓ Simulate terraform plan
  ✓ Detect malformed HCL
```

### 3. Rego Policy Evaluation Phase
```
Real OPA (if installed):
  ✓ Execute `opa eval` against resources
  ✓ Return genuine Rego violations

Rego-Lite Fallback (if OPA not available):
  ✓ Parse deny[msg] { ... } rules
  ✓ Evaluate ==, !=, contains() conditions
  ✓ Return violations with confidence score
```

### 4. LLM Reasoning Phase (Optional)
```
Provider Chain:
  1. Try OPENROUTER_API_KEY → meta-llama/llama-3.3-70b-instruct
  2. Try GROQ_API_KEY → llama-3.3-70b-versatile
  3. Skip if neither available (graceful degradation)

LLM Review:
  ✓ Re-read optimized HCL
  ✓ Look for structural smells
  ✓ Identify naming issues
  ✓ Return additional findings with confidence
```

### 5. Integration Phase
```
Full Pipeline Execution:
  ✓ Run all 4 agents sequentially
  ✓ Collect diagnostics from each agent
  ✓ Merge findings with XAI provenance
  ✓ Calculate total cost savings
  ✓ Generate terraform plan summary
  ✓ Output HITL console data
```

### 6. Reporting Phase
```
Generate Test Report:
  ✓ Pass/fail matrix per fixture
  ✓ Agent coverage statistics
  ✓ Cost analysis summary
  ✓ Finding breakdown by severity
  ✓ XAI provenance tracking
  ✓ Execution time metrics
```

---

## Expected Test Results

### Verified Baseline
```
Status: PASS ✓
Diagnostics: 0 CRITICAL, 0 WARNING, 0 INFO
Cost Savings: $0/month (already optimized)
Agents Triggered: None (or informational only)
HCL Syntax: Valid ✓
```

### Flawed Cost
```
Status: PASS ✓
Diagnostics: 0 CRITICAL, 0 WARNING, 3 INFO
Cost Savings: $329.40/month ($3,952.80/year)
Agents Triggered:
  - ResourceRoute: NAT Gateway → VPC Endpoints ($77.40/month)
  - CostOptimization: m5.2xlarge → t3.medium ($250/month)
  - CostOptimization: gp2 → gp3 ($2/month)
HCL Syntax: Valid ✓
```

### Flawed Policy & Syntax
```
Status: FAIL ✗
Diagnostics: 3 CRITICAL, 1 WARNING, 0 INFO
Cost Savings: $0/month (blocked by policy violations)
Agents Triggered:
  - PolicyGovernance: Unauthorized region (eu-west-2 → eu-central-1)
  - PolicyGovernance: Exposed SSH (0.0.0.0/0 → 10.0.0.0/8)
  - PolicyGovernance: Missing tags (inject Environment, Owner, CostCenter)
  - Release: Syntax error (bracket mismatch)
HCL Syntax: Invalid ✗
```

---

## Test Report Output

### Text Report (`test-report.txt`)
```
════════════════════════════════════════════════════════════════════════════════
CloudOps OS Multi-Agent Terraform Pipeline — Integration Test Report
════════════════════════════════════════════════════════════════════════════════

Timestamp: 2026-07-26T12:34:56.789Z
Total Tests: 3
Passed: 2 ✓
Failed: 1 ✗
Partial: 0 ⚠

────────────────────────────────────────────────────────────────────────────────
SUMMARY
────────────────────────────────────────────────────────────────────────────────
Total Monthly Savings: $329.40
Total Annual Savings: $3,952.80
Critical Findings: 3
Warning Findings: 1
Info Findings: 3

Agent Coverage:
  ResourceRoute: 1 finding(s)
  CostOptimization: 2 finding(s)
  PolicyGovernance: 3 finding(s)
  Release: 1 finding(s)

────────────────────────────────────────────────────────────────────────────────
DETAILED RESULTS
────────────────────────────────────────────────────────────────────────────────

Test 1: Verified Baseline
Status: PASS
Description: Production-ready, fully compliant 3-tier infrastructure
Execution Time: 245ms

Diagnostics:
  Critical: 0 (expected: 0)
  Warning: 0 (expected: 0)
  Info: 0 (expected: 0)

Agent Findings:
  (none)

Cost Analysis:
  Original Cost: $150.00/month
  Optimized Cost: $150.00/month
  Monthly Savings: $0.00
  Annual Savings: $0.00

────────────────────────────────────────────────────────────────────────────────

Test 2: Flawed Cost
Status: PASS
Description: Over-provisioned compute, legacy storage, NAT Gateway tax
Execution Time: 312ms

Diagnostics:
  Critical: 0 (expected: 0)
  Warning: 0 (expected: 0)
  Info: 3 (expected: 3)

Agent Findings:
  ResourceRoute: 1
  CostOptimization: 2

Finding Sources:
  deterministic: 3

Findings:
  [INFO] RTE-001 (ResourceRoute)
    Explanation: NAT Gateways carry a flat hourly baseline fee of $0.045/hour...
    Source: deterministic (confidence: 0.95)
  [INFO] CST-001 (CostOptimization)
    Explanation: Compute resource m5.2xlarge features 2 vCPUs and 8 GB of RAM...
    Source: deterministic (confidence: 0.95)
  [INFO] CST-002 (CostOptimization)
    Explanation: AWS legacy gp2 volumes cost $0.10/GB-month...
    Source: deterministic (confidence: 0.95)

Cost Analysis:
  Original Cost: $409.40/month
  Optimized Cost: $80.00/month
  Monthly Savings: $329.40
  Annual Savings: $3,952.80

────────────────────────────────────────────────────────────────────────────────

Test 3: Flawed Policy & Syntax
Status: FAIL
Description: Unauthorized region, exposed SSH, missing tags, syntax errors
Execution Time: 189ms

Diagnostics:
  Critical: 3 (expected: 3)
  Warning: 1 (expected: 1)
  Info: 0 (expected: 0)

Agent Findings:
  PolicyGovernance: 3
  Release: 1

Finding Sources:
  deterministic: 4

Findings:
  [CRITICAL] GOV-001 (PolicyGovernance)
    Explanation: Enterprise Service Control Policy (SCP) section 4.2 prohibits...
    Source: deterministic (confidence: 0.95)
  [CRITICAL] GOV-002 (PolicyGovernance)
    Explanation: Exposing administrative port 22 (SSH) to the public internet...
    Source: deterministic (confidence: 0.95)
  [WARNING] GOV-003 (PolicyGovernance)
    Explanation: Contractual and regulatory compliance mandates tagging...
    Source: deterministic (confidence: 0.95)
  [CRITICAL] SYNTAX (Release)
    Explanation: HCL bracket validation failed...
    Source: deterministic (confidence: 0.95)

Cost Analysis:
  Original Cost: $0.00/month
  Optimized Cost: $0.00/month
  Monthly Savings: $0.00
  Annual Savings: $0.00

Errors:
  ✗ HCL Schema Validation FAILED: Bracket mismatch detected

════════════════════════════════════════════════════════════════════════════════
End of Report
════════════════════════════════════════════════════════════════════════════════
```

### JSON Report (`test-report.json`)
```json
{
  "timestamp": "2026-07-26T12:34:56.789Z",
  "totalTests": 3,
  "passed": 2,
  "failed": 1,
  "partial": 0,
  "results": [
    {
      "fixture": {
        "name": "Verified Baseline",
        "filename": "verified-baseline.tf",
        "description": "Production-ready, fully compliant 3-tier infrastructure",
        "expectedCriticalCount": 0,
        "expectedWarningCount": 0,
        "expectedInfoCount": 0,
        "expectedSavings": 0
      },
      "status": "PASS",
      "diagnostics": [],
      "costSummary": {
        "originalCost": 150.00,
        "optimizedCost": 150.00,
        "monthlySavings": 0.00,
        "annualSavings": 0.00,
        "items": [],
        "strategicSavings": {
          "spotPrice": 0,
          "spotSavings": 0,
          "schedulePrice": 0,
          "scheduleSavings": 0
        }
      },
      "logs": [],
      "executionTime": 245,
      "errors": []
    }
  ],
  "summary": {
    "totalSavings": 329.40,
    "totalCriticalFindings": 3,
    "totalWarningFindings": 1,
    "totalInfoFindings": 3,
    "agentCoverage": {
      "ResourceRoute": 1,
      "CostOptimization": 2,
      "PolicyGovernance": 3,
      "Release": 1
    }
  }
}
```

---

## XAI Provenance Tracking

Every diagnostic includes provenance information so reviewers know the source:

```typescript
interface Diagnostic {
  id: string;
  agent: AgentName;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  source?: 'deterministic' | 'opa' | 'rego-lite-fallback' | 'llm';
  confidence?: number;  // 0.0-1.0
}
```

### Source Meanings
- **deterministic** — Built-in rule compiler (always available, high confidence)
- **opa** — Real Open Policy Agent (if `opa` CLI installed, highest confidence)
- **rego-lite-fallback** — Simplified Rego interpreter (fallback, medium confidence)
- **llm** — LLM reasoning agent (optional, confidence varies by model)

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: CloudOps OS Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- tests/terraform-pipeline.test.ts
      - run: npx ts-node tests/integration-runner.ts
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-report.*
```

---

## Troubleshooting

### Jest Not Found
```bash
npm install --save-dev jest ts-jest @types/jest
```

### TypeScript Errors
```bash
npm run typecheck
# or
npx tsc --noEmit
```

### Fixture Files Not Found
```bash
# Ensure fixtures are in tests/fixtures/
ls -la tests/fixtures/
```

### OPA Binary Not Found
```bash
# Install OPA (optional, rego-lite fallback will be used)
brew install opa  # macOS
apt-get install opa  # Ubuntu
```

### LLM Provider Errors
```bash
# Check environment variables
echo $OPENROUTER_API_KEY
echo $GROQ_API_KEY

# If not set, LLM agent will be skipped gracefully
```

---

## Next Steps

1. **Run unit tests** to verify agent isolation
2. **Run integration tests** to validate full pipeline
3. **Review test report** for findings and cost savings
4. **Test with real LLM** by setting API keys
5. **Integrate into CI/CD** for automated governance
6. **Deploy HITL console** for human review and approval

---

## Support

For issues or questions:
1. Check test output for detailed error messages
2. Review fixture files to understand expected behavior
3. Examine agent logs in test report
4. Verify environment variables for LLM providers
5. Run individual test suites to isolate problems

---

**Happy testing!** 🚀
