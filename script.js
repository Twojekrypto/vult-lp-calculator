const TOTAL_INVESTOR_VULT = 24_000_000;
const VULT_TOKEN_ADDRESS = "0xb788144DF611029C60b859DF47e79B7726C4DEBa";
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${VULT_TOKEN_ADDRESS}`;
const DEXSCREENER_CHART_URL = "https://dexscreener.com/ethereum/0x6df52cc6e2e6f6531e4ceb4b083cf49864a89020";

const DEFAULTS = {
  investmentAmount: 1_000,
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
  { range: "$0.10 -> $0.30", low: 0.1, high: 0.3, vult: 577_350, tickLower: 288400, tickUpper: 299400, liquidity: 430_526_825_642_029_061 },
  { range: "$0.30 -> $0.50", low: 0.3, high: 0.5, vult: 258_154, tickLower: 283200, tickUpper: 288400, liquidity: 616_519_629_281_411_321 },
  { range: "$0.50 -> $0.80", low: 0.5, high: 0.8, vult: 395_475, tickLower: 278600, tickUpper: 283200, liquidity: 1_364_882_096_369_430_843 },
  { range: "$0.80 -> $1.50", low: 0.8, high: 1.5, vult: 1_500_000, tickLower: 272200, tickUpper: 278600, liquidity: 4_888_501_405_611_995_071 },
  { range: "$1.50 -> $3.00", low: 1.5, high: 3.0, vult: 2_500_000, tickLower: 265400, tickUpper: 272200, liquidity: 10_660_244_449_215_264_780 },
  { range: "$3.00 -> $6.00", low: 3.0, high: 6.0, vult: 3_500_000, tickLower: 258400, tickUpper: 265400, liquidity: 20_464_709_160_515_616_440 },
  { range: "$6.00 -> $10.00", low: 6.0, high: 10.0, vult: 5_000_000, tickLower: 253200, tickUpper: 258400, liquidity: 53_511_510_127_426_224_802 },
  { range: "$10.00 -> infinity", low: 10.0, high: Number.POSITIVE_INFINITY, vult: 10_269_021, tickLower: 184200, tickUpper: 253200, liquidity: 33_701_465_351_401_975_824 },
];

const SCENARIOS = [0.2, 0.3, 0.5, 1.0];

const $ = (id) => document.getElementById(id);

const inputs = {
  investmentAmount: $("investmentAmount"),
  entryPrice: $("entryPrice"),
  customPrice: $("customPrice"),
};

const priceButtons = Array.from(document.querySelectorAll("[data-price]"));
const actualPriceButton = $("actualPriceButton");
const actualPriceStatus = $("actualPriceStatus");
const dexscreenerLink = $("dexscreenerLink");

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

function formatInputPrice(price) {
  const fixed = price >= 1 ? price.toFixed(4) : price.toFixed(6);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function tokenIcon(symbol) {
  const token = symbol.toLowerCase();
  const label = symbol.toUpperCase();
  return `<span class="token-icon token-${token}" aria-hidden="true"></span><span class="sr-only">${label}</span>`;
}

function tokenAmount(value, symbol, maximumFractionDigits = 2) {
  const formatted = formatNumber(value, maximumFractionDigits);
  const label = symbol.toUpperCase();
  const token = symbol.toLowerCase();
  return `
    <span class="token-amount token-amount-${token}" data-token="${token}" aria-label="${formatted} ${label}">
      <span class="token-number">${formatted}</span>
      ${tokenIcon(symbol)}
    </span>
  `;
}

function compositionControl(percent, amount, valueUsd, symbol) {
  const formattedPercent = `${percent.toFixed(1)}%`;
  const formattedAmount = formatNumber(amount, 2);
  const label = symbol.toUpperCase();
  const token = symbol.toLowerCase();
  return `
    <button
      type="button"
      class="token-trigger composition-chip token-trigger-${token}"
      data-token="${token}"
      aria-label="Highlight ${label}, ${formattedAmount} ${label}, ${formattedPercent} of LP composition"
    >
      <span class="composition-chip-main">
        <span class="token-number">${formattedAmount}</span>
        ${tokenIcon(symbol)}
      </span>
      <span class="composition-chip-sub">${formattedPercent} · ${formatMoney(valueUsd)}</span>
    </button>
  `;
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

function renderSetupPreview(state) {
  $("setupAllocation").innerHTML = tokenAmount(state.allocation, "vult", 2);
  $("setupShare").textContent = `${(state.share * 100).toFixed(6)}% of investor LP`;
  $("setupCapital").textContent = formatMoney(state.investmentAmount);
  $("setupFees").innerHTML = `${tokenAmount(state.feeUsdc, "usdc")}<span class="asset-separator">+</span>${tokenAmount(state.feeVult, "vult")}`;
}

function renderSummary(state) {
  const current = rowForPrice(state.customPrice, state, "Custom", true);
  const pnl = current.total - state.investmentAmount;
  const pnlPct = state.investmentAmount > 0 ? (pnl / state.investmentAmount) * 100 : 0;
  const pnlSign = pnl >= 0 ? "+" : "-";
  const usdcDollar = current.lpUsdc;
  const vultDollar = current.lpVult * state.customPrice;
  const lpDollar = usdcDollar + vultDollar;
  const usdcPct = lpDollar > 0 ? (usdcDollar / lpDollar) * 100 : 0;
  const vultPct = lpDollar > 0 ? 100 - usdcPct : 0;

  $("activePrice").textContent = formatMoney(state.customPrice, 4);
  $("currentTotal").textContent = formatMoney(current.total);
  $("currentMultiple").textContent = `${current.multiple.toFixed(2)}x multiple`;
  $("currentLpValue").textContent = formatMoney(current.lpValue);
  $("lpBreakdown").innerHTML = `${tokenAmount(current.lpUsdc, "usdc")}<span class="asset-separator">·</span>${tokenAmount(current.lpVult, "vult")}`;
  $("allocation").innerHTML = tokenAmount(state.allocation, "vult");
  $("share").textContent = `${(state.share * 100).toFixed(6)}% of investor LP`;
  $("feeValue").textContent = formatMoney(current.feeValue);
  $("feeSplit").innerHTML = `${tokenAmount(state.feeUsdc, "usdc")}<span class="asset-separator">·</span>${tokenAmount(state.feeVult, "vult")}`;
  $("pnlPill").textContent = `${pnlSign}${formatMoney(Math.abs(pnl))} (${pnlSign}${Math.abs(pnlPct).toFixed(1)}%)`;
  $("pnlPill").classList.toggle("neg", pnl < 0);
  $("barUsdc").style.width = `${usdcPct.toFixed(2)}%`;
  $("barVult").style.width = `${vultPct.toFixed(2)}%`;
  $("barUsdc").setAttribute("aria-label", `USDC ${usdcPct.toFixed(1)}% of LP composition`);
  $("barVult").setAttribute("aria-label", `VULT ${vultPct.toFixed(1)}% of LP composition`);
  $("compositionRatio").innerHTML = `${compositionControl(usdcPct, current.lpUsdc, usdcDollar, "usdc")}${compositionControl(vultPct, current.lpVult, vultDollar, "vult")}`;
}

function renderTable(state) {
  const rows = [
    rowForPrice(state.customPrice, state, `${formatMoney(state.customPrice, 4)} custom`, true),
    ...SCENARIOS.map((price) => rowForPrice(price, state)),
  ];

  $("resultsBody").innerHTML = rows
    .map(
      (row) => `
        <tr class="${row.isCustom ? "row-custom" : ""}">
          <td data-label="VULT price">
            <div class="cell-price">
              <strong>${row.label}</strong>
              <small>${row.isCustom ? "selected input" : "scenario"}</small>
            </div>
          </td>
          <td data-label="LP assets">
            <div class="cell-stack">
              <strong>${tokenAmount(row.lpUsdc, "usdc")}</strong>
              <small>${tokenAmount(row.lpVult, "vult")}</small>
            </div>
          </td>
          <td data-label="LP value"><span class="cell-value">${formatMoney(row.lpValue)}</span></td>
          <td data-label="Fee assets">
            <div class="cell-stack">
              <strong>${tokenAmount(row.feeUsdc, "usdc")}</strong>
              <small>${tokenAmount(row.feeVult, "vult")}</small>
            </div>
          </td>
          <td data-label="Fee value"><span class="cell-value">${formatMoney(row.feeValue)}</span></td>
          <td data-label="Total" class="cell-total">
            <strong>${formatMoney(row.total)}</strong>
            <small>${row.multiple.toFixed(2)}x</small>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderRangeViz(state) {
  const maxVult = Math.max(...POSITIONS.map((position) => position.vult));
  const price = state.customPrice;
  const current = rowForPrice(price, state, "Custom", true);
  const totalUsdc = current.lpUsdc + state.feeUsdc;
  const totalVult = current.lpVult + state.feeVult;

  $("rangeTotal").innerHTML = `
    <div class="range-total-hero">
      <span>Whole position with fees</span>
      <strong>${formatMoney(current.total)}</strong>
      <small>${tokenAmount(totalUsdc, "usdc")}<span class="asset-separator">+</span>${tokenAmount(totalVult, "vult")}</small>
    </div>
    <div class="range-total-grid">
      <div>
        <span>LP assets</span>
        <strong>${formatMoney(current.lpValue)}</strong>
        <small>${tokenAmount(current.lpUsdc, "usdc")}<span class="asset-separator">+</span>${tokenAmount(current.lpVult, "vult")}</small>
      </div>
      <div>
        <span>Generated fees</span>
        <strong>${formatMoney(current.feeValue)}</strong>
        <small>${tokenAmount(state.feeUsdc, "usdc")}<span class="asset-separator">+</span>${tokenAmount(state.feeVult, "vult")}</small>
      </div>
    </div>
  `;

  $("rangeViz").innerHTML = POSITIONS.map((position) => {
    const inRange = price >= position.low && price < position.high;
    const widthPct = (position.vult / maxVult) * 100;
    const rangeAmounts = amountsAtPrice(position, price);
    const rangeUsdc = rangeAmounts.usdc * state.share;
    const rangeVult = rangeAmounts.vult * state.share;

    return `
      <div
        class="range-row ${inRange ? "is-current" : ""}"
        tabindex="0"
        aria-label="${position.range}, current position ${formatNumber(rangeUsdc)} USDC and ${formatNumber(rangeVult)} VULT"
      >
        <span class="range-label">
          <strong>${position.range}</strong>
          <small>${tokenAmount(position.vult, "vult", 0)} range</small>
        </span>
        <div class="range-bar">
          <div class="range-fill ${inRange ? "in-range" : ""}" style="width: ${widthPct.toFixed(1)}%"></div>
        </div>
        <span class="range-assets">
          <span class="range-asset range-asset-usdc ${rangeUsdc <= 0.000001 ? "is-zero" : ""}">${tokenAmount(rangeUsdc, "usdc")}</span>
          <span class="range-asset range-asset-vult ${rangeVult <= 0.000001 ? "is-zero" : ""}">${tokenAmount(rangeVult, "vult")}</span>
        </span>
      </div>
    `;
  }).join("");
}

