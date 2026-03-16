const state = {
  mortgageSchedule: []
};

let mobileSidebar = null;
let mobileSidebarToggleBtn = null;

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2
});

const pct = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 2
});

function n(id) {
  return Number(document.getElementById(id).value) || 0;
}

function txt(id) {
  return document.getElementById(id).value.trim();
}

function formatMoney(value) {
  return money.format(value || 0);
}

function formatPct(valueDecimal) {
  return pct.format(valueDecimal || 0);
}

function parseSeries(input) {
  return input
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
}

function setResult(id, lines) {
  document.getElementById(id).innerHTML = lines.join("<br>");
}

function clearCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawLineChart(canvasId, dataPoints, color = "#0b7f67") {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !dataPoints.length) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 34;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const minVal = Math.min(...dataPoints, 0);
  const maxVal = Math.max(...dataPoints, 1);
  const yRange = maxVal - minVal || 1;

  ctx.strokeStyle = "#c8d8e7";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();

  dataPoints.forEach((value, index) => {
    const x = pad + (index / (dataPoints.length - 1 || 1)) * (width - pad * 2);
    const y = height - pad - ((value - minVal) / yRange) * (height - pad * 2);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = color;
  dataPoints.forEach((value, index) => {
    const x = pad + (index / (dataPoints.length - 1 || 1)) * (width - pad * 2);
    const y = height - pad - ((value - minVal) / yRange) * (height - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 2.7, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#36536f";
  ctx.font = "12px IBM Plex Sans";
  ctx.fillText(formatMoney(minVal), 4, height - pad + 4);
  ctx.fillText(formatMoney(maxVal), 4, pad + 4);
}

function drawBarChart(canvasId, values, labels) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !values.length) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 34;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);
  const barWidth = innerW / values.length * 0.6;

  ctx.strokeStyle = "#c8d8e7";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  values.forEach((val, i) => {
    const xCenter = pad + (innerW / values.length) * (i + 0.5);
    const h = (Math.abs(val) / maxAbs) * (innerH - 12);
    const y = height - pad - h;
    ctx.fillStyle = val >= 0 ? "#0b7f67" : "#d14a4a";
    ctx.fillRect(xCenter - barWidth / 2, y, barWidth, h);

    ctx.fillStyle = "#2c4a67";
    ctx.font = "12px IBM Plex Sans";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], xCenter, height - 10);
  });

  ctx.textAlign = "start";
}

function fvPeriodic(initial, monthly, years, annualRatePct) {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = years * 12;
  let balance = initial;
  const yearly = [balance];

  for (let m = 1; m <= months; m += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (m % 12 === 0 || m === months) {
      yearly.push(balance);
    }
  }

  return { finalValue: balance, yearlySeries: yearly };
}

function loanFrenchPayment(principal, annualRatePct, years) {
  const i = annualRatePct / 100 / 12;
  const nMonths = Math.max(1, Math.round(years * 12));

  if (i === 0) {
    const payment = principal / nMonths;
    return {
      payment,
      totalPayment: payment * nMonths,
      totalInterest: 0,
      nMonths
    };
  }

  const payment = principal * i / (1 - Math.pow(1 + i, -nMonths));
  const totalPayment = payment * nMonths;
  const totalInterest = totalPayment - principal;

  return { payment, totalPayment, totalInterest, nMonths };
}

function computeNPV(ratePct, cashFlows) {
  const r = ratePct / 100;
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
}

function computeIRR(cashFlows) {
  let low = -0.99;
  let high = 2.5;
  let npvLow = computeNPV(low * 100, cashFlows);
  let npvHigh = computeNPV(high * 100, cashFlows);

  if (npvLow * npvHigh > 0) {
    return null;
  }

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const npvMid = computeNPV(mid * 100, cashFlows);

    if (Math.abs(npvMid) < 1e-7) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
}

function avg(values) {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

function std(values) {
  if (values.length < 2) {
    return 0;
  }
  const mean = avg(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function saveLocally() {
  // Persistimos únicamente inputs para recuperar el último estado del usuario.
  const payload = {};
  document.querySelectorAll("input").forEach((input) => {
    payload[input.id] = input.value;
  });
  localStorage.setItem("blas-finance-inputs", JSON.stringify(payload));
}

function loadLocal() {
  const raw = localStorage.getItem("blas-finance-inputs");
  if (!raw) {
    return;
  }
  try {
    const values = JSON.parse(raw);
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
      }
    });
  } catch {
    localStorage.removeItem("blas-finance-inputs");
  }
}

