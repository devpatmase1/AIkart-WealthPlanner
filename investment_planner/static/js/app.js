/* ==========================================================================
   WealthPlanner - Professional Financial Workspace Engine (Fully Audit-Hardened)
   ========================================================================== */

let currentSymbol = "₹";
let currentCurrency = "INR";
let lastDiagnosisData = null;

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  CAD: "$",
  AUD: "$",
  SGD: "$"
};

function onCurrencyChange() {
  const select = document.getElementById('currency-selector');
  currentCurrency = select.value;
  currentSymbol = currencySymbols[currentCurrency] || "$";
  
  document.querySelectorAll('.curr-sym').forEach(el => {
    el.innerText = currentSymbol;
  });

  agentDiagnose();
}

function formatAmt(val) {
  if (isNaN(val)) return `${currentSymbol}0`;
  if (val < 0) return `-${currentSymbol}${Math.abs(Math.round(val)).toLocaleString()}`;
  return `${currentSymbol}${Math.round(val).toLocaleString()}`;
}

function resetInputsToZero() {
  const fields = [
    'primary_income', 'secondary_income', 'fixed_expenses', 
    'discretionary_expenses', 'debt_emi', 'high_interest_debt', 
    'emergency_cash', 'existing_investments', 'provident_fund'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 0;
  });
}

function switchTab(tabId, btnEl) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  if (tabId === 'pane-matrix') renderRiskReturnChart();
  if (tabId === 'pane-simulator') updateGrowthSimulator();
}

