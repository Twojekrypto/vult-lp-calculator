const TOTAL_INVESTOR_VULT = 24_000_000;
const DEFAULTS = {
  investmentAmount: 10_000,
  entryPrice: 0.1,
  customPrice: 0.185916877469,
};

const FEE_POOL = {
  historicalUsdc: 89_214.928864,
  historicalVult: 319_966.260423,
  unclaimedUsdc: 9_569.495276,
  unclaimedVult: 50_097.977327,
};

const POSITIONS = [
  { range: "$0.10 -> $0.30", vult: 577_350, tickLower: 288400, tickUpper: 299400, liquidity: 430_526_825_642_029_061 },
  { range: "$0.30 -> $0.50", vult: 258_154, tickLower: 283200, tickUpper: 288400, liquidity: 616_519_629_281_411_321 },
  { range: "$0.50 -> $0.80", vult: 395_475, tickLower: 278600, tickUpper: 283200, liquidity: 1_364_882_096_369_430_843 },
  { range: "$0.80 -> $1.50", vult: 1_500_000, tickLower: 272200, tickUpper: 278600, liquidity: 4_888_501_405_611_995_071 },
  { range: "$1.50 -> $3.00", vult: 2_500_000, tickLower: 265400, tickUpper: 272200, liquidity: 10_660_244_449_215_264_780 },
  { range: "$3.00 -> $6.00", vult: 3_500_000, tickLower: 258400, tickUpper: 265400, liquidity: 20_464_709_160_515_616_440 },
  { range: "$6.00 -> $10.00", vult: 5_000_000, tickLower: 253200, tickUpper: 258400, liquidity: 53_511_510_127_426_224_802 },
  { range: "$10.00 -> infinity", vult: 10_269_021, tickLower: 184200, tickUpper: 253200, liquidity: 33_701_465_351_401_975_824 },
];

const SCENARIOS = [0.2, 0.3, 0.5, 1.0];

const $ = (id) => document.getElementById(id);
const inputs = {
  investmentAmount: $("investmentAmount"),
  entryPrice: $("entryPrice"),
  customPrice: $("customPrice"),
};
const priceButtons = Array.from(document.querySelectorAll("[data-price]"));

const totalFeePool = {
  usdc: FEE_POOL.historicalUsdc + FEE_POOL.unclaimedUsdc,
  vult: FEE_POOL.historicalVult + FEE_POOL.unclaimedVult,
};

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function sqrtAtTick(tick) {
  return Math.pow(1.0001, tick / 2);
}

function amountsAtPrice(position, price) {
  const sqrtP = Math.sqrt(1e12 / price);
  const sqrtA = sqrtAtTick(position.tickLower);
  const sqrtB = sqrtAtTick(position.tickUpper);
  const liquidity = position.liquidity;

  if (sqrtP <= sqrtA) {
    return {
      usdc: (liquidity * (sqrtB - sqrtA)) / (sqrtA * sqrtB) / 1e6,
      vult: 0,
    };
  }

  if (sqrtP >= sqrtB) {
    return {
      usdc: 0,
      vult: (liquidity * (sqrtB - sqrtA)) / 1e18,
    };
  }

  return {
    usdc: (liquidity * (sqrtB - sqrtP)) / (sqrtP * sqrtB) / 1e6,
    vult: (liquidity * (sqrtP - sqrtA)) / 1e18,
  };
}

function lpTotalsAtPrice(price) {
  return POSITIONS.reduce(
    (total, position) => {
      const amounts = amountsAtPrice(position, price);
      total.usdc += amounts.usdc;
      total.vult += amounts.vult;
      return total;
    },
    { usdc: 0, vult: 0 },
  );
}