function setupMenu() {
  const buttons = [...document.querySelectorAll(".menu-item")];
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tool-section").forEach((section) => {
        section.classList.remove("active");
      });
      const section = document.getElementById(btn.dataset.target);
      if (section) {
        section.classList.add("active");
        // En móvil, hacer scroll al contenido y contraer el listado.
        if (window.innerWidth <= 1180 || window.matchMedia("(pointer: coarse)").matches) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
          if (mobileSidebar) {
            mobileSidebar.classList.add("mobile-collapsed");
            syncMobileSidebarToggle();
          }
        }
      }
    });
  });
}

function syncMobileSidebarToggle() {
  if (!mobileSidebar || !mobileSidebarToggleBtn) {
    return;
  }

  const isMobile = window.innerWidth <= 1180 || window.matchMedia("(pointer: coarse)").matches;
  if (!isMobile) {
    mobileSidebar.classList.remove("mobile-collapsed");
    mobileSidebarToggleBtn.hidden = true;
    mobileSidebarToggleBtn.setAttribute("aria-expanded", "true");
    mobileSidebarToggleBtn.textContent = "Ocultar herramientas ▲";
    return;
  }

  mobileSidebarToggleBtn.hidden = false;
  const isCollapsed = mobileSidebar.classList.contains("mobile-collapsed");
  mobileSidebarToggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
  mobileSidebarToggleBtn.textContent = isCollapsed ? "Mostrar herramientas ▼" : "Ocultar herramientas ▲";
}

function setupMobileSidebarToggle() {
  mobileSidebar = document.querySelector(".sidebar");
  mobileSidebarToggleBtn = document.getElementById("mobileSidebarToggle");

  if (!mobileSidebar || !mobileSidebarToggleBtn) {
    return;
  }

  if (window.innerWidth <= 1180 || window.matchMedia("(pointer: coarse)").matches) {
    mobileSidebar.classList.add("mobile-collapsed");
  }

  mobileSidebarToggleBtn.addEventListener("click", () => {
    mobileSidebar.classList.toggle("mobile-collapsed");
    syncMobileSidebarToggle();
  });

  window.addEventListener("resize", syncMobileSidebarToggle);
  syncMobileSidebarToggle();
}

function setupSidebarScrollControls() {
  const sidebar = document.querySelector(".sidebar");
  const upBtn = document.getElementById("sidebarUpBtn");
  const downBtn = document.getElementById("sidebarDownBtn");

  if (!sidebar || !upBtn || !downBtn) {
    return;
  }

  const step = 220;

  upBtn.addEventListener("click", () => {
    sidebar.scrollBy({ top: -step, behavior: "smooth" });
  });

  downBtn.addEventListener("click", () => {
    sidebar.scrollBy({ top: step, behavior: "smooth" });
  });
}

function runCompound() {
  const initial = n("compoundInitial");
  const monthly = n("compoundMonthly");
  const years = n("compoundYears");
  const rate = n("compoundRate");

  const out = fvPeriodic(initial, monthly, years, rate);
  const invested = initial + monthly * years * 12;
  const gain = out.finalValue - invested;

  setResult("compoundResult", [
    `<strong>Capital final:</strong> ${formatMoney(out.finalValue)}`,
    `<strong>Total aportado:</strong> ${formatMoney(invested)}`,
    `<strong>Ganancia por interés:</strong> ${formatMoney(gain)}`
  ]);
  drawLineChart("compoundChart", out.yearlySeries, "#0f7a65");
}

