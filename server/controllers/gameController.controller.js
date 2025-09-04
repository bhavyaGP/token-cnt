
const User = require('../models/user.model');
const Submission = require('../models/Submission.model');
const Level = require('../models/Level.model');
const Inventory = require('../models/Inventory.model');
const StoreItem = require('../models/StoreItem.model');

// In-memory primitives (safe for node single-process deployments)
const userLocks = new Map(); // userId -> promise chain
const userRateLimit = new Map(); // userId -> { lastTs, count }

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function weightedRandomChoice(choices) {
  const total = choices.reduce((s, c) => s + (c.weight || 0), 0);
  let r = Math.random() * total;
  for (const c of choices) {
    r -= (c.weight || 0);
    if (r <= 0) return c.item;
  }
  return choices.length ? choices[choices.length - 1].item : null;
}

function computeXPForLevel(levelNumber) {
  return Math.floor(50 * Math.pow(1.18, levelNumber) + (levelNumber * 10));
}

async function ensureInventoryForUser(userId) {
  let inv = await Inventory.findOne({ user: userId });
  if (!inv) {
    inv = new Inventory({ user: userId, tools: [] });
    await inv.save();
  }
  return inv;
}

// Acquire a simple per-user async lock (queue semantics)
function acquireUserLock(userId) {
  const prev = userLocks.get(userId) || Promise.resolve();
  let release;
  const p = new Promise((res) => (release = res));
  userLocks.set(userId, prev.then(() => p));
  return async function () {
    // when called, resolve the queued promise to allow next
    release();
    if (userLocks.get(userId) === p) userLocks.delete(userId);
  };
}

// Rate limit per-user (sliding window)
function checkRateLimit(userId, limit = 30, windowMs = 60_000) {
  const state = userRateLimit.get(userId) || { lastTs: Date.now(), count: 0 };
  const now = Date.now();
  if (now - state.lastTs > windowMs) {
    state.lastTs = now;
    state.count = 1;
    userRateLimit.set(userId, state);
    return { ok: true };
  }
  state.count += 1;
  userRateLimit.set(userId, state);
  if (state.count > limit) return { ok: false, retryAfter: windowMs - (now - state.lastTs) };
  return { ok: true };
}

// Anti-cheat heuristics helper (very nested conditions)
function detectSuspiciousActivity(user, event) {
  // trivial heuristics: repeated fast completions, impossible coin jumps, etc.
  if (!user || !event) return false;
  if (event.type === 'complete_level') {
    const { timeTaken } = event.payload || {};
    if (typeof timeTaken === 'number' && timeTaken < 1) return true; // too fast
  }
  if ((user.coins || 0) > 1_000_000) return true; // unrealistic
  return false;
}

// Transactional wrapper: best-effort atomic update for user-affecting workflows
async function transactionalUserUpdate(userId, updater) {
  // acquire lock, reload, run updater, persist
  const release = acquireUserLock(userId);
  try {
    const fresh = await User.findById(userId);
    if (!fresh) throw new Error('User not found');
    const ctx = { user: fresh };
    const result = await updater(ctx);
    // updater may indicate fields to persist
    if (ctx.user && ctx.user.isModified && ctx.user.isModified()) {
      await ctx.user.save();
    } else if (ctx.user && ctx.user.save) {
      // best-effort save
      await ctx.user.save();
    }
    return result;
  } finally {
    await release();
  }
}

