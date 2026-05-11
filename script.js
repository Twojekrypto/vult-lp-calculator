const TOTAL_INVESTOR_VULT = 24_000_000;
const VULT_TOKEN_ADDRESS = "0xb788144DF611029C60b859DF47e79B7726C4DEBa";
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${VULT_TOKEN_ADDRESS}`;
const DEXSCREENER_CHART_URL = "https://dexscreener.com/ethereum/0x6df52cc6e2e6f6531e4ceb4b083cf49864a89020";
const UNISWAP_POSITION_BASE_URL = "https://app.uniswap.org/positions/v3/ethereum";

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
  { range: "$0.10 -> $0.30", low: 0.1, high: 0.3, vult: 577_350, tickLower: 288400, tickUpper: 299400, liquidity: 430_526_825_642_029_061, nftId: 1189436, unclaimedFeeUsdc: FEE_POOL.unclaimedUsdc, unclaimedFeeVult: FEE_POOL.unclaimedVult },
  { range: "$0.30 -> $0.50", low: 0.3, high: 0.5, vult: 258_154, tickLower: 283200, tickUpper: 288400, liquidity: 616_519_629_281_411_321, nftId: 1189439, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$0.50 -> $0.80", low: 0.5, high: 0.8, vult: 395_475, tickLower: 278600, tickUpper: 283200, liquidity: 1_364_882_096_369_430_843, nftId: 1189444, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$0.80 -> $1.50", low: 0.8, high: 1.5, vult: 1_500_000, tickLower: 272200, tickUpper: 278600, liquidity: 4_888_501_405_611_995_071, nftId: 1189449, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$1.50 -> $3.00", low: 1.5, high: 3.0, vult: 2_500_000, tickLower: 265400, tickUpper: 272200, liquidity: 10_660_244_449_215_264_780, nftId: 1189450, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$3.00 -> $6.00", low: 3.0, high: 6.0, vult: 3_500_000, tickLower: 258400, tickUpper: 265400, liquidity: 20_464_709_160_515_616_440, nftId: 1189456, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$6.00 -> $10.00", low: 6.0, high: 10.0, vult: 5_000_000, tickLower: 253200, tickUpper: 258400, liquidity: 53_511_510_127_426_224_802, nftId: 1189459, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
  { range: "$10.00 -> infinity", low: 10.0, high: Number.POSITIVE_INFINITY, vult: 10_269_021, tickLower: 184200, tickUpper: 253200, liquidity: 33_701_465_351_401_975_824, nftId: 1189462, unclaimedFeeUsdc: 0, unclaimedFeeVult: 0 },
];

const SCENARIOS = [0.3, 0.5, 0.8, 1.5, 3.0];
const COUNT_UP_DURATION_MS = 900;

const $ = (id) => document.getElementById(id);

const inputs = {
  investmentAmount: $("investmentAmount"),
  entryPrice: $("entryPrice"),
  customPrice: $("customPrice"),
};

const priceButtons = Array.from(document.querySelectorAll("[data-price]"));
const actualPriceButton = $("actualPriceButton");
const actualPriceValue = $("actualPriceValue");
const dexscreenerLink = $("dexscreenerLink");

const totalFeePool = {
  usdc: FEE_POOL.historicalUsdc + FEE_POOL.unclaimedUsdc,
  vult: FEE_POOL.historicalVult + FEE_POOL.unclaimedVult,
};

const historicalFeePool = {
  usdc: FEE_POOL.historicalUsdc,
  vult: FEE_POOL.historicalVult,
};

const activeFeePool = {
  usdc: FEE_POOL.unclaimedUsdc,
  vult: FEE_POOL.unclaimedVult,
};

const countUpAnimations = new WeakMap();
let liveVultPrice = DEFAULTS.customPrice;

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function numberFromText(text) {
  const parsed = Number(String(text ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function setCountedText(id, value, formatter, { animate = false, fromZero = false } = {}) {
  const element = $(id);
  if (!element) return;

  const nextText = formatter(value);
  const existingFrame = countUpAnimations.get(element);

  if (existingFrame) {
    cancelAnimationFrame(existingFrame);
    countUpAnimations.delete(element);
  }

  if (!animate || prefersReducedMotion()) {
    element.textContent = nextText;
    return;
  }

  const startValue = fromZero ? 0 : numberFromText(element.textContent);
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / COUNT_UP_DURATION_MS);
    const currentValue = startValue + (value - startValue) * easeOutCubic(progress);
    element.textContent = formatter(currentValue);

    if (progress < 1) {
      countUpAnimations.set(element, requestAnimationFrame(tick));
      return;
    }

    element.textContent = nextText;
    countUpAnimations.delete(element);
  }

  element.textContent = formatter(startValue);
  countUpAnimations.set(element, requestAnimationFrame(tick));
}

function renderActualPriceButton(price = liveVultPrice) {
  if (!actualPriceValue) return;
  actualPriceValue.textContent = formatMoney(price, 4);
  actualPriceButton?.setAttribute("aria-label", `Use live VULT price ${formatMoney(price, 4)}`);
}

function safeNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const next = Number(normalized);
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

function formatFeeModelAmount(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInputPrice(price) {
  const fixed = price >= 1 ? price.toFixed(4) : price.toFixed(6);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

function uniswapPositionUrl(nftId) {
  return `${UNISWAP_POSITION_BASE_URL}/${nftId}`;
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

function setFeeModelNumber(id, value, symbol) {
  const element = $(id);
  if (!element) return;

  const formatted = formatFeeModelAmount(value);
  element.textContent = formatted;
  element.closest(".fee-asset")?.setAttribute("aria-label", `${formatted} ${symbol.toUpperCase()}`);
}

function renderFeeModel() {
  setFeeModelNumber("feeTotalUsdc", totalFeePool.usdc, "usdc");
  setFeeModelNumber("feeTotalVult", totalFeePool.vult, "vult");
  setFeeModelNumber("feeHistoricalUsdc", historicalFeePool.usdc, "usdc");
  setFeeModelNumber("feeHistoricalVult", historicalFeePool.vult, "vult");
  setFeeModelNumber("feeActiveUsdc", activeFeePool.usdc, "usdc");
  setFeeModelNumber("feeActiveVult", activeFeePool.vult, "vult");
}

function assetPair(usdc, vult) {
  return `
    <div class="asset-pair">
      <span class="asset-pill asset-pill-usdc">${tokenAmount(usdc, "usdc")}</span>
      <span class="asset-pill asset-pill-vult">${tokenAmount(vult, "vult")}</span>
    </div>
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
  const entryPrice = DEFAULTS.entryPrice;
  const customPrice = safeNumber(inputs.customPrice.value, DEFAULTS.customPrice);
  const allocation = investmentAmount / entryPrice;
  const share = allocation / TOTAL_INVESTOR_VULT;

  return {
    investmentAmount,
    entryPrice,
    customPrice,
    allocation,
    share,
    historicalFeeUsdc: historicalFeePool.usdc * share,
    historicalFeeVult: historicalFeePool.vult * share,
    activeFeeUsdc: activeFeePool.usdc * share,
    activeFeeVult: activeFeePool.vult * share,
    feeUsdc: totalFeePool.usdc * share,
    feeVult: totalFeePool.vult * share,
  };
}