function runMortgage() {
  const principal = n("mortgagePrincipal");
  const rate = n("mortgageRate");
  const years = n("mortgageYears");
  const calc = loanFrenchPayment(principal, rate, years);

  setResult("mortgageResult", [
    `<strong>Cuota mensual:</strong> ${formatMoney(calc.payment)}`,
    `<strong>Total intereses:</strong> ${formatMoney(calc.totalInterest)}`,
    `<strong>Total pagado:</strong> ${formatMoney(calc.totalPayment)}`
  ]);

  state.mortgageSchedule = [];
  const tbody = document.querySelector("#mortgageTable tbody");
  tbody.innerHTML = "";

  let balance = principal;
  const i = rate / 100 / 12;

  for (let m = 1; m <= calc.nMonths; m += 1) {
    const interest = i === 0 ? 0 : balance * i;
    const amortization = calc.payment - interest;
    balance = Math.max(0, balance - amortization);

    state.mortgageSchedule.push({
      month: m,
      payment: calc.payment,
      interest,
      amortization,
      balance
    });

    if (m <= 240 || m === calc.nMonths) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${m}</td>
        <td>${formatMoney(calc.payment)}</td>
        <td>${formatMoney(interest)}</td>
        <td>${formatMoney(amortization)}</td>
        <td>${formatMoney(balance)}</td>
      `;
      tbody.appendChild(row);
    }
  }
}

function runLoan() {
  const principal = n("loanPrincipal");
  const rate = n("loanRate");
  const years = n("loanYears");
  const calc = loanFrenchPayment(principal, rate, years);

  setResult("loanResult", [
    `<strong>Cuota:</strong> ${formatMoney(calc.payment)}`,
    `<strong>Intereses totales:</strong> ${formatMoney(calc.totalInterest)}`,
    `<strong>Duración:</strong> ${calc.nMonths} meses`
  ]);
}

function runLoanCompare() {
  const A = loanFrenchPayment(n("loanAAmount"), n("loanARate"), n("loanAYears"));
  const B = loanFrenchPayment(n("loanBAmount"), n("loanBRate"), n("loanBYears"));

  const best = A.totalPayment < B.totalPayment ? "A" : "B";

  setResult("loanCompareResult", [
    `<strong>Préstamo A:</strong> cuota ${formatMoney(A.payment)} | total ${formatMoney(A.totalPayment)}`,
    `<strong>Préstamo B:</strong> cuota ${formatMoney(B.payment)} | total ${formatMoney(B.totalPayment)}`,
    `<strong>Más barato (coste total):</strong> ${best}`
  ]);
}

function runInvestment() {
  const initial = n("invInitial");
  const finalV = n("invFinal");
  const years = n("invYears");

  const roi = (finalV - initial) / (initial || 1);
  const cagr = Math.pow(finalV / (initial || 1), 1 / Math.max(1, years)) - 1;

  setResult("invResult", [
    `<strong>Rentabilidad total:</strong> ${formatPct(roi)}`,
    `<strong>ROI:</strong> ${formatPct(roi)}`,
    `<strong>CAGR:</strong> ${formatPct(cagr)}`,
    `<strong>Ganancia neta:</strong> ${formatMoney(finalV - initial)}`
  ]);
}

function metrics(initial, finalV, years) {
  const roi = (finalV - initial) / (initial || 1);
  const cagr = Math.pow(finalV / (initial || 1), 1 / Math.max(1, years)) - 1;
  return { roi, cagr, gain: finalV - initial };
}

function runInvestmentCompare() {
  const a = metrics(n("invAInitial"), n("invAFinal"), n("invAYears"));
  const b = metrics(n("invBInitial"), n("invBFinal"), n("invBYears"));

  const winner = a.cagr > b.cagr ? "A" : "B";

  setResult("invCompareResult", [
    `<strong>A:</strong> ROI ${formatPct(a.roi)} | CAGR ${formatPct(a.cagr)} | Ganancia ${formatMoney(a.gain)}`,
    `<strong>B:</strong> ROI ${formatPct(b.roi)} | CAGR ${formatPct(b.cagr)} | Ganancia ${formatMoney(b.gain)}`,
    `<strong>Mejor anualizado:</strong> ${winner}`
  ]);
}

function runNpvIrr() {
  const cashFlows = parseSeries(txt("cashFlows"));
  const discountRate = n("discountRate");

  if (cashFlows.length < 2) {
    setResult("npvResult", ["Introduce al menos 2 flujos de caja."]);
    return;
  }

  const npv = computeNPV(discountRate, cashFlows);
  const irr = computeIRR(cashFlows);

  setResult("npvResult", [
    `<strong>VAN:</strong> ${formatMoney(npv)}`,
    `<strong>TIR:</strong> ${irr == null ? "No convergente" : formatPct(irr)}`
  ]);
}

function runCashflow() {
  const income = n("cfSalary") + n("cfOtherIncome");
  const expenses = n("cfHousing") + n("cfTransport") + n("cfFood") + n("cfMisc");
  const balance = income - expenses;

  setResult("cashflowResult", [
    `<strong>Ingresos:</strong> ${formatMoney(income)}`,
    `<strong>Gastos:</strong> ${formatMoney(expenses)}`,
    `<strong>Balance mensual:</strong> ${formatMoney(balance)}`
  ]);

  drawBarChart("cashflowChart", [income, -expenses, balance], ["Ingreso", "Gasto", "Balance"]);
}

function runRealEstate() {
  const value = n("reValue");
  const rent = n("reRent");
  const occupancy = n("reOccupancy") / 100;
  const expenses = n("reExpenses");
  const debt = n("reDebt");
  const appreciation = n("reAppreciation") / 100;
  const years = n("reYears");

  const grossIncome = rent * 12 * occupancy;
  const noi = grossIncome - expenses;
  const capRate = noi / (value || 1);
  const grossYield = grossIncome / (value || 1);
  const netYield = noi / (value || 1);
  const annualCashflow = noi - debt;
  const futureValue = value * Math.pow(1 + appreciation, years);

  setResult("reResult", [
    `<strong>Cap rate:</strong> ${formatPct(capRate)}`,
    `<strong>Rentabilidad bruta:</strong> ${formatPct(grossYield)}`,
    `<strong>Rentabilidad neta:</strong> ${formatPct(netYield)}`,
    `<strong>Cashflow anual:</strong> ${formatMoney(annualCashflow)}`,
    `<strong>Valor proyectado (${years} años):</strong> ${formatMoney(futureValue)}`
  ]);
}

function runDca() {
  const monthly = n("dcaMonthly");
  const years = n("dcaYears");
  const rate = n("dcaRate");

  const out = fvPeriodic(0, monthly, years, rate);
  const invested = monthly * years * 12;

  setResult("dcaResult", [
    `<strong>Capital final:</strong> ${formatMoney(out.finalValue)}`,
    `<strong>Total aportado:</strong> ${formatMoney(invested)}`,
    `<strong>Ganancia estimada:</strong> ${formatMoney(out.finalValue - invested)}`
  ]);

  drawLineChart("dcaChart", out.yearlySeries, "#dd7a21");
}

function runRetirement() {
  const current = n("retCurrent");
  const monthly = n("retMonthly");
  const years = n("retYears");
  const rate = n("retRate");

  const out = fvPeriodic(current, monthly, years, rate);
  const totalContrib = current + monthly * years * 12;

  setResult("retResult", [
    `<strong>Objetivo estimado:</strong> ${formatMoney(out.finalValue)}`,
    `<strong>Aportaciones totales:</strong> ${formatMoney(totalContrib)}`,
    `<strong>Crecimiento acumulado:</strong> ${formatMoney(out.finalValue - totalContrib)}`
  ]);
}

function runConverterMonthlyAnnual() {
  const monthlyPct = n("convMonthlyRate") / 100;
  const annualPct = n("convAnnualRate") / 100;

  const annualFromMonthly = Math.pow(1 + monthlyPct, 12) - 1;
  const monthlyFromAnnual = Math.pow(1 + annualPct, 1 / 12) - 1;

  setResult("convMonthlyAnnualResult", [
    `<strong>Anual desde mensual:</strong> ${formatPct(annualFromMonthly)}`,
    `<strong>Mensual desde anual:</strong> ${formatPct(monthlyFromAnnual)}`
  ]);
}

function runConverterNomEff() {
  const nominal = n("convNominal") / 100;
  const effective = n("convEffective") / 100;
  const periods = Math.max(1, n("convPeriods"));
  const inflation = n("convInflation") / 100;

  const effectiveFromNominal = Math.pow(1 + nominal / periods, periods) - 1;
  const nominalFromEffective = periods * (Math.pow(1 + effective, 1 / periods) - 1);
  const realRate = (1 + effective) / (1 + inflation) - 1;

  setResult("convNomEffResult", [
    `<strong>Efectiva desde nominal:</strong> ${formatPct(effectiveFromNominal)}`,
    `<strong>Nominal desde efectiva:</strong> ${formatPct(nominalFromEffective)}`,
    `<strong>Interés real (Fisher):</strong> ${formatPct(realRate)}`
  ]);
}

function runRisk() {
  const returns = parseSeries(txt("riskReturns")).map((v) => v / 100);
  if (!returns.length) {
    setResult("riskResult", ["Introduce retornos válidos separados por comas."]);
    return;
  }

  const mean = avg(returns);
  const deviation = std(returns);
  const annualized = deviation * Math.sqrt(12);

  setResult("riskResult", [
    `<strong>Media de retornos:</strong> ${formatPct(mean)}`,
    `<strong>Desviación estándar:</strong> ${formatPct(deviation)}`,
    `<strong>Volatilidad anualizada (aprox):</strong> ${formatPct(annualized)}`
  ]);
}

function runScenarios() {
  const initial = n("scInitial");
  const monthly = n("scMonthly");
  const years = n("scYears");
  const conservative = n("scConservative");
  const medium = n("scMedium");
  const aggressive = n("scAggressive");

  const c = fvPeriodic(initial, monthly, years, conservative);
  const m = fvPeriodic(initial, monthly, years, medium);
  const a = fvPeriodic(initial, monthly, years, aggressive);

  setResult("scResult", [
    `<strong>Conservador:</strong> ${formatMoney(c.finalValue)}`,
    `<strong>Medio:</strong> ${formatMoney(m.finalValue)}`,
    `<strong>Agresivo:</strong> ${formatMoney(a.finalValue)}`
  ]);

  drawBarChart("scChart", [c.finalValue, m.finalValue, a.finalValue], ["Conservador", "Medio", "Agresivo"]);
}

function bindEvents() {
  document.getElementById("compoundBtn").addEventListener("click", () => {
    runCompound();
    saveLocally();
  });

  document.getElementById("mortgageBtn").addEventListener("click", () => {
    runMortgage();
    saveLocally();
  });

  document.getElementById("loanBtn").addEventListener("click", () => {
    runLoan();
    saveLocally();
  });

  document.getElementById("loanCompareBtn").addEventListener("click", () => {
    runLoanCompare();
    saveLocally();
  });

  document.getElementById("invBtn").addEventListener("click", () => {
    runInvestment();
    saveLocally();
  });

  document.getElementById("invCompareBtn").addEventListener("click", () => {
    runInvestmentCompare();
    saveLocally();
  });

  document.getElementById("npvBtn").addEventListener("click", () => {
    runNpvIrr();
    saveLocally();
  });

  document.getElementById("cashflowBtn").addEventListener("click", () => {
    runCashflow();
    saveLocally();
  });

  document.getElementById("reBtn").addEventListener("click", () => {
    runRealEstate();
    saveLocally();
  });

  document.getElementById("dcaBtn").addEventListener("click", () => {
    runDca();
    saveLocally();
  });

  document.getElementById("retBtn").addEventListener("click", () => {
    runRetirement();
    saveLocally();
  });

  document.getElementById("convMonthlyAnnualBtn").addEventListener("click", () => {
    runConverterMonthlyAnnual();
    saveLocally();
  });

  document.getElementById("convNomEffBtn").addEventListener("click", () => {
    runConverterNomEff();
    saveLocally();
  });

  document.getElementById("riskBtn").addEventListener("click", () => {
    runRisk();
    saveLocally();
  });

  document.getElementById("scBtn").addEventListener("click", () => {
    runScenarios();
    saveLocally();
  });
}

function boot() {
  loadLocal();
  setupMobileSidebarToggle();
  setupMenu();
  setupSidebarScrollControls();
  bindEvents();

  // Ejecutamos una primera pasada para mostrar resultados iniciales.
  runCompound();
  runMortgage();
  runLoan();
  runLoanCompare();
  runInvestment();
  runInvestmentCompare();
  runNpvIrr();
  runCashflow();
  runRealEstate();
  runDca();
  runRetirement();
  runConverterMonthlyAnnual();
  runConverterNomEff();
  runRisk();
  runScenarios();
}

window.addEventListener("DOMContentLoaded", boot);
