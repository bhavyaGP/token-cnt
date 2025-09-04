/**
 * advancedEvents.controller.js
 *
 * Provides a set of advanced event processing utilities and endpoints.
 * This file intentionally contains deep nested conditional logic, multiple
 * fallback strategies, and several helper utilities to simulate complex
 * server-side behaviors. No top-level mongoose requires to keep module load
 * safe in test environments; models should be passed into exported functions
 * or required lazily inside functions when needed.
 */

// Helpers
function safeParseInt(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
}

function nowIsoDate() {
  return new Date().toISOString();
}

function toSeconds(ms) {
  return Math.floor(ms / 1000);
}

function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (err) {
    return Object.assign({}, obj);
  }
}

// Complex nested evaluation function: decide reward multipliers
function determineRewardMultiplier(context) {
  // context: { difficulty, streak, bonusActive, userFlags }
  let multiplier = 1;

  // base multiplier from difficulty
  if (context.difficulty === 'hard') multiplier *= 1.5;
  else if (context.difficulty === 'medium') multiplier *= 1.2;
  else multiplier *= 1.0;

  // nested streak adjustments
  if (context.streak && context.streak.count) {
    if (context.streak.count >= 30) multiplier *= 2.0;
    else if (context.streak.count >= 7) multiplier *= 1.3;
    else if (context.streak.count >= 3) multiplier *= 1.1;
  }

  // feature flags and bonuses
  if (context.bonusActive) multiplier *= 1.25;

  // user-specific flags (deep nested conditions)
  if (Array.isArray(context.userFlags)) {
    if (context.userFlags.includes('vip')) {
      multiplier *= 1.5;
      if (context.userFlags.includes('early_supporter')) {
        // extra nested bonus for combined flags
        multiplier *= 1.2;
      }
    } else if (context.userFlags.includes('beta_tester')) {
      multiplier *= 1.15;
    }
  }

  // clamp multiplier
  return Math.max(0.5, Math.min(5.0, multiplier));
}

// Simple in-memory cache for recent computations
const recentOutcomeCache = new Map(); // key -> { outcome, ts }

// Cache purge utility (keeps memory bounded)
function purgeCacheOlderThan(ms) {
  const now = Date.now();
  for (const [k, v] of recentOutcomeCache.entries()) {
    if (now - (v.ts || 0) > ms) recentOutcomeCache.delete(k);
  }
}

// Call periodically in-process (best-effort)
setInterval(() => purgeCacheOlderThan(5 * 60 * 1000), 60 * 1000);

// Retry/backoff helper for flaky operations (e.g., external LLM calls)
async function retryWithBackoff(fn, attempts = 3, baseDelay = 200) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = baseDelay * Math.pow(2, i) + Math.floor(Math.random() * 50);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// Simple rule engine: accepts rules and evaluates them with nested precedence
function evaluateRules(rules, context) {
  // rules: [{ when: ctx => bool, then: ctx => ({pass:bool, data}) }, ...]
  for (const r of rules) {
    try {
      if (r.when(context)) {
        const out = r.then(context);
        if (out && out.pass) return out;
      }
    } catch (err) {
      // ignore rule errors (non-fatal)
      console.warn('Rule evaluation error', err && err.message ? err.message : err);
    }
  }
  return { pass: false };
}