function rowForPrice(price, state, label = null, isCustom = false) {
  const lp = lpTotalsAtPrice(price);
  const lpUsdc = lp.usdc * state.share;
  const lpVult = lp.vult * state.share;
  const lpValue = lpUsdc + lpVult * price;
  const historicalFeeValue = state.historicalFeeUsdc + state.historicalFeeVult * price;
  const activeFeeValue = state.activeFeeUsdc + state.activeFeeVult * price;
  const feeValue = state.feeUsdc + state.feeVult * price;
  const total = lpValue + feeValue;
  const activePosition = activePositionsAtPrice(price)[0] ?? null;

  return {
    label: label ?? formatMoney(price, 2),
    price,
    activePosition,
    lpUsdc,
    lpVult,
    lpValue,
    historicalFeeUsdc: state.historicalFeeUsdc,
    historicalFeeVult: state.historicalFeeVult,
    historicalFeeValue,
    activeFeeUsdc: state.activeFeeUsdc,
    activeFeeVult: state.activeFeeVult,
    activeFeeValue,
    feeUsdc: state.feeUsdc,
    feeVult: state.feeVult,
    feeValue,
    total,
    multiple: state.investmentAmount > 0 ? total / state.investmentAmount : 0,
    isCustom,
  };
}

function renderSetupPreview(state, animation = {}) {
  $("setupAllocation").innerHTML = tokenAmount(state.allocation, "vult", 2);
  $("setupShare").textContent = `${(state.share * 100).toFixed(6)}% of investor LP`;
  setCountedText("setupCapital", state.investmentAmount, (value) => formatMoney(value), animation);
  $("setupFees").innerHTML = `${tokenAmount(state.feeUsdc, "usdc")}<span class="asset-separator">+</span>${tokenAmount(state.feeVult, "vult")}`;
}