function renderActiveShortcut(price) {
  priceButtons.forEach((button) => {
    const isActive = Math.abs(Number(button.dataset.price) - price) < 0.000001;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setActualPriceStatus(message, status = "") {
  actualPriceStatus.textContent = message;
  actualPriceStatus.classList.toggle("ok", status === "ok");
  actualPriceStatus.classList.toggle("error", status === "error");
}

function setCompositionHighlight(token = null) {
  const composition = document.querySelector(".composition");
  if (!composition) return;
  composition.classList.toggle("is-highlight-usdc", token === "usdc");
  composition.classList.toggle("is-highlight-vult", token === "vult");
}

function bindCompositionInteractions() {
  const composition = document.querySelector(".composition");
  if (!composition) return;

  composition.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-token]");
    if (target && composition.contains(target)) {
      setCompositionHighlight(target.dataset.token);
    }
  });

  composition.addEventListener("pointerout", (event) => {
    const nextTarget = event.relatedTarget?.closest?.("[data-token]");
    if (!nextTarget || !composition.contains(nextTarget)) {
      setCompositionHighlight();
    }
  });

  composition.addEventListener("focusin", (event) => {
    const target = event.target.closest("[data-token]");
    if (target && composition.contains(target)) {
      setCompositionHighlight(target.dataset.token);
    }
  });

  composition.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget?.closest?.("[data-token]");
    if (!nextTarget || !composition.contains(nextTarget)) {
      setCompositionHighlight();
    }
  });
}