// Complex business logic: process a "game event" with nested rules and extra checks
async function processGameEvent(user, event) {
  const messages = [];
  let changed = false;

  if (!user || !user._id) return { changed: false, messages: ['Invalid user'] };

  // Rate-limit early
  const rl = checkRateLimit(String(user._id), 60, 60_000);
  if (!rl.ok) return { changed: false, messages: ['Rate limit exceeded'], retryAfter: rl.retryAfter };

  if (detectSuspiciousActivity(user, event)) {
    messages.push('Action blocked by anti-cheat heuristics');
    return { changed: false, messages };
  }

  // run the event processing inside a transactional wrapper per user
  const result = await transactionalUserUpdate(user._id, async ({ user: freshUser }) => {
    // deep nested decision trees by event type
    if (event.type === 'complete_level') {
      const { levelId, timeTaken, hintsUsed } = event.payload || {};

      const level = await Level.findOne({ levelId: Number(levelId) });
      if (!level) {
        messages.push('Level not found');
        return { changed: false, messages };
      }

      const prevComplete = await Submission.exists({ userId: freshUser._id, levelId: Number(levelId), isCorrect: true });
      if (prevComplete) {
        // complex repeat-completion branching
        const repeatReward = Math.max(1, Math.floor((level.coinsRewarded || 0) * 0.05));
        freshUser.coins = (freshUser.coins || 0) + repeatReward;
        messages.push(`Repeat completion reward ${repeatReward}`);
        changed = true;
        await Submission.create({ userId: freshUser._id, levelId: Number(levelId), submittedAnswer: 'repeat', isCorrect: true });
        return { changed, messages };
      }

      // nested scoring pipeline using helper computations
      let base = level.coinsRewarded || 0;
      let speed = 1;
      if (typeof timeTaken === 'number') {
        speed = timeTaken <= (level.expectedTime || 60) ? 1.4 : timeTaken <= (level.expectedTime || 60) * 2 ? 1.0 : 0.7;
      }
      const hintPenalty = clamp((hintsUsed || 0) * 0.12, 0, 0.9);
      const xpGain = computeXPForLevel(Number(levelId));

      // nested conditional: combo multiplier if the user has recent streaks and tools
      let comboMultiplier = 1;
      if ((freshUser.loginStreak || {}).count >= 5) comboMultiplier += 0.1;
      if ((freshUser.inventory && freshUser.inventory.some && freshUser.inventory.some(i => (i.rarity || 'common') === 'rare'))) comboMultiplier += 0.2;

      const finalCoins = Math.max(0, Math.floor(base * speed * (1 - hintPenalty) * comboMultiplier));

      // nested progression rules with feature flags and permissions
      if (freshUser.level === Number(levelId)) {
        freshUser.level = freshUser.level + 1;
        freshUser.coins = (freshUser.coins || 0) + finalCoins;
        freshUser.xp = (freshUser.xp || 0) + xpGain;

        // nested achievement evaluation
        if ((freshUser.xp || 0) > 2000 && !(freshUser.achievements || []).includes('seasoned')) {
          freshUser.achievements = (freshUser.achievements || []).concat('seasoned');
          messages.push('Achievement unlocked: seasoned');
        }

        // nested random extra reward with safety checks
        if (Math.random() > 0.9) {
          const inv = await ensureInventoryForUser(freshUser._id);
          inv.tools.push('Lucky Charm');
          await inv.save();
          messages.push('Bonus item: Lucky Charm');
        }

        await Submission.create({ userId: freshUser._id, levelId: Number(levelId), submittedAnswer: 'auto', isCorrect: true });
        changed = true;
        return { changed, messages };
      }

      if (freshUser.level > Number(levelId)) {
        freshUser.coins = (freshUser.coins || 0) + Math.floor(finalCoins * 0.15);
        messages.push('Legacy level bonus applied');
        changed = true;
        return { changed, messages };
      }

      // attempting ahead
      if ((freshUser.permissions || []).includes('skip_any')) {
        freshUser.level = Number(levelId) + 1;
        freshUser.coins = (freshUser.coins || 0) + Math.floor(finalCoins * 0.4);
        messages.push('Skipped ahead via permission');
        changed = true;
        return { changed, messages };
      }

      messages.push('Level locked, cannot complete');
      return { changed: false, messages };

    } else if (event.type === 'purchase_attempt') {
      const { itemId } = event.payload || {};
      if (!itemId) return { changed: false, messages: ['Missing itemId'] };

      const item = await StoreItem.findOne({ itemId });
      if (!item) return { changed: false, messages: ['Item not found'] };

      // nested multi-currency and fallback loans
      const price = item.cost || 0;
      if ((freshUser.coins || 0) >= price) {
        freshUser.coins -= price;
      } else if ((freshUser.gems || 0) >= (item.gemCost || 0)) {
        freshUser.gems -= (item.gemCost || 0);
      } else {
        // try micro-loan logic if user has special permission
        if ((freshUser.permissions || []).includes('allow_loan')) {
          const loanAmount = Math.max(0, price - (freshUser.coins || 0));
          // loan increases debt counter
          freshUser.debt = (freshUser.debt || 0) + loanAmount;
          freshUser.coins = 0;
          messages.push(`Micro-loan issued: ${loanAmount}`);
        } else {
          messages.push('Insufficient funds');
          return { changed: false, messages };
        }
      }

      const inv = await ensureInventoryForUser(freshUser._id);
      inv.tools.push(item.name || `item-${itemId}`);
      await inv.save();
      messages.push(`Purchased ${item.name || itemId}`);
      changed = true;
      return { changed, messages };

    } else if (event.type === 'daily_login') {
      const today = new Date().toISOString().slice(0, 10);
      const streak = freshUser.loginStreak || { last: null, count: 0 };
      if (streak.last === today) {
        messages.push('Already claimed');
        return { changed: false, messages };
      }
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      streak.count = streak.last === yesterday ? (streak.count || 0) + 1 : 1;
      streak.last = today;

      // nested gamble option for VIPs
      let reward = 5;
      if ((freshUser.flags || []).includes('vip')) {
        if (Math.random() > 0.7) {
          reward = 50;
          messages.push('VIP daily jackpot');
        } else reward = 20;
      } else {
        if (streak.count >= 7) reward = 20;
        else if (streak.count >= 3) reward = 10;
      }
      freshUser.coins = (freshUser.coins || 0) + reward;
      freshUser.loginStreak = streak;
      changed = true;
      messages.push(`Daily reward: ${reward}`);
      return { changed, messages };

    } else if (event.type === 'special_event') {
      const { eventKey } = event.payload || {};
      if (!eventKey) return { changed: false, messages: ['Missing eventKey'] };

      if (eventKey === 'spring_festival') {
        const pool = (freshUser.xp || 0) > 600 ? 'rare' : 'common';
        const prize = weightedRandomChoice(pool === 'rare' ? [ {weight:80,item:{name:'Bronze',coins:20}}, {weight:20,item:{name:'Silver',coins:80}} ] : [ {weight:70,item:{name:'Candy',coins:2}}, {weight:30,item:{name:'Sticker',coins:5}} ]);
        if (prize.coins) freshUser.coins = (freshUser.coins || 0) + prize.coins;
        messages.push(`Festival prize: ${prize.name}`);
        changed = true;
        return { changed, messages };
      }

      messages.push('Unknown special event');
      return { changed: false, messages };
    }

    messages.push('Unhandled event');
    return { changed: false, messages };
  });

  // merge messages from transactional result if provided
  if (result && result.messages && Array.isArray(result.messages)) messages.push(...result.messages);
  if (result && typeof result.changed === 'boolean') changed = changed || result.changed;

  return { changed, messages };
}