function renderSummary(state, animation = {}) {
  const current = rowForPrice(state.customPrice, state, "Custom", true);
  const usdcDollar = current.lpUsdc;
  const vultDollar = current.lpVult * state.customPrice;
  const lpDollar = usdcDollar + vultDollar;
  const usdcPct = lpDollar > 0 ? (usdcDollar / lpDollar) * 100 : 0;
  const vultPct = lpDollar > 0 ? 100 - usdcPct : 0;

  setCountedText("activePrice", state.customPrice, (value) => formatMoney(value, 4), animation);
  setCountedText("currentTotal", current.total, (value) => formatMoney(value), animation);
  setCountedText("currentLpValue", current.lpValue, (value) => formatMoney(value), animation);
  $("lpBreakdown").innerHTML = `${tokenAmount(current.lpUsdc, "usdc")}<span class="asset-separator">·</span>${tokenAmount(current.lpVult, "vult")}`;
  $("allocation").innerHTML = tokenAmount(state.allocation, "vult");
  $("share").textContent = `${(state.share * 100).toFixed(6)}% of investor LP`;
  setCountedText("feeValue", current.feeValue, (value) => formatMoney(value), animation);
  $("feeSplit").innerHTML = `${tokenAmount(state.feeUsdc, "usdc")}<span class="asset-separator">·</span>${tokenAmount(state.feeVult, "vult")}`;
  $("barUsdc").style.width = `${usdcPct.toFixed(2)}%`;
  $("barVult").style.width = `${vultPct.toFixed(2)}%`;
  $("barUsdc").setAttribute("aria-label", `USDC ${usdcPct.toFixed(1)}% of LP composition`);
  $("barVult").setAttribute("aria-label", `VULT ${vultPct.toFixed(1)}% of LP composition`);
  $("compositionRatio").innerHTML = `${compositionControl(usdcPct, current.lpUsdc, usdcDollar, "usdc")}${compositionControl(vultPct, current.lpVult, vultDollar, "vult")}`;
}