function pickBestPricePair(data) {
  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
  return pairs
    .filter((pair) => pair.chainId === "ethereum" && Number(pair.priceUsd) > 0)
    .sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0];
}

async function useActualPrice() {
  actualPriceButton.classList.add("is-loading");
  actualPriceButton.disabled = true;
  setActualPriceStatus("Fetching actual VULT price from DEX Screener...");

  try {
    const response = await fetch(DEXSCREENER_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`DEX Screener returned ${response.status}`);
    }

    const data = await response.json();
    const pair = pickBestPricePair(data);
    const price = Number(pair?.priceUsd);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("No valid Ethereum VULT price pair found");
    }

    inputs.customPrice.value = formatInputPrice(price);
    if (pair.url) {
      dexscreenerLink.href = pair.url;
    }
    update();
    setActualPriceStatus(
      `Actual price set to ${formatMoney(price, 4)} from the highest-liquidity Ethereum pair.`,
      "ok",
    );
  } catch (error) {
    setActualPriceStatus("Could not fetch actual price. Please enter the price manually.", "error");
  } finally {
    actualPriceButton.classList.remove("is-loading");
    actualPriceButton.disabled = false;
  }
}

function update() {
  const state = getState();
  renderSetupPreview(state);
  renderSummary(state);
  renderTable(state);
  renderRangeViz(state);
  renderActiveShortcut(state.customPrice);
}

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", update);
  input.addEventListener("focus", () => input.select());
});

priceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    inputs.customPrice.value = button.dataset.price;
    update();
  });
});

actualPriceButton.addEventListener("click", useActualPrice);

$("resetButton").addEventListener("click", () => {
  inputs.investmentAmount.value = DEFAULTS.investmentAmount;
  inputs.entryPrice.value = DEFAULTS.entryPrice.toFixed(2);
  inputs.customPrice.value = DEFAULTS.customPrice;
  dexscreenerLink.href = DEXSCREENER_CHART_URL;
  setActualPriceStatus("Actual price uses the highest-liquidity Ethereum VULT pair from DEX Screener.");
  update();
});

bindCompositionInteractions();
update();
