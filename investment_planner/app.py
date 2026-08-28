#!/usr/bin/env python3
"""
WealthPlanner - Practical & Realistic Financial Advisory Workspace
FastAPI Backend Application with Realistic Purchasing Power & Highly Optimized AI Advisor
"""

import os
import sys
import math
import httpx
from typing import Dict, List, Optional
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="WealthPlanner - Financial Advisory Workspace")

_env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_file):
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        with open(_env_file) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    if _k.strip() not in os.environ:
                        os.environ[_k.strip()] = _v.strip().strip('"\'')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

class DeepProfileRequest(BaseModel):
    currency_symbol: str = "₹"
    currency_code: str = "INR"
    primary_income: float = 0.0
    secondary_income: float = 0.0
    fixed_expenses: float = 0.0
    discretionary_expenses: float = 0.0
    debt_emi: float = 0.0
    high_interest_debt: float = 0.0
    low_interest_debt: float = 0.0
    current_age: int = 30
    retirement_age: int = 60
    dependents: int = 0
    emergency_cash: float = 0.0
    existing_investments: float = 0.0
    provident_fund: float = 0.0
    risk_profile: str = "moderate"
    child_education_goal: float = 0.0
    tax_bracket_pct: float = 20.0

class ChatRequest(BaseModel):
    question: str
    currency_symbol: str = "₹"
    profile_data: Optional[Dict] = None
    api_key: Optional[str] = None

