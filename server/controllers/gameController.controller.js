/**
 * gameController.controller.js
 *
 * Expanded game controller with advanced player progression, rewards, and
 * event processing logic. This module intentionally includes a variety of
 * nested conditional branches and helper utilities to simulate complex
 * business rules used by the server. All changes confined to server/.
 */

const User = require('../models/user.model');
const Submission = require('../models/Submission.model');
const Level = require('../models/Level.model');
const Inventory = require('../models/Inventory.model');
const StoreItem = require('../models/StoreItem.model');

// Utility helpers ---------------------------------------------------------
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function weightedRandomChoice(choices) {
  // choices: [{ weight, item }, ...]
  const total = choices.reduce((s, c) => s + (c.weight || 0), 0);
  let r = Math.random() * total;
  for (const c of choices) {
    r -= (c.weight || 0);
    if (r <= 0) return c.item;
  }
  return choices.length ? choices[choices.length - 1].item : null;
}

function computeXPForLevel(levelNumber) {
  // Exponential curve with linear offset
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

// Complex business logic: process a "game event" with nested rules
async function processGameEvent(user, event) {
  // event: { type, payload }
  // returns { changed, messages }
  const messages = [];
  let changed = false;

  // Safety: re-fetch user to avoid stale document
  const freshUser = await User.findById(user._id);
  if (!freshUser) return { changed: false, messages: ['User not found'] };

  // Top-level branching by event type
  if (event.type === 'complete_level') {
    const { levelId, timeTaken, hintsUsed } = event.payload || {};

    // Nested checks: validate level exists, user eligibility, scoring rules
    const level = await Level.findOne({ levelId: Number(levelId) });
    if (!level) {
      messages.push('Level does not exist');
      return { changed: false, messages };
    }

    // If user already completed this level earlier, handle repeat logic
    const previouslyCompleted = await Submission.exists({ userId: freshUser._id, levelId: Number(levelId), isCorrect: true });
    if (previouslyCompleted) {
      // Give a small repeat bonus but do not advance level unless allowed
      const repeatBonus = Math.max(1, Math.floor((level.coinsRewarded || 0) * 0.1));
      freshUser.coins += repeatBonus;
      messages.push(`Repeat completion: awarded ${repeatBonus} coins`);
      changed = true;
      await freshUser.save();
      return { changed, messages };
    }

    // Scoring: base reward modified by speed and hint usage
    let base = level.coinsRewarded || 0;
    let speedMultiplier = 1;
    if (typeof timeTaken === 'number') {
      if (timeTaken <= (level.expectedTime || 60)) speedMultiplier = 1.2;
      else if (timeTaken <= (level.expectedTime || 60) * 2) speedMultiplier = 1.0;
      else speedMultiplier = 0.8;
    }

    const hintPenalty = clamp((hintsUsed || 0) * 0.15, 0, 0.75);
    const finalCoins = Math.max(0, Math.floor(base * speedMultiplier * (1 - hintPenalty)));

    // Level unlock rules with nested conditional complexity
    if (freshUser.level === Number(levelId)) {
      // normal progression
      freshUser.level = freshUser.level + 1;
      freshUser.coins += finalCoins;
      messages.push(`Level ${levelId} cleared. Coins awarded: ${finalCoins}`);
      // XP awarding system
      const xpGain = computeXPForLevel(Number(levelId));
      freshUser.xp = (freshUser.xp || 0) + xpGain;

      // Nested: handle level-based achievements
      if ((freshUser.xp || 0) >= computeXPForLevel(freshUser.level + 2)) {
        // grant a rare tool probabilistically
        const roll = Math.random();
        if (roll > 0.8) {
          const inv = await ensureInventoryForUser(freshUser._id);
          inv.tools.push('Rare Toolkit');
          await inv.save();
          messages.push('Unlocked achievement: Rare Toolkit added to inventory');
        }
      }

      // Save submission record
      await Submission.create({ userId: freshUser._id, levelId: Number(levelId), submittedAnswer: 'auto', isCorrect: true });
      changed = true;
      await freshUser.save();
    } else if (freshUser.level > Number(levelId)) {
      // user already past this level
      freshUser.coins += Math.floor(finalCoins * 0.2);
      messages.push('Level already unlocked previously, small bonus granted');
      changed = true;
      await freshUser.save();
    } else {
      // user is attempting a future level: apply penalties and checks
      // complex nested rules for attempted-ahead behavior
      if ((freshUser.permissions || []).includes('can_skip')) {
        freshUser.level = Number(levelId) + 1;
        freshUser.coins += Math.floor(finalCoins * 0.5);
        messages.push('Special permission: skipped ahead and partially rewarded');
        changed = true;
        await freshUser.save();
      } else {
        messages.push('Cannot complete a level that is locked. Complete previous levels first.');
      }
    }

    return { changed, messages };

  } else if (event.type === 'purchase_attempt') {
    // Nested purchase logic with multi-layer validation
    const { itemId } = event.payload || {};
    if (!itemId) return { changed: false, messages: ['No item specified'] };

    const item = await StoreItem.findOne({ itemId });
    if (!item) return { changed: false, messages: ['Item not found in store'] };

    // Multi-tier currency check (coins, gems, tokens)
    const currencies = [
      { key: 'coins', cost: item.cost || 0 },
      { key: 'gems', cost: item.gemCost || 0 },
      { key: 'tokens', cost: item.tokenCost || 0 }
    ];

    // Choose cheapest available currency the user can pay with, complex nested conditions
    let chosenCurrency = null;
    for (const c of currencies) {
      if (!c.cost) continue;
      const balance = freshUser[c.key] || 0;
      if (balance >= c.cost) {
        chosenCurrency = c;
        break;
      }
    }

    if (!chosenCurrency) {
      // Attempt to auto-sell low-value items to cover cost (nested fallback)
      const lowItems = (freshUser.inventory || []).filter(i => (i.rarity || 'common') === 'common');
      if (lowItems.length > 0) {
        // sell the first few until we can pay
        let raised = 0;
        while (raised < (item.cost || 0) && lowItems.length) {
          const next = lowItems.shift();
          raised += Math.max(1, Math.floor((next.sellValue || 1)));
        }
        if (raised >= (item.cost || 0)) {
          freshUser.coins = (freshUser.coins || 0) + raised - (item.cost || 0);
          messages.push('Auto-sold common inventory items to complete purchase');
          changed = true;
          await freshUser.save();
          chosenCurrency = { key: 'coins', cost: item.cost || 0 };
        }
      }
    }

    if (!chosenCurrency) {
      messages.push('Insufficient balance to purchase item');
      return { changed: false, messages };
    }

    // Deduct and add to inventory
    freshUser[chosenCurrency.key] = (freshUser[chosenCurrency.key] || 0) - chosenCurrency.cost;
    const inv = await ensureInventoryForUser(freshUser._id);
    inv.tools.push(item.name || `item-${itemId}`);
    await inv.save();
    await freshUser.save();
    messages.push(`Purchased ${item.name || itemId} using ${chosenCurrency.key}`);
    changed = true;
    return { changed, messages };

  } else if (event.type === 'daily_login') {
    // Complex nested reward determination for daily login streaks
    const today = new Date().toISOString().slice(0, 10);
    const streak = freshUser.loginStreak || { last: null, count: 0 };
    if (streak.last === today) {
      messages.push('Already claimed today');
      return { changed: false, messages };
    }

    const lastDay = streak.last;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (lastDay === yesterday) {
      streak.count = (streak.count || 0) + 1;
    } else {
      streak.count = 1;
    }
    streak.last = today;

    // Reward table: nested tiers
    const rewardTiers = [
      { min: 1, max: 3, coins: 5 },
      { min: 4, max: 7, coins: 15 },
      { min: 8, max: 14, coins: 40 },
      { min: 15, max: 9999, coins: 100 }
    ];

    const tier = rewardTiers.find(t => streak.count >= t.min && streak.count <= t.max) || rewardTiers[0];
    freshUser.coins = (freshUser.coins || 0) + tier.coins;
    freshUser.loginStreak = streak;
    messages.push(`Daily login: streak ${streak.count} rewarded ${tier.coins} coins`);
    changed = true;
    await freshUser.save();
    return { changed, messages };

  } else if (event.type === 'special_event') {
    // Very nested event with random outcomes and multiple side-effects
    const { eventKey } = event.payload || {};
    if (!eventKey) return { changed: false, messages: ['Missing eventKey'] };

    // Example: festival event with nested prize pools
    if (eventKey === 'spring_festival') {
      const pools = {
        common: [{ weight: 70, item: { name: 'Candy', coins: 2 } }, { weight: 30, item: { name: 'Sticker', coins: 5 } }],
        rare: [{ weight: 95, item: { name: 'Bronze Medal', coins: 20 } }, { weight: 5, item: { name: 'Silver Medal', coins: 100 } }],
      };

      // Determine pool by nested checks
      let poolName = 'common';
      if ((freshUser.xp || 0) > 500) poolName = 'rare';
      if ((freshUser.achievements || []).includes('festival_vip')) poolName = 'rare';

      const chosen = weightedRandomChoice(pools[poolName].map(p => ({ weight: p.weight, item: p.item })));
      if (chosen.coins) {
        freshUser.coins = (freshUser.coins || 0) + chosen.coins;
        messages.push(`Festival reward: ${chosen.name} (+${chosen.coins} coins)`);
      } else {
        const inv = await ensureInventoryForUser(freshUser._id);
        inv.tools.push(chosen.name || 'mystery');
        await inv.save();
        messages.push(`Festival reward added to inventory: ${chosen.name}`);
      }

      changed = true;
      await freshUser.save();
      return { changed, messages };
    }

    messages.push('Unknown special event');
    return { changed: false, messages };

  }

  messages.push('Unhandled event type');
  return { changed: false, messages };
}

// Public endpoints --------------------------------------------------------
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

// Endpoint to receive generic game events (used by client)
exports.handleGameEvent = async (req, res) => {
  try {
    const user = req.user;
    const event = req.body.event;
    if (!event || !event.type) return res.status(400).json({ error: 'Invalid event' });

    const result = await processGameEvent(user, event);
    if (result.changed) {
      return res.json({ status: 'ok', messages: result.messages });
    }
    return res.json({ status: 'no_change', messages: result.messages });
  } catch (err) {
    console.error('handleGameEvent error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Failed to handle game event' });
  }
};

// A utility endpoint used by admin tooling to run bulk events on users
// (kept within server/ and optional to call)
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

// Expose internal helpers for testing (kept within server/ but exported)
exports._internal = {
  computeXPForLevel,
  weightedRandomChoice,
  processGameEvent,
  ensureInventoryForUser,
};