// Clean Markdown to HTML Parser for Chatbot
function parseMarkdown(mdText) {
  if (!mdText) return '';
  let html = mdText;

  html = html.replace(/#### (.*?)(\n|$)/g, '<h5 style="margin: 0.5rem 0 0.2rem 0; font-size: 0.95rem; color: var(--color-primary);">$1</h5>');
  html = html.replace(/### (.*?)(\n|$)/g, '<h4 style="margin: 0.6rem 0 0.3rem 0; font-size: 1.05rem; color: var(--text-dark); border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2rem;">$1</h4>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^[\s]*[•\-\*]\s+(.*$)/gim, '<li style="margin-left: 1.1rem; margin-bottom: 0.25rem;">$1</li>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

// 7 Asset Comparison Data
const assetComparisons = [
  {
    name: "Low-Cost Index Funds (Nifty 50 / S&P 500)",
    icon: "📈",
    returnNum: 13.5,
    riskNum: 4.5,
    return: "12% - 15% p.a.",
    risk: "Moderate",
    riskClass: "risk-moderate",
    liquidity: "High (T+2 Days)",
    tax: "High Efficiency (LTCG Exemption)",
    minStart: "500",
    verdict: "⭐ #1 Core Wealth Creator for Middle Class",
    details: "Low expense ratio (<0.1%), zero stock-picking stress."
  },
  {
    name: "Fixed Deposits / Govt Bonds (PPF/FD)",
    icon: "🛡️",
    returnNum: 7.0,
    riskNum: 1.5,
    return: "6.5% - 7.5% p.a.",
    risk: "Low",
    riskClass: "risk-low",
    liquidity: "Moderate (Premature Fee)",
    tax: "Taxable / Exempt (PPF)",
    minStart: "500",
    verdict: "Essential for 6-Month Emergency Cushion",
    details: "Guaranteed capital protection for emergency reserves."
  },
  {
    name: "REITs (Real Estate Investment Trusts)",
    icon: "🏢",
    returnNum: 9.5,
    riskNum: 3.5,
    return: "8% - 11% p.a.",
    risk: "Moderate",
    riskClass: "risk-moderate",
    liquidity: "High (Exchange Traded)",
    tax: "Tax-Exempt Dividends / Moderate",
    minStart: "1000",
    verdict: "Fractional Passive Income",
    details: "Regular dividend payout + capital growth."
  },
  {
    name: "Sovereign Gold Bonds / Gold ETFs",
    icon: "🪙",
    returnNum: 9.0,
    riskNum: 3.0,
    return: "8% - 10% p.a.",
    risk: "Moderate",
    riskClass: "risk-moderate",
    liquidity: "High (Digital)",
    tax: "100% Tax Free at Maturity (SGB)",
    minStart: "5000",
    verdict: "Essential Crisis & Inflation Hedge",
    details: "Protects purchasing power during currency devaluation."
  },
  {
    name: "Direct Individual Stocks",
    icon: "⚡",
    returnNum: 18.0,
    riskNum: 8.5,
    return: "15% - 25%+ (Volatile)",
    risk: "High",
    riskClass: "risk-high",
    liquidity: "High (Instant)",
    tax: "STCG (20%) / LTCG (12.5%)",
    minStart: "500",
    verdict: "Satellite Only (Max 10%)",
    details: "Requires analytical research and discipline."
  },
  {
    name: "Provident Fund / Employer 401(k) Match",
    icon: "🏦",
    returnNum: 8.5,
    riskNum: 1.0,
    return: "8.15% - 9.0% Guaranteed",
    risk: "Very Low",
    riskClass: "risk-low",
    liquidity: "Low (Retirement Lock)",
    tax: "Triple Tax-Exempt (EEE)",
    minStart: "Auto Salary",
    verdict: "Must Max Out Employer Match First",
    details: "Free employer match money + tax exemptions."
  },
  {
    name: "Cryptocurrency (BTC / ETH)",
    icon: "🚀",
    returnNum: 25.0,
    riskNum: 9.5,
    return: "High / Speculative",
    risk: "High",
    riskClass: "risk-high",
    liquidity: "High (24/7)",
    tax: "Flat Tax + No Loss Setoff",
    minStart: "500",
    verdict: "Speculative Only (Max 1-2%)",
    details: "Extreme drawdown volatility."
  }
];

function renderComparisonMatrix() {
  const tbody = document.getElementById('matrix-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  assetComparisons.forEach(item => {
    const minValStr = isNaN(parseFloat(item.minStart)) ? item.minStart : `${currentSymbol}${item.minStart}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: var(--text-dark); display: flex; align-items: center; gap: 0.4rem;">
          <span>${item.icon}</span>
          <span>${item.name}</span>
        </div>
      </td>
      <td style="font-weight: 800; color: var(--color-emerald);">${item.return}</td>
      <td><span class="risk-tag ${item.riskClass}">${item.risk}</span></td>
      <td style="color: var(--text-body);">${item.liquidity}</td>
      <td style="color: var(--text-body);">${item.tax}</td>
      <td style="font-weight: 600; color: var(--color-primary);">${minValStr}</td>
      <td style="font-size: 0.85rem; color: var(--color-primary);">${item.verdict}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRiskReturnChart() {
  if (typeof ChartEngine !== 'undefined') {
    ChartEngine.drawScatter('riskReturnChart', assetComparisons);
  }
}

// 0ms Synchronous Local Diagnosis with Audit-Hardened Edge Case Handling
function calculateLocalDiagnosis() {
  const primary_income = Math.max(0, parseFloat(document.getElementById('primary_income')?.value) || 0);
  const secondary_income = Math.max(0, parseFloat(document.getElementById('secondary_income')?.value) || 0);
  const fixed_expenses = Math.max(0, parseFloat(document.getElementById('fixed_expenses')?.value) || 0);
  const discretionary_expenses = Math.max(0, parseFloat(document.getElementById('discretionary_expenses')?.value) || 0);
  const debt_emi = Math.max(0, parseFloat(document.getElementById('debt_emi')?.value) || 0);
  const high_interest_debt = Math.max(0, parseFloat(document.getElementById('high_interest_debt')?.value) || 0);
  const emergency_cash = Math.max(0, parseFloat(document.getElementById('emergency_cash')?.value) || 0);
  const existing_investments = Math.max(0, parseFloat(document.getElementById('existing_investments')?.value) || 0);
  const provident_fund = Math.max(0, parseFloat(document.getElementById('provident_fund')?.value) || 0);
  const current_age = Math.max(18, parseInt(document.getElementById('current_age')?.value) || 30);
  const retirement_age = Math.max(current_age + 1, parseInt(document.getElementById('retirement_age')?.value) || 60);
  const risk_profile = document.getElementById('risk_profile')?.value || "moderate";

  const total_income = primary_income + secondary_income;
  const total_expenses = fixed_expenses + discretionary_expenses + debt_emi;
  const surplus = Math.max(0, total_income - total_expenses);
  const savings_rate = total_income > 0 ? Math.round((surplus / total_income) * 100) : 0;
  const monthly_living = fixed_expenses + debt_emi;
  
  // Edge Case Hardened: If living costs are 0 but emergency cash exists
  const emergency_months = monthly_living > 0 
    ? Math.round((emergency_cash / monthly_living) * 10) / 10 
    : (emergency_cash > 0 ? 99 : 0);

  const emergency_target = monthly_living * 6;

  let health_score = 0;
  if (total_income > 0) {
    let score = 50;
    if (savings_rate >= 30) score += 15;
    else if (savings_rate >= 20) score += 10;
    if (emergency_months >= 6) score += 20;
    else if (emergency_months >= 3) score += 10;
    if (high_interest_debt > 0) score -= 15;
    health_score = Math.max(10, Math.min(99, score));
  }

  let equity_pct = 50, debt_pct = 25, gold_pct = 10, reits_pct = 10, liquid_pct = 5;
  let cagr = 0.10;
  if (risk_profile === "conservative") { equity_pct = 30; debt_pct = 45; gold_pct = 15; reits_pct = 5; liquid_pct = 5; cagr = 0.08; }
  else if (risk_profile === "aggressive") { equity_pct = 70; debt_pct = 15; gold_pct = 5; reits_pct = 5; liquid_pct = 5; cagr = 0.12; }

  const allocation = {
    "Broad Index Funds": equity_pct,
    "Fixed Income / Govt Bonds": debt_pct,
    "Sovereign Gold / Gold ETFs": gold_pct,
    "REITs (Real Estate)": reits_pct,
    "Liquid Cash / Emergency": liquid_pct
  };

  const years_to_retire = Math.max(1, retirement_age - current_age);
  const monthly_sip_allocation = surplus * 0.50; // 50% realistic SIP allocation
  const r = cagr / 12;
  const n = years_to_retire * 12;

  let fv_sip = 0;
  if (r > 0 && n > 0 && monthly_sip_allocation > 0) {
    fv_sip = monthly_sip_allocation * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  } else {
    fv_sip = monthly_sip_allocation * n;
  }
  const fv_existing = existing_investments * Math.pow(1 + cagr, years_to_retire);
  const future_corpus = fv_existing + fv_sip;
  const real_purchasing_power = future_corpus / Math.pow(1.055, years_to_retire);

  const roadmap = [];
  if (total_income === 0 && total_expenses === 0) {
    roadmap.push({
      phase: "STEP 1 - GET STARTED",
      title: "Fill Financial Profile Input",
      description: "Enter your primary income, monthly expenses, and current savings in the sidebar form to generate a customized strategy."
    });
  } else {
    roadmap.push({
      phase: "STEP 1 - SAFETY",
      title: "Build Emergency Cushion",
      description: `Target 6 months of living expenses (${currentSymbol}${Math.round(emergency_target).toLocaleString()}) in a liquid high-yield savings or liquid mutual fund.`
    });
    roadmap.push({
      phase: "STEP 2 - PROTECTION",
      title: "Insurance Coverage",
      description: `Secure a Pure Term Insurance policy equal to 10x-15x annual income plus family health cover.`
    });
    roadmap.push({
      phase: "STEP 3 - WEALTH ACCUMULATION",
      title: "Automated Monthly Index Fund SIPs",
      description: `Start automated monthly SIPs of ${currentSymbol}${Math.round(monthly_sip_allocation * (equity_pct/100)).toLocaleString()} into broad market index funds.`
    });
  }

  return {
    health_score,
    metrics: {
      total_income: Math.round(total_income),
      total_expenses: Math.round(total_expenses),
      surplus: Math.round(surplus),
      savings_rate,
      emergency_months,
      emergency_target: Math.round(emergency_target),
      net_worth: Math.round(emergency_cash + existing_investments + provident_fund - high_interest_debt),
      future_corpus: Math.round(future_corpus),
      real_purchasing_power: Math.round(real_purchasing_power),
      years_to_retire,
      monthly_investable: Math.round(monthly_sip_allocation)
    },
    allocation,
    roadmap
  };
}

async function agentDiagnose() {
  const localData = calculateLocalDiagnosis();
  lastDiagnosisData = localData;
  updateUIWithDiagnosis(localData);

  try {
    const primary_income = parseFloat(document.getElementById('primary_income')?.value) || 0;
    const secondary_income = parseFloat(document.getElementById('secondary_income')?.value) || 0;
    const fixed_expenses = parseFloat(document.getElementById('fixed_expenses')?.value) || 0;
    const discretionary_expenses = parseFloat(document.getElementById('discretionary_expenses')?.value) || 0;
    const debt_emi = parseFloat(document.getElementById('debt_emi')?.value) || 0;
    const high_interest_debt = parseFloat(document.getElementById('high_interest_debt')?.value) || 0;
    const emergency_cash = parseFloat(document.getElementById('emergency_cash')?.value) || 0;
    const existing_investments = parseFloat(document.getElementById('existing_investments')?.value) || 0;
    const provident_fund = parseFloat(document.getElementById('provident_fund')?.value) || 0;
    const current_age = parseInt(document.getElementById('current_age')?.value) || 30;
    const retirement_age = parseInt(document.getElementById('retirement_age')?.value) || 60;
    const risk_profile = document.getElementById('risk_profile')?.value || "moderate";

    const payload = {
      currency_symbol: currentSymbol,
      currency_code: currentCurrency,
      primary_income,
      secondary_income,
      fixed_expenses,
      discretionary_expenses,
      debt_emi,
      high_interest_debt,
      emergency_cash,
      existing_investments,
      provident_fund,
      current_age,
      retirement_age,
      risk_profile
    };

    const res = await fetch('/api/agent/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    lastDiagnosisData = data;
    updateUIWithDiagnosis(data);
  } catch (err) {
    console.warn("Backend sync notice:", err);
  }
}

function updateUIWithDiagnosis(data) {
  const m = data.metrics;

  const scoreEl = document.getElementById('widget-health-score');
  if (scoreEl) scoreEl.innerText = `${data.health_score} / 100`;

  const badgeEl = document.getElementById('health-badge');
  if (badgeEl) {
    if (data.health_score >= 75) {
      badgeEl.className = 'health-badge badge-excellent';
      badgeEl.innerText = 'Excellent Stability';
    } else if (data.health_score >= 55) {
      badgeEl.className = 'health-badge badge-good';
      badgeEl.innerText = 'Good Financial Health';
    } else {
      badgeEl.className = 'health-badge badge-warning';
      badgeEl.innerText = 'Enter Values';
    }
  }

  // Audit Hardened Metric Formatting
  document.getElementById('widget-surplus').innerText = formatAmt(m.surplus);
  document.getElementById('widget-savings-rate').innerText = `${m.savings_rate}% Savings Rate`;

  const emStr = m.emergency_months >= 99 ? "99+ Months" : `${m.emergency_months} Months`;
  document.getElementById('widget-emergency').innerText = emStr;
  document.getElementById('widget-emergency-target').innerText = `Target: 6 Months (${formatAmt(m.emergency_target)})`;

  document.getElementById('widget-net-worth').innerText = formatAmt(m.net_worth);
  
  // Real Purchasing Power as Primary Headline
  document.getElementById('widget-corpus').innerText = formatAmt(m.real_purchasing_power);
  document.getElementById('widget-purchasing-power').innerText = `Real Power (In Today's Money over ${m.years_to_retire} Yrs)`;

  renderAllocationBreakdown(data.allocation);
  renderRoadmap(data.roadmap);
  renderAllocationChart(data.allocation);
  renderIncomeBreakdownChart(m);

  const simInput = document.getElementById('sim-sip-amount');
  if (simInput) simInput.value = m.monthly_investable;
  updateGrowthSimulator();
}

function renderAllocationBreakdown(alloc) {
  const breakdownDiv = document.getElementById('allocation-breakdown');
  if (!breakdownDiv) return;

  const labels = Object.keys(alloc);
  const values = Object.values(alloc);
  const colors = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#94a3b8'];

  breakdownDiv.innerHTML = '';
  labels.forEach((label, idx) => {
    const pct = values[idx];
    breakdownDiv.innerHTML += `
      <div style="margin-bottom: 0.65rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 0.2rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-dark); font-weight: 600;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${colors[idx]}; inline-block;"></span>
            ${label}
          </span>
          <strong style="color: var(--color-primary);">${pct}%</strong>
        </div>
        <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${colors[idx]}; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  });
}

function renderAllocationChart(alloc) {
  if (typeof ChartEngine !== 'undefined') {
    const labels = Object.keys(alloc);
    const values = Object.values(alloc);
    const colors = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#94a3b8'];
    ChartEngine.drawDoughnut('allocationChart', labels, values, colors);
  }
}

function renderIncomeBreakdownChart(m) {
  if (typeof ChartEngine !== 'undefined') {
    const fixed = Math.max(0, m.total_expenses - m.surplus);
    const surplus = Math.max(0, m.surplus);
    ChartEngine.drawStackedBar('incomeBreakdownChart', fixed, surplus);
  }
}

function renderRoadmap(steps) {
  const container = document.getElementById('roadmap-container');
  if (!container) return;
  container.innerHTML = '';

  steps.forEach(s => {
    container.innerHTML += `
      <div class="roadmap-item">
        <div class="roadmap-phase">${s.phase}</div>
        <div class="roadmap-title">${s.title}</div>
        <div class="roadmap-desc">${s.description}</div>
      </div>
    `;
  });
}

// SIP Growth Chart Simulator
function updateGrowthSimulator() {
  const sipEl = document.getElementById('sim-sip-amount');
  if (!sipEl) return;

  const sip = Math.max(0, parseFloat(sipEl.value) || 0);
  const inflationRate = parseFloat(document.getElementById('sim-inflation-rate').value) || 5.5;
  const years = parseInt(document.getElementById('sim-years').value) || 20;

  const labels = [];
  const nominalValue = [];
  const realValue = [];
  const totalInvested = [];

  const expectedReturnRate = 0.10;
  const monthlyReturn = expectedReturnRate / 12;

  let currentNominal = 0;
  let currentInvested = 0;

  for (let yr = 1; yr <= years; yr++) {
    labels.push(`Yr ${yr}`);
    for (let m = 1; m <= 12; m++) {
      currentInvested += sip;
      currentNominal = (currentNominal + sip) * (1 + monthlyReturn);
    }
    const inflationFactor = Math.pow(1 + (inflationRate / 100), yr);
    const inflationAdjusted = currentNominal / inflationFactor;

    totalInvested.push(Math.round(currentInvested));
    nominalValue.push(Math.round(currentNominal));
    realValue.push(Math.round(inflationAdjusted));
  }

  if (typeof ChartEngine !== 'undefined') {
    ChartEngine.drawLineChart('growthChart', labels, nominalValue, realValue, totalInvested);
  }
}

// Advisor Chat Call with Markdown Parser
async function sendChatMessage() {
  const input = document.getElementById('chat-text-input');
  const query = input.value.trim();
  if (!query) return;

  const chatLog = document.getElementById('chat-log');

  chatLog.innerHTML += `<div class="chat-bubble chat-bubble-user">${query}</div>`;
  input.value = '';
  chatLog.scrollTop = chatLog.scrollHeight;

  const botBubble = document.createElement('div');
  botBubble.className = 'chat-bubble chat-bubble-advisor';
  botBubble.innerText = 'Analyzing with Google Gemini...';
  chatLog.appendChild(botBubble);
  chatLog.scrollTop = chatLog.scrollHeight;

  try {
    const res = await fetch('/api/agent/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query,
        currency_symbol: currentSymbol,
        profile_data: lastDiagnosisData ? lastDiagnosisData.metrics : null
      })
    });
    const data = await res.json();
    botBubble.innerHTML = parseMarkdown(data.answer);
  } catch (err) {
    botBubble.innerText = "Apologies, I encountered an issue generating a response. Please try asking again.";
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Window Resize Auto re-render for responsive crispness
window.addEventListener('resize', () => {
  if (lastDiagnosisData) {
    renderAllocationChart(lastDiagnosisData.allocation);
    renderIncomeBreakdownChart(lastDiagnosisData.metrics);
  }
  renderRiskReturnChart();
  updateGrowthSimulator();
});

document.addEventListener('DOMContentLoaded', () => {
  resetInputsToZero();
  renderComparisonMatrix();
  agentDiagnose();
});