async def call_gemini_api(prompt: str, custom_key: Optional[str] = None) -> Optional[str]:
    """Call Google Gemini API for dynamic financial reasoning."""
    key = custom_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ADANOS_API_KEY")
    if not key:
        return None

    # 1. Direct Gemini REST API
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        system_prompt = (
            "You are a top-tier personal financial advisor for middle-class investors. "
            "Give a detailed, highly structured, practical answer with bold headers and clear bullet points. "
            "Address the user's question directly with pros, cons, exact math, and actionable guidance.\n\n"
        )
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}{prompt}"}]}]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                res_data = resp.json()
                text = res_data['candidates'][0]['content']['parts'][0]['text']
                if text: return text
    except Exception as e:
        print("Gemini REST API notice:", e)

    # 2. Gemini OpenAI-compatible endpoint
    try:
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = {
            "model": "gemini-1.5-flash",
            "messages": [
                {"role": "system", "content": "You are a top-tier personal financial advisor for middle-class investors."},
                {"role": "user", "content": prompt}
            ]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                res_data = resp.json()
                text = res_data['choices'][0]['message']['content']
                if text: return text
    except Exception as e:
        print("Gemini OpenAI endpoint notice:", e)

    return None

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(request, "index.html")

@app.post("/api/agent/diagnose")
async def agent_diagnose(req: DeepProfileRequest):
    total_income = req.primary_income + req.secondary_income
    total_expenses = req.fixed_expenses + req.discretionary_expenses + req.debt_emi
    surplus = max(0.0, total_income - total_expenses)
    savings_rate = round((surplus / total_income * 100), 1) if total_income > 0 else 0.0
    
    monthly_living_costs = req.fixed_expenses + req.debt_emi
    emergency_target = monthly_living_costs * 6
    emergency_months = round((req.emergency_cash / monthly_living_costs), 1) if monthly_living_costs > 0 else 0.0
    
    dti_ratio = round((req.debt_emi / total_income * 100), 1) if total_income > 0 else 0.0
    total_net_worth = req.emergency_cash + req.existing_investments + req.provident_fund - (req.high_interest_debt + req.low_interest_debt)

    # Health Score Calculation
    if total_income == 0 and total_expenses == 0:
        health_score = 0
    else:
        score = 50
        if savings_rate >= 30: score += 15
        elif savings_rate >= 20: score += 10
        if emergency_months >= 6: score += 20
        elif emergency_months >= 3: score += 10
        if dti_ratio <= 20: score += 15
        elif dti_ratio <= 35: score += 5
        else: score -= 15
        if req.high_interest_debt > 0: score -= 15
        health_score = max(10, min(99, score))

    years_to_retire = max(1, req.retirement_age - req.current_age)
    
    if req.risk_profile == "conservative":
        equity_pct, debt_pct, gold_pct, reits_pct = 30, 45, 15, 5
        cagr = 0.08
    elif req.risk_profile == "aggressive":
        equity_pct, debt_pct, gold_pct, reits_pct = 70, 15, 5, 5
        cagr = 0.12
    else:  # moderate / growth
        equity_pct, debt_pct, gold_pct, reits_pct = 50, 25, 10, 10
        cagr = 0.10

    liquid_pct = max(0, 100 - (equity_pct + debt_pct + gold_pct + reits_pct))

    allocation = {
        "Broad Index Funds": equity_pct,
        "Fixed Income / Govt Bonds": debt_pct,
        "Sovereign Gold / Gold ETFs": gold_pct,
        "REITs (Real Estate)": reits_pct,
        "Liquid Cash / Emergency": liquid_pct
    }

    # Realistic Allocation: 50% of surplus is allocated to long-term SIP (remaining 50% goes to short-term family goals)
    monthly_sip_allocation = surplus * 0.50
    monthly_rate = cagr / 12
    total_months = years_to_retire * 12

    if monthly_rate > 0 and total_months > 0 and monthly_sip_allocation > 0:
        fv_sip = monthly_sip_allocation * (((math.pow(1 + monthly_rate, total_months) - 1) / monthly_rate) * (1 + monthly_rate))
    else:
        fv_sip = monthly_sip_allocation * total_months

    fv_existing = req.existing_investments * math.pow(1 + cagr, years_to_retire)
    future_corpus = fv_existing + fv_sip

    # Real Inflation-Adjusted Purchasing Power (Discounted at 5.5% inflation)
    inflation_rate = 0.055
    real_purchasing_power = future_corpus / math.pow(1 + inflation_rate, years_to_retire)

    roadmap = []
    
    if req.high_interest_debt > 0:
        roadmap.append({
            "phase": "IMMEDIATE PRIORITY",
            "title": "Clear High-Interest Debt",
            "description": f"You currently have {req.currency_symbol}{round(req.high_interest_debt):,} in high-cost debt. Pay this off first using your monthly surplus before starting long-term investments."
        })

    if emergency_months < 3 and monthly_living_costs > 0:
        roadmap.append({
            "phase": "STEP 1 - FINANCIAL SAFETY",
            "title": "Build Emergency Fund Cushion",
            "description": f"Your liquid savings cover {emergency_months} months. Aim to build 6 months of living costs ({req.currency_symbol}{round(emergency_target):,}) in a liquid fund."
        })
    elif total_income == 0:
        roadmap.append({
            "phase": "STEP 1 - GET STARTED",
            "title": "Enter Monthly Income & Expenses",
            "description": "Fill in your monthly salary, living expenses, and current savings in the sidebar form to generate a customized financial plan."
        })

    roadmap.append({
        "phase": "STEP 2 - INSURANCE PROTECTION",
        "title": "Ensure Adequate Insurance Coverage",
        "description": f"Secure a Pure Term Insurance policy equal to 10x-15x your annual income plus a comprehensive family health insurance policy."
    })

    roadmap.append({
        "phase": "STEP 3 - CORE WEALTH ACCUMULATION",
        "title": "Automated Monthly Index Fund SIPs",
        "description": f"Start automated monthly SIPs of {req.currency_symbol}{round(monthly_sip_allocation * (equity_pct/100)):,} into low-cost broad market index funds (e.g. Nifty 50 or S&P 500)."
    })

    roadmap.append({
        "phase": "STEP 4 - TAX EFFICIENCY",
        "title": "Maximize Tax-Saving Investments",
        "description": f"Utilize tax-saving options (e.g. ELSS Mutual Funds / 401k / EPF) to minimize your tax liability."
    })

    return {
        "health_score": health_score,
        "metrics": {
            "total_income": round(total_income),
            "total_expenses": round(total_expenses),
            "surplus": round(surplus),
            "savings_rate": savings_rate,
            "emergency_months": emergency_months,
            "emergency_target": round(emergency_target),
            "dti_ratio": dti_ratio,
            "net_worth": round(total_net_worth),
            "future_corpus": round(future_corpus),
            "real_purchasing_power": round(real_purchasing_power),
            "years_to_retire": years_to_retire,
            "monthly_investable": round(monthly_sip_allocation)
        },
        "allocation": allocation,
        "roadmap": roadmap
    }

@app.post("/api/agent/copilot")
async def agent_copilot(req: ChatRequest):
    sym = req.currency_symbol
    p = req.profile_data or {}
    q = req.question.lower().strip()

    prompt = (
        f"User Question: '{req.question}'\n\n"
        f"User Financial Profile:\n"
        f"- Monthly Income: {sym}{p.get('total_income', 0):,}\n"
        f"- Monthly Surplus: {sym}{p.get('surplus', 0):,}\n"
        f"- Emergency Fund Cushion: {p.get('emergency_months', 0)} months\n"
        f"- Years to Retirement: {p.get('years_to_retire', 30)} years\n"
        f"- Real Purchasing Power Corpus: {sym}{p.get('real_purchasing_power', 0):,} (in today's money)\n\n"
        f"Please provide an expert, highly structured financial comparison or answer tailored to middle-class investors. "
        f"Include pros, cons, statistical success rates, risk comparisons, and concrete action steps."
    )

    ai_response = await call_gemini_api(prompt, req.api_key)
    if ai_response:
        return {"answer": ai_response}

    # Highly Optimized Financial Advisor Responses for Specific Topics
    if "sip" in q and ("stock" in q or "trade" in q or "trading" in q):
        answer = (
            f"### ⚖️ Systematic Investment Plan (SIP) vs. Direct Stock Trading\n\n"
            f"Here is a realistic financial comparison for middle-class investors:\n\n"
            f"#### 1. Index Mutual Fund SIP (Recommended Core - 80% Portfolio)\n"
            f"- **Success Rate**: Over 95% of 10-year+ Index SIP investors achieve positive inflation-beating returns.\n"
            f"- **Expected Return**: 12% - 14% p.a. compound historical returns.\n"
            f"- **Time Required**: 0 hours/week (Fully automated on payday).\n"
            f"- **Key Advantage**: Zero stock-picking risk, low expense ratios (<0.1%), and compound growth without emotional stress.\n\n"
            f"#### 2. Active Stock Trading (Satellite Only - Max 10% Capital)\n"
            f"- **Success Rate**: SEBI & SEC data shows **90%+ of retail traders lose net capital** over 3 years.\n"
            f"- **Expected Return**: Highly volatile (-100% to +30%+).\n"
            f"- **Time Required**: 15-20 hours/week of chart monitoring and technical analysis.\n"
            f"- **Key Disadvantage**: High short-term capital gains tax (20%), brokerage fees, and emotional fatigue.\n\n"
            f"#### 🎯 Verdict for Your Budget ({sym}{p.get('surplus', 0):,}/mo Surplus):\n"
            f"Put **90% of your monthly surplus ({sym}{round(p.get('surplus', 0) * 0.9):,}) into automated Index Fund SIPs**, and restrict any speculative stock trading to a maximum 10% learning budget."
        )
    elif "prepay" in q or "loan" in q or "emi" in q or "mortgage" in q:
        answer = (
            f"### 💡 Home Loan Prepayment vs. Equity Investing Strategy\n\n"
            f"Here is how to evaluate loan prepayment based on interest rates:\n\n"
            f"• **High-Interest Credit Cards / Personal Loans (>10%)**: Always prepay immediately. Wiping out a 14% debt gives a guaranteed 14% tax-free return.\n"
            f"• **Low-Interest Home Loans (<8%)**: Continue paying regular EMIs while investing your surplus ({sym}{p.get('surplus', 0):,}/mo) into Index Funds (12-14% CAGR). The net 4-6% compounding spread makes you significantly wealthier over 15-20 years.\n"
            f"• **Hybrid Approach**: Make 1 extra EMI payment per year towards principal. This reduces a 20-year home loan by 4.5 years without starving your investment portfolio!"
        )
    elif "emergency" in q or "fund" in q or "cash" in q:
        answer = (
            f"### 🛡️ Building a Rock-Solid Emergency Fund\n\n"
            f"Your liquid emergency cushion currently covers **{p.get('emergency_months', 0)} months** of living expenses.\n\n"
            f"• **Recommended Target**: 6 months of mandatory expenses ({sym}{p.get('emergency_target', 0):,}).\n"
            f"• **Where to Keep It**:\n"
            f"  - **50% in High-Yield Savings Account**: Instant ATM/UPI access for immediate medical or car emergencies.\n"
            f"  - **50% in Arbitrage / Liquid Mutual Funds**: T+1 day redemption with tax efficiency and 6.5-7% yields."
        )
    elif "calc" in q or "math" in q or "formula" in q or "corpus" in q or "high" in q:
        answer = (
            f"### 🧮 Understanding Your Retirement Corpus & Inflation Adjustment\n\n"
            f"When planning 20-30 years ahead, nominal paper currency numbers look huge due to compounding. Here is how your real wealth is calculated:\n\n"
            f"1. **Real Purchasing Power (Today's Money)**: `{sym}{p.get('real_purchasing_power', 0):,}`\n"
            f"   - This is what your money can ACTUALLY buy in today's grocery, healthcare, and housing prices.\n"
            f"2. **Standard Compound SIP Formula**:\n"
            f"   `FV = SIP × [ ((1 + r)^n - 1) / r ] × (1 + r)`\n"
            f"3. **Inflation Discounting**: We discount the future paper value by 5.5% annual inflation so you never get misled by raw paper numbers."
        )
    else:
        answer = (
            f"### 🌱 Core Principles for Middle-Class Wealth Creation\n\n"
            f"• **Automate Investments**: Set up your SIPs on the 1st of every month right after salary credit.\n"
            f"• **10% Annual SIP Step-Up**: Increase your monthly investment by 10% every year when you get an annual increment. This simple habit cuts 6+ years off your retirement goal!\n"
            f"• **Stick to Low-Cost Index Funds**: 80% of your wealth building should be in broad market index funds (Nifty 50 / S&P 500) rather than stock picking."
        )

    return {"answer": answer}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