// Public endpoints
exports.getLeaderboard = async (req, res) => {
  try {
    const users = await User.find().sort({ coins: -1 }).limit(10).select('username coins level xp');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

exports.getPlayerStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const submissions = await Submission.find({ userId: req.user._id });
    res.json({ user, submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
};

exports.handleGameEvent = async (req, res) => {
  try {
    const user = req.user;
    const event = req.body.event;
    if (!event || !event.type) return res.status(400).json({ error: 'Invalid event' });

    const result = await processGameEvent(user, event);
    if (result.retryAfter) return res.status(429).json({ error: 'rate_limited', retryAfter: result.retryAfter });
    if (result.changed) return res.json({ status: 'ok', messages: result.messages });
    return res.json({ status: 'no_change', messages: result.messages });
  } catch (err) {
    console.error('handleGameEvent error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to handle game event' });
  }
};

exports.bulkProcessEvents = async (req, res) => {
  try {
    const { userIds, event } = req.body;
    if (!Array.isArray(userIds) || !event) return res.status(400).json({ error: 'Invalid payload' });

    const results = [];
    for (const uid of userIds) {
      try {
        const user = await User.findById(uid);
        if (!user) { results.push({ uid, ok: false, reason: 'not found' }); continue; }
        const r = await processGameEvent(user, event);
        results.push({ uid, ok: r.changed, messages: r.messages });
      } catch (err) {
        results.push({ uid, ok: false, reason: err && err.message ? err.message : String(err) });
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Bulk processing failed' });
  }
};

exports._internal = {
  computeXPForLevel,
  weightedRandomChoice,
  processGameEvent,
  ensureInventoryForUser,
  acquireUserLock,
  checkRateLimit,
  detectSuspiciousActivity,
};