function formatMoney(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function getState() {
  const investmentAmount = safeNumber(inputs.investmentAmount.value, DEFAULTS.investmentAmount);
  const entryPrice = safeNumber(inputs.entryPrice.value, DEFAULTS.entryPrice);
  const customPrice = safeNumber(inputs.customPrice.value, DEFAULTS.customPrice);
  const allocation = investmentAmount / entryPrice;
  const share = allocation / TOTAL_INVESTOR_VULT;

  return {
    investmentAmount,
    entryPrice,
    customPrice,
    allocation,
    share,
    feeUsdc: totalFeePool.usdc * share,
    feeVult: totalFeePool.vult * share,
  };
}

function rowForPrice(price, state, label = null, isCustom = false) {
  const lp = lpTotalsAtPrice(price);
  const lpUsdc = lp.usdc * state.share;
  const lpVult = lp.vult * state.share;
  const lpValue = lpUsdc + lpVult * price;
  const feeValue = state.feeUsdc + state.feeVult * price;
  const total = lpValue + feeValue;

  return {
    label: label ?? formatMoney(price, 2),
    price,
    lpUsdc,
    lpVult,
    lpValue,
    feeUsdc: state.feeUsdc,
    feeVult: state.feeVult,
    feeValue,
    total,
    multiple: state.investmentAmount > 0 ? total / state.investmentAmount : 0,
    isCustom,
  };
}

function renderSummary(state) {
  const current = rowForPrice(state.customPrice, state, "Custom", true);
  $("activePrice").textContent = formatMoney(state.customPrice, 4);
  $("currentTotal").textContent = formatMoney(current.total);
  $("currentMultiple").textContent = `${current.multiple.toFixed(2)}x investment multiple`;
  $("currentLpValue").textContent = formatMoney(current.lpValue);
  $("lpBreakdown").textContent = `${formatNumber(current.lpUsdc, 2)} USDC + ${formatNumber(current.lpVult, 2)} VULT`;
  $("allocation").textContent = `${formatNumber(state.allocation, 2)} VULT`;
  $("share").textContent = `${(state.share * 100).toFixed(6)}% of investor LP`;
  $("feeValue").textContent = formatMoney(current.feeValue);
  $("feeSplit").textContent = `${formatNumber(state.feeUsdc, 2)} USDC + ${formatNumber(state.feeVult, 2)} VULT`;
}

function renderActiveShortcut(price) {
  priceButtons.forEach((button) => {
    const isActive = Math.abs(Number(button.dataset.price) - price) < 0.000001;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderTable(state) {
  const rows = [
    rowForPrice(state.customPrice, state, `${formatMoney(state.customPrice, 4)} custom`, true),
    ...SCENARIOS.map((price) => rowForPrice(price, state)),
  ];

  $("resultsBody").innerHTML = rows
    .map(
      (row) => `
        <tr class="${row.isCustom ? "custom-row" : ""}">
          <td class="price-cell">${row.label}<small>${row.isCustom ? "current input" : "scenario"}</small></td>
          <td data-label="LP assets">
            <span class="asset-stack">
              <strong>${formatNumber(row.lpUsdc, 2)} USDC</strong>
              <small>${formatNumber(row.lpVult, 2)} VULT</small>
            </span>
          </td>
          <td data-label="LP value">${formatMoney(row.lpValue)}</td>
          <td data-label="Fee assets">
            <span class="asset-stack fee-assets">
              <strong>${formatNumber(row.feeUsdc, 2)} USDC</strong>
              <small>${formatNumber(row.feeVult, 2)} VULT</small>
            </span>
          </td>
          <td data-label="Fee value">${formatMoney(row.feeValue)}</td>
          <td data-label="Total" class="total-cell">${formatMoney(row.total)}<small>${row.multiple.toFixed(2)}x</small></td>
        </tr>
      `,
    )
    .join("");
}

function renderRanges() {
  $("rangesList").innerHTML = POSITIONS.map(
    (position, index) => `
      <tr>
        <td>Range ${index + 1}<br /><strong>${position.range}</strong></td>
        <td>${formatNumber(position.vult, 0)} VULT</td>
      </tr>
    `,
  ).join("");
}

function update() {
  const state = getState();
  renderSummary(state);
  renderTable(state);
  renderActiveShortcut(state.customPrice);
}

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", update);
});

priceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    inputs.customPrice.value = button.dataset.price;
    update();
  });
});

$("resetButton").addEventListener("click", () => {
  inputs.investmentAmount.value = DEFAULTS.investmentAmount;
  inputs.entryPrice.value = DEFAULTS.entryPrice.toFixed(2);
  inputs.customPrice.value = DEFAULTS.customPrice;
  update();
});

renderRanges();
update();
