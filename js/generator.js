/* ==========================================================================
   CY3ER-CAT — Password generator
   Uses the Web Crypto API (crypto.getRandomValues) with rejection sampling,
   so every character is uniformly random. No Math.random(), no network.
   ========================================================================== */
(function () {
  'use strict';

  var PL = window.PasswordLab = window.PasswordLab || {};

  var SETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?/'
  };

  var AMBIGUOUS = /[Il1O0o]/g;

  function randomInt(max) {
    if (max <= 0) return 0;

    var cryptoObject = window.crypto || window.msCrypto;
    var range = 4294967296; // 2^32
    var limit = Math.floor(range / max) * max;
    var buffer = new Uint32Array(1);
    var value;

    do {
      cryptoObject.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);

    return value % max;
  }

  function shuffle(items) {
    for (var i = items.length - 1; i > 0; i -= 1) {
      var j = randomInt(i + 1);
      var temporary = items[i];
      items[i] = items[j];
      items[j] = temporary;
    }

    return items;
  }

  function filterSet(value, excludeAmbiguous) {
    return excludeAmbiguous ? value.replace(AMBIGUOUS, '') : value;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  /**
   * Generate a password with at least one character from every selected set.
   * @param {Object} options
   * @param {number} options.length
   * @param {boolean} options.lower
   * @param {boolean} options.upper
   * @param {boolean} options.numbers
   * @param {boolean} options.symbols
   * @param {boolean} options.excludeAmbiguous
   * @returns {string|null}
   */
  function generate(options) {
    options = options || {};

    var length = clamp(parseInt(options.length, 10) || 20, 4, 128);
    var excludeAmbiguous = Boolean(options.excludeAmbiguous);

    var selected = [];

    if (options.lower) selected.push(filterSet(SETS.lower, excludeAmbiguous));
    if (options.upper) selected.push(filterSet(SETS.upper, excludeAmbiguous));
    if (options.numbers) selected.push(filterSet(SETS.numbers, excludeAmbiguous));
    if (options.symbols) selected.push(filterSet(SETS.symbols, excludeAmbiguous));

    selected = selected.filter(function (set) { return set.length > 0; });

    if (selected.length === 0) return null;

    var pool = selected.join('');
    var characters = [];

    // Guarantee representation from every selected character set.
    var guaranteed = Math.min(selected.length, length);
    for (var i = 0; i < guaranteed; i += 1) {
      characters.push(selected[i].charAt(randomInt(selected[i].length)));
    }

    while (characters.length < length) {
      characters.push(pool.charAt(randomInt(pool.length)));
    }

    return shuffle(characters).join('');
  }

  PL.generatePassword = generate;
})();
