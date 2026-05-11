# VULT LP calculator notes

- Fee model values must have one source of truth: `FEE_POOL` in `script.js`. The Fee model UI renders those values from JavaScript, so the displayed totals cannot drift from calculator math.
- Scenario totals include LP position value plus historical investor fees and current unclaimed active NFT fees.
- Investor LP ranges show NFT-level LP value and active NFT fees only. Historical fees are pool-level, so they are not assigned to individual range rows.
- Treasury LP remains excluded from investor calculations.
- Current verified investor LP range depth totals exactly 24,000,000 VULT.
- Default page input is 1,000 USD at a 0.10 USD entry price, which equals 10,000 VULT and a 0.041667% investor LP share.
- The main read path should stay obvious: enter investment, choose VULT price, then read total value as LP position plus historical and active fees.