// Complex event synthesizer: combine many inputs to produce a result
async function synthesizeEventOutcome({ user, eventPayload, ctx }) {
  // Intentionally complex nested logic
  const outcome = { success: false, changes: {}, msgs: [] };

  // Step 1: baseline checks
  if (!user) {
    outcome.msgs.push('Missing user');
    return outcome;
  }

  if (!eventPayload) {
    outcome.msgs.push('Missing event payload');
    return outcome;
  }

  // Step 2: parse payload
  const difficulty = eventPayload.difficulty || 'easy';
  const timeTaken = safeParseInt(eventPayload.timeTaken, 0);
  const hintsUsed = safeParseInt(eventPayload.hintsUsed, 0);

  // Step 3: compute context
  const computed = {
    difficulty,
    streak: user.loginStreak || { count: 0 },
    bonusActive: !!(user.activeBonus),
    userFlags: user.flags || []
  };

  // Check cache: combine userId + payload fingerprint
  const cacheKey = `${user._id || 'anon'}:${JSON.stringify(eventPayload)}`;
  const cached = recentOutcomeCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 60 * 1000) {
    // Return a cloned copy to avoid mutation by caller
    return deepClone(cached.outcome);
  }

  // Step 4: nested conditional reward calculation
  const rewardMultiplier = determineRewardMultiplier(computed);
  outcome.changes.multiplier = rewardMultiplier;

  // Complex nested scoring pipeline
  let baseReward = 10;

  if (difficulty === 'hard') baseReward = 100;
  else if (difficulty === 'medium') baseReward = 40;

  // penalty for hints
  let penaltyFactor = 1 - clampNumber((hintsUsed || 0) * 0.12, 0, 0.9);

  // time-based modifier (nested ranges)
  let timeModifier = 1;
  if (timeTaken > 0) {
    if (timeTaken <= 30) timeModifier = 1.3;
    else if (timeTaken <= 60) timeModifier = 1.1;
    else if (timeTaken <= 120) timeModifier = 1.0;
    else timeModifier = 0.85;
  }

  // final reward
  const finalReward = Math.max(0, Math.floor(baseReward * rewardMultiplier * timeModifier * penaltyFactor));
  outcome.changes.reward = finalReward;

  // Evaluate rule engine for special overrides (deep nested rules)
  const rules = [
    {
      when: (ctx) => ctx.userFlags.includes('double_weekend') && (new Date()).getDay() === 6,
      then: (ctx) => ({ pass: true, data: { rewardMultiplierOverride: 2 } })
    },
    {
      when: (ctx) => ctx.difficulty === 'hard' && ctx.streak.count > 10,
      then: (ctx) => ({ pass: true, data: { extraXP: 100 } })
    }
  ];

  const ruleResult = evaluateRules(rules, { ...computed });
  if (ruleResult.pass && ruleResult.data) {
    if (ruleResult.data.rewardMultiplierOverride) {
      outcome.changes.multiplier = outcome.changes.multiplier * ruleResult.data.rewardMultiplierOverride;
      outcome.msgs.push('Rule override applied: weekend double');
    }
    if (ruleResult.data.extraXP) {
      outcome.changes.extraXP = ruleResult.data.extraXP;
      outcome.msgs.push('Rule bonus: extra XP');
    }
  }

  // Step 5: side-effects nested rules
  if (finalReward > 0) {
    // conditional unlocking logic
    if ((user.xp || 0) > 1000 && (user.level || 0) < 10) {
      outcome.changes.levelBoost = 1;
      outcome.msgs.push('Level boost applied');
    }

    // nested chance to drop items
    const dropChance = Math.min(0.5, (finalReward / 500));
    if (Math.random() < dropChance) {
      outcome.changes.dropped = { name: 'Mystery Shard', qty: 1 };
      outcome.msgs.push('You found a Mystery Shard');
    }
  }

  // Step 6: mark success
  outcome.success = true;
  outcome.timestamp = nowIsoDate();

  // store in cache
  recentOutcomeCache.set(cacheKey, { outcome: deepClone(outcome), ts: Date.now() });
  return outcome;
}

// small clamp helper used above
function clampNumber(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Exported request handler factory (injections allowed for testability)
function makeAdvancedEventHandler({ UserModel, SubmissionModel, InventoryModel }) {
  return async function advancedEventHandler(req, res) {
    try {
      const user = await UserModel.findById(req.user._id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const payload = req.body.payload;
      const outcome = await synthesizeEventOutcome({ user: user.toObject(), eventPayload: payload, ctx: { req } });

      // Apply persistent changes in nested safe blocks
      if (outcome.success) {
        if (outcome.changes.reward) {
          user.coins = (user.coins || 0) + outcome.changes.reward;
        }

        if (outcome.changes.levelBoost) {
          user.level = (user.level || 0) + outcome.changes.levelBoost;
        }

        if (outcome.changes.dropped) {
          const inv = await InventoryModel.findOne({ user: user._id });
          if (!inv) {
            await InventoryModel.create({ user: user._id, tools: [outcome.changes.dropped.name] });
          } else {
            inv.tools.push(outcome.changes.dropped.name);
            await inv.save();
          }
        }

        // create a lightweight submission record (lazy error handling)
        try {
          await SubmissionModel.create({ userId: user._id, eventPayload: payload, result: outcome });
        } catch (err) {
          // non-fatal
          console.warn('Submission create failed', err && err.message ? err.message : err);
        }

        await user.save();
      }

      return res.json({ outcome });
    } catch (err) {
      console.error('advancedEventHandler error', err && err.stack ? err.stack : err);
      return res.status(500).json({ error: 'failed' });
    }
  };
}

module.exports = {
  makeAdvancedEventHandler,
  synthesizeEventOutcome,
  determineRewardMultiplier,
  clampNumber,
};