function renderTable(state) {
  const resultsBody = $("resultsBody");
  if (!resultsBody) return;

  const rows = [
    rowForPrice(state.customPrice, state, formatMoney(state.customPrice, 4), true),
    ...SCENARIOS.map((price) => rowForPrice(price, state)),
  ];

  resultsBody.innerHTML = rows
    .map(
      (row) => `
        <tr class="scenario-row ${row.isCustom ? "row-custom" : ""}"${row.activePosition ? ` data-nft-id="${row.activePosition.nftId}"` : ""}>
          <td data-label="VULT price">
            <div class="cell-price ${row.isCustom ? "is-selected" : ""}">
              <span class="price-marker">
                ${tokenIcon("vult")}
                <strong>${row.label}</strong>
              </span>
            </div>
          </td>
          <td data-label="Active LP range">
            ${renderActiveRangeCell(row.price)}
          </td>
          <td data-label="LP position (no fees)">
            <div class="cell-lp-position">
              <strong>${formatMoney(row.lpValue)}</strong>
              ${assetPair(row.lpUsdc, row.lpVult)}
            </div>
          </td>
          <td data-label="Historical fees (pool-level)">
            <div class="cell-fee-detail cell-fee-historical">
              <strong>${formatMoney(row.historicalFeeValue)}</strong>
              ${assetPair(row.historicalFeeUsdc, row.historicalFeeVult)}
            </div>
          </td>
          <td data-label="Active NFT fees (unclaimed)">
            <div class="cell-fee-detail cell-fee-active">
              <strong>${formatMoney(row.activeFeeValue)}</strong>
              ${assetPair(row.activeFeeUsdc, row.activeFeeVult)}
            </div>
          </td>
          <td data-label="Total">
            <div class="cell-total">
              <strong>${formatMoney(row.total)}</strong>
              <small class="scenario-multiple">${row.multiple.toFixed(2)}x</small>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function activePositionsAtPrice(price) {
  return POSITIONS.filter((position) => price >= position.low && price < position.high);
}

function renderActiveRangeCell(price) {
  const activePositions = activePositionsAtPrice(price);

  if (!activePositions.length) {
    return `
      <span class="active-range-empty">
        No active investor range
      </span>
    `;
  }

  return `
    <div class="active-ranges">
      ${activePositions
        .map(
          (position) => `
            <a
              class="active-range-link"
              href="${uniswapPositionUrl(position.nftId)}"
              target="_blank"
              rel="noopener noreferrer"
              data-nft-id="${position.nftId}"
              aria-label="Open Uniswap NFT ${position.nftId} for ${position.range}"
            >
              <span class="active-range-main">
                <strong>${position.range}</strong>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3h7v7M13 3 5 11M11 13H3V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <small>NFT #${position.nftId}</small>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRangeViz(state) {
  const rangeViz = $("rangeViz");
  if (!rangeViz) return;

  const price = state.customPrice;

  const rows = POSITIONS.map((position) => {
    const inRange = price >= position.low && price < position.high;
    const rangeAmounts = amountsAtPrice(position, price);
    const rangeUsdc = rangeAmounts.usdc * state.share;
    const rangeVult = rangeAmounts.vult * state.share;
    const fullValue = rangeAmounts.usdc + rangeAmounts.vult * price;
    const shareValue = rangeUsdc + rangeVult * price;
    const unclaimedFeeUsdc = position.unclaimedFeeUsdc ?? 0;
    const unclaimedFeeVult = position.unclaimedFeeVult ?? 0;
    const unclaimedFeeValue = unclaimedFeeUsdc + unclaimedFeeVult * price;
    const activeFeeShareUsdc = unclaimedFeeUsdc * state.share;
    const activeFeeShareVult = unclaimedFeeVult * state.share;
    const activeFeeShareValue = activeFeeShareUsdc + activeFeeShareVult * price;
    const hasActiveFees = unclaimedFeeValue > 0.000001;
    const hasActiveFeeShare = activeFeeShareValue > 0.000001;
    const isLiveActiveRange = inRange && Math.abs(price - liveVultPrice) < 0.000001;
    const activeRangeLabel = isLiveActiveRange ? "Live active NFT" : "Active at selected price";

    return `
      <a
        class="range-row ${inRange ? "is-current" : ""}"
        href="${uniswapPositionUrl(position.nftId)}"
        target="_blank"
        rel="noopener noreferrer"
        data-nft-id="${position.nftId}"
        aria-label="Open Uniswap NFT ${position.nftId} for ${position.range}${inRange ? `, ${activeRangeLabel}` : ""}, NFT liquidity ${formatMoney(fullValue)}, active NFT fees ${formatMoney(unclaimedFeeValue)}, your liquidity share ${formatMoney(shareValue)}, your active fee share ${formatMoney(activeFeeShareValue)}"
      >
        <div class="range-cell range-main" data-label="LP range">
          <span class="range-range-card">
            <span class="active-range-main">
              <strong>${position.range}</strong>
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3h7v7M13 3 5 11M11 13H3V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <small>NFT #${position.nftId}</small>
            ${inRange ? `
              <span class="range-live-badge ${isLiveActiveRange ? "is-live" : "is-selected"}">
                ${tokenIcon("vult")}
                <span>${activeRangeLabel}</span>
              </span>
            ` : ""}
          </span>
        </div>
        <div class="range-cell range-depth" data-label="Range depth">
          <span class="asset-pill asset-pill-vult">${tokenAmount(position.vult, "vult", 0)}</span>
        </div>
        <div class="range-cell range-stat range-full" data-label="NFT liquidity">
          <strong>${formatMoney(fullValue)}</strong>
          ${assetPair(rangeAmounts.usdc, rangeAmounts.vult)}
        </div>
        <div class="range-cell range-stat range-fees ${hasActiveFees ? "has-value" : "is-zero"}" data-label="Active NFT fees">
          <strong>${formatMoney(unclaimedFeeValue)}</strong>
          ${assetPair(unclaimedFeeUsdc, unclaimedFeeVult)}
        </div>
        <div class="range-cell range-stat range-assets" data-label="Your liquidity share">
          <strong>${formatMoney(shareValue)}</strong>
          ${assetPair(rangeUsdc, rangeVult)}
        </div>
        <div class="range-cell range-stat range-fee-share ${hasActiveFeeShare ? "has-value" : "is-zero"}" data-label="Your active fee share">
          <strong>${formatMoney(activeFeeShareValue)}</strong>
          ${assetPair(activeFeeShareUsdc, activeFeeShareVult)}
        </div>
      </a>
    `;
  }).join("");

  rangeViz.innerHTML = `
    <div class="range-table-head" aria-hidden="true">
      <span>LP range</span>
      <span>Range depth</span>
      <span>NFT liquidity<small>LP only</small></span>
      <span>Active NFT fees<small>Unclaimed</small></span>
      <span>Your liquidity share<small>No fees</small></span>
      <span>Your active fee share<small>No historical</small></span>
    </div>
    ${rows}
  `;
}

function renderActiveShortcut(price) {
  priceButtons.forEach((button) => {
    const isActive = Math.abs(Number(button.dataset.price) - price) < 0.000001;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const isLiveActive = Math.abs(price - liveVultPrice) < 0.000001;
  actualPriceButton.classList.toggle("is-active", isLiveActive);
  actualPriceButton.setAttribute("aria-pressed", String(isLiveActive));
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

function setNftPreview(nftId = null) {
  const previewId = nftId ? String(nftId) : "";

  document.querySelectorAll("[data-nft-id]").forEach((element) => {
    element.classList.toggle("is-previewed", Boolean(previewId) && element.dataset.nftId === previewId);
  });
}

function bindRangePreviewInteractions() {
  const root = document.querySelector("main");
  if (!root) return;

  root.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-nft-id]");
    if (target && root.contains(target)) {
      setNftPreview(target.dataset.nftId);
    }
  });

  root.addEventListener("pointerout", (event) => {
    const previousTarget = event.target.closest("[data-nft-id]");
    const nextTarget = event.relatedTarget?.closest?.("[data-nft-id]");

    if (previousTarget && previousTarget.dataset.nftId !== nextTarget?.dataset.nftId) {
      setNftPreview();
    }
  });

  root.addEventListener("focusin", (event) => {
    const target = event.target.closest("[data-nft-id]");
    if (target && root.contains(target)) {
      setNftPreview(target.dataset.nftId);
    }
  });

  root.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget?.closest?.("[data-nft-id]");
    if (!nextTarget || !root.contains(nextTarget)) {
      setNftPreview();
    }
  });
}

function pickBestPricePair(data) {
  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
  return pairs
    .filter((pair) => pair.chainId === "ethereum" && Number(pair.priceUsd) > 0)
    .sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0];
}

async function useActualPrice({ silent = false, animate = false, fromZero = false } = {}) {
  actualPriceButton.classList.add("is-loading");
  actualPriceButton.disabled = true;

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

    liveVultPrice = price;
    renderActualPriceButton(liveVultPrice);
    inputs.customPrice.value = formatInputPrice(price);
    if (pair.url) {
      dexscreenerLink.href = pair.url;
    }
    update({ animate, fromZero });
    return true;
  } catch (error) {
    if (!silent) {
      inputs.customPrice.focus();
    }
    return false;
  } finally {
    actualPriceButton.classList.remove("is-loading");
    actualPriceButton.disabled = false;
  }
}

function update({ animate = false, fromZero = false } = {}) {
  const state = getState();
  const animation = { animate, fromZero };
  renderSetupPreview(state, animation);
  renderSummary(state, animation);
  renderTable(state);
  renderRangeViz(state);
  renderActiveShortcut(state.customPrice);
}

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", update);
  input.addEventListener("focus", () => {
    try {
      input.select();
    } catch {
      // Number inputs do not support text selection in every browser/runtime.
    }
  });
});

priceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    inputs.customPrice.value = button.dataset.price;
    update({ animate: true });
  });
});

actualPriceButton.addEventListener("click", () => useActualPrice({ animate: true }));

$("resetButton").addEventListener("click", () => {
  inputs.investmentAmount.value = DEFAULTS.investmentAmount;
  inputs.entryPrice.value = DEFAULTS.entryPrice.toFixed(2);
  inputs.customPrice.value = DEFAULTS.customPrice;
  dexscreenerLink.href = DEXSCREENER_CHART_URL;
  update({ animate: true, fromZero: true });
});

bindCompositionInteractions();
bindRangePreviewInteractions();
renderFeeModel();
renderActualPriceButton();

async function initialize() {
  const loadedActualPrice = await useActualPrice({ silent: true, animate: true, fromZero: true });
  if (!loadedActualPrice) {
    update({ animate: true, fromZero: true });
  }
}

initialize();
