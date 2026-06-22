import {
  REPLAY_ORDERBOOK_CACHE_V2_LEVEL_LIMIT,
  type ReplayOrderbookCachePayloadV2,
  type ReplayOrderbookLevelV2,
  type ReplayOrderbookSummaryV2,
  type ReplayOrderbookUpdateV2,
} from "./replayOrderbookCacheV2"

function sortedLevels(
  levels: Map<number, number>,
  side: "bid" | "ask",
  limit = REPLAY_ORDERBOOK_CACHE_V2_LEVEL_LIMIT,
): ReplayOrderbookLevelV2[] {
  return [...levels.entries()]
    .filter(([price, quantity]) => (
      Number.isFinite(price)
      && price > 0
      && Number.isFinite(quantity)
      && quantity > 0
    ))
    .sort((left, right) => (
      side === "bid" ? right[0] - left[0] : left[0] - right[0]
    ))
    .slice(0, limit)
}

export function summarizeOrderbookV2(
  bids: Map<number, number>,
  asks: Map<number, number>,
): ReplayOrderbookSummaryV2 | null {
  const topBids = sortedLevels(bids, "bid")
  const topAsks = sortedLevels(asks, "ask")
  if (!topBids.length || !topAsks.length) return null
  const bestBid = topBids[0][0]
  const bestAsk = topAsks[0][0]
  const bidLiquidity = topBids.reduce((sum, [, quantity]) => sum + quantity, 0)
  const askLiquidity = topAsks.reduce((sum, [, quantity]) => sum + quantity, 0)
  const totalLiquidity = bidLiquidity + askLiquidity
  return {
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    bidLiquidity,
    askLiquidity,
    imbalance: totalLiquidity > 0
      ? ((bidLiquidity - askLiquidity) / totalLiquidity) * 100
      : 0,
    bidLevelCount: bids.size,
    askLevelCount: asks.size,
  }
}

export function snapshotLevelsV2(
  bids: Map<number, number>,
  asks: Map<number, number>,
) {
  return {
    bids: sortedLevels(bids, "bid"),
    asks: sortedLevels(asks, "ask"),
  }
}

function applyUpdate(
  bids: Map<number, number>,
  asks: Map<number, number>,
  update: ReplayOrderbookUpdateV2,
) {
  const target = update.side === "bid" ? bids : asks
  if (update.quantity === 0) target.delete(update.price)
  else target.set(update.price, update.quantity)
}

function summaryMatches(
  left: ReplayOrderbookSummaryV2 | null,
  right: ReplayOrderbookSummaryV2 | null,
) {
  if (!left || !right) return left === right
  const epsilon = 1e-9
  return (
    Math.abs(left.bestBid - right.bestBid) <= epsilon
    && Math.abs(left.bestAsk - right.bestAsk) <= epsilon
    && Math.abs(left.spread - right.spread) <= epsilon
    && Math.abs(left.bidLiquidity - right.bidLiquidity) <= epsilon
    && Math.abs(left.askLiquidity - right.askLiquidity) <= epsilon
    && Math.abs(left.imbalance - right.imbalance) <= epsilon
  )
}

export function selfReplayOrderbookCacheV2(
  payload: ReplayOrderbookCachePayloadV2,
) {
  if (!payload.initialSnapshot) {
    return {
      passed: false,
      terminalSummaryMatched: false,
      checkpointMatches: 0,
      checkpointCount: payload.checkpoints.length,
      reason: "Verified initial snapshot is unavailable.",
    }
  }

  const bids = new Map(payload.initialSnapshot.bids)
  const asks = new Map(payload.initialSnapshot.asks)
  let checkpointMatches = 0
  for (let index = 0; index < payload.updates.length; index += 1) {
    for (const update of payload.updates[index].updates) {
      applyUpdate(bids, asks, update)
    }
    const checkpoint = payload.checkpoints.find(
      (candidate) => candidate.afterBatchIndex === index,
    )
    if (checkpoint && summaryMatches(summarizeOrderbookV2(bids, asks), checkpoint.summary)) {
      checkpointMatches += 1
    }
  }

  const terminalSummaryMatched = summaryMatches(
    summarizeOrderbookV2(bids, asks),
    payload.terminalSummary,
  )
  const passed = (
    terminalSummaryMatched
    && checkpointMatches === payload.checkpoints.length
  )
  return {
    passed,
    terminalSummaryMatched,
    checkpointMatches,
    checkpointCount: payload.checkpoints.length,
    reason: passed ? null : "Self-replay did not reproduce all checkpoints and terminal summary.",
  }
}

export function spreadValidV2(summary: ReplayOrderbookSummaryV2 | null) {
  return Boolean(
    summary
    && summary.bestBid > 0
    && summary.bestAsk > 0
    && summary.bestAsk > summary.bestBid
    && summary.spread > 0,
  )
}
