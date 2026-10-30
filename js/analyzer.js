/* ==========================================================================
   CY3ER-CAT — Password analysis engine
   Pure, synchronous, local. Nothing in this file touches the network,
   storage, or the console.
   ========================================================================== */
(function () {
  'use strict';

  var PL = window.PasswordLab = window.PasswordLab || {};

  var COMMON = new Set((PL.COMMON_PASSWORDS || []).map(function (p) {
    return p.toLowerCase();
  }));

  var COMMON_WORDS = PL.COMMON_WORDS || [];

  var LEET = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '+': 't'
  };

  var LEVELS = [
    { label: 'Very weak', hint: 'Instantly guessable' },
    { label: 'Weak', hint: 'Cracked in moments' },
    { label: 'Medium', hint: 'Moderate protection' },
    { label: 'Strong', hint: 'Solid protection' },
    { label: 'Very strong', hint: 'Excellent protection' }
  ];

  var GUESSES_PER_SECOND = 1e10; // educational baseline: offline GPU attack
  var SECONDS_PER_YEAR = 31557600;

  function leetNormalize(value) {
    return value.split('').map(function (character) {
      return LEET[character] || character;
    }).join('');
  }

  function longestRun(value) {
    var longest = 1;
    var current = 1;

    for (var i = 1; i < value.length; i += 1) {
      if (value[i] === value[i - 1]) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }

  function findRepeatedBlock(value) {
    var match = /(.{2,5})\1{2,}/.exec(value);
    if (!match) return null;

    return {
      text: match[0],
      blockLength: match[1].length,
      length: match[0].length,
      share: match[0].length / value.length
    };
  }

  function longestSequentialRun(value) {
    var longest = 0;
    var lastDirection = 0;
    var runLength = 1;

    for (var i = 1; i < value.length; i += 1) {
      var previous = value.charCodeAt(i - 1);
      var current = value.charCodeAt(i);
      var sameClass =
        (previous >= 48 && previous <= 57 && current >= 48 && current <= 57) ||
        (previous >= 65 && previous <= 90 && current >= 65 && current <= 90) ||
        (previous >= 97 && previous <= 122 && current >= 97 && current <= 122);
      var difference = current - previous;

      if (sameClass && (difference === 1 || difference === -1)) {
        if (difference === lastDirection) {
          runLength += 1;
        } else {
          lastDirection = difference;
          runLength = 2;
        }

        if (runLength > longest) longest = runLength;
      } else {
        lastDirection = 0;
        runLength = 1;
      }
    }

    return longest >= 4 ? longest : 0;
  }

  function longestKeyboardRun(value) {
    var lower = value.toLowerCase();
    var longest = 0;

    (PL.KEYBOARD_ROWS || []).forEach(function (row) {
      [row, row.split('').reverse().join('')].forEach(function (candidate) {
        for (var start = 0; start < candidate.length; start += 1) {
          for (var end = start + 4; end <= candidate.length; end += 1) {
            if (lower.indexOf(candidate.slice(start, end)) !== -1) {
              if (end - start > longest) longest = end - start;
            } else {
              break;
            }
          }
        }
      });
    });

    return longest >= 4 ? longest : 0;
  }

  function formatList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  function levelIndexFor(score) {
    if (score <= 19) return 0;
    if (score <= 39) return 1;
    if (score <= 59) return 2;
    if (score <= 79) return 3;
    return 4;
  }

  function formatCrackTime(bits) {
    if (!bits || bits < 1) return '—';

    var log10Years = (bits - 1) * Math.log10(2) - Math.log10(GUESSES_PER_SECOND) - Math.log10(SECONDS_PER_YEAR);

    if (log10Years >= 15) return '> 1 quadrillion years';

    var years = Math.pow(10, log10Years);

    if (years >= 1) {
      if (years < 1000) {
        return Math.round(years).toLocaleString('en-US') + ' years';
      }
      if (years < 1e6) {
        var thousands = years / 1000;
        return (thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)) + 'k years';
      }
      if (years < 1e9) return (years / 1e6).toFixed(1) + 'M years';
      if (years < 1e12) return (years / 1e9).toFixed(1) + 'B years';
      return (years / 1e12).toFixed(1) + 'T years';
    }

    var seconds = Math.pow(10, (bits - 1) * Math.log10(2) - Math.log10(GUESSES_PER_SECOND));

    if (seconds < 1) return 'Instantly';
    if (seconds < 60) return Math.max(1, Math.round(seconds)) + ' sec';
    if (seconds < 3600) return Math.round(seconds / 60) + ' min';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hr';
    if (seconds < 2630000) return Math.round(seconds / 86400) + ' days';
    return Math.round(seconds / 2630000) + ' months';
  }

  function emptyResult() {
    return {
      empty: true,
      passwordLength: 0,
      score: 0,
      levelIndex: -1,
      levelLabel: 'Awaiting input',
      levelHint: 'Start typing to begin',
      entropyBits: 0,
      crackTimeSeconds: 0,
      crackTimeLabel: '—',
      uniqueChars: 0,
      poolSize: 0,
      checkCount: 0,
      checks: {
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
        common: false,
        patterns: false
      },
      verdict: 'Enter a password to see a plain-language verdict and tailored fixes.',
      suggestions: []
    };
  }

  function analyze(password) {
    if (!password) return emptyResult();

    var length = password.length;
    var lower = password.toLowerCase();
    var leet = leetNormalize(lower);
    var alphaOnly = leet.replace(/[^a-z]/g, '');

    var hasLower = /[a-z]/.test(password);
    var hasUpper = /[A-Z]/.test(password);
    var hasNumber = /[0-9]/.test(password);
    var hasSpecial = /[^A-Za-z0-9]/.test(password);
    var classCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    var uniqueChars = new Set(password).size;

    var exactCommon = COMMON.has(lower);
    var variantCommon = false;
    var containedWord = '';

    if (!exactCommon) {
      var candidates = [
        leet,
        alphaOnly,
        leet.replace(/[0-9]+$/, ''),
        leet.replace(/[^a-z]+$/, '')
      ];

      for (var c = 0; c < candidates.length; c += 1) {
        if (candidates[c].length >= 4 && COMMON.has(candidates[c])) {
          variantCommon = true;
          break;
        }
      }
    }

    if (!exactCommon && !variantCommon) {
      for (var w = 0; w < COMMON_WORDS.length; w += 1) {
        if (leet.indexOf(COMMON_WORDS[w]) !== -1 && COMMON_WORDS[w].length > containedWord.length) {
          containedWord = COMMON_WORDS[w];
        }
      }
    }

    var containsWord = containedWord !== '';

    var maxRun = longestRun(password);
    var repeatedChar = maxRun >= 3;
    var repeatedBlockInfo = findRepeatedBlock(password);
    var repeatedBlock = Boolean(repeatedBlockInfo);
    var sequentialRun = longestSequentialRun(password);
    var sequential = sequentialRun > 0;
    var keyboardRun = longestKeyboardRun(password);
    var keyboardWalk = keyboardRun > 0;

    var onlyDigits = /^[0-9]+$/.test(password);
    var yearMatch = password.match(/(?:^|[^0-9])((?:19|20)\d{2})(?![0-9])/);
    var hasYear = !onlyDigits && Boolean(yearMatch);
    var digitRuns = password.match(/[0-9]{8,}/g) || [];
    var longDigitRun = digitRuns.length > 0;
    var maxDigitRun = digitRuns.reduce(function (longest, run) {
      return Math.max(longest, run.length);
    }, 0);
    var digitsCompact = password.replace(/[^0-9]/g, '');
    var digitCount = digitsCompact.length;
    var compactMaxRun = digitCount ? longestRun(digitsCompact) : 0;
    var compactSequentialRun = digitCount >= 4 ? longestSequentialRun(digitsCompact) : 0;
    var repeatedDigits = digitCount >= 6 && digitCount / length >= 0.5 &&
      compactMaxRun >= 4 && compactMaxRun / digitCount >= 0.5;
    var sequentialDigits = digitCount >= 6 && digitCount / length >= 0.5 &&
      compactSequentialRun >= 4 && compactSequentialRun / digitCount >= 0.5;
    var phonePattern = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(password);
    var nameMatch = password.match(/^[A-Z][a-z]{2,}(?=[^A-Za-z]|$)/);
    var leadingName = Boolean(nameMatch);
    var nonNameNonDigit = leadingName ? password.slice(nameMatch[0].length) : password;
    var tailIsSymbols = /^[^A-Za-z]*$/.test(nonNameNonDigit.replace(/[0-9]/g, ''));

    var repeatShare = maxRun / length;
    var blockShare = repeatedBlockInfo ? repeatedBlockInfo.length / length : 0;
    var sequentialShare = sequentialRun ? sequentialRun / length : 0;
    var keyboardShare = keyboardRun ? keyboardRun / length : 0;
    var wordShare = containsWord ? containedWord.length / length : 0;
    var digitShare = digitCount ? digitCount / length : 0;
    var nameShare = leadingName ? nameMatch[0].length / length : 0;

    // A name plus a phone/ID-length number with little else is a much
    // narrower structure than a long password with a large numeric tail.
    var phoneLike = leadingName && digitCount >= 8 && digitCount <= 16 &&
      maxDigitRun <= 16 && tailIsSymbols &&
      (length - nameMatch[0].length - digitCount) <= 8;

    var checks = {
      length: length >= 12,
      upper: hasUpper,
      lower: hasLower,
      number: hasNumber,
      special: hasSpecial,
      common: !exactCommon && !variantCommon,
      patterns: !exactCommon && !variantCommon && !(maxRun >= 4) && !repeatedBlock &&
        !repeatedDigits && !sequentialDigits && !phonePattern && !sequential &&
        !keyboardWalk && !hasYear && !containsWord && !longDigitRun && !leadingName
    };

    var checkCount = Object.keys(checks).reduce(function (total, key) {
      return total + (checks[key] ? 1 : 0);
    }, 0);

    /* --- Score ------------------------------------------------------------
       Length contributes up to 60 points, character variety up to 36, and
       long passwords get a small top-up. Pattern penalties and hard caps
       prevent a long-but-predictable password from scoring highly. */

    var score = Math.min(60, length * 3) + classCount * 9;

    if (length >= 16) score += 4;
    if (length >= 24) score += 2;
    score = Math.min(100, score);

    if (containsWord) score -= Math.min(16, 6 + containedWord.length);
    if (maxRun >= 3) score -= Math.min(18, (maxRun - 2) * 3);
    if (repeatedBlock) score -= Math.min(18, 6 + repeatedBlockInfo.length);
    if (sequential) score -= Math.min(15, (sequentialRun - 2) * 3);
    if (keyboardWalk) score -= Math.min(18, (keyboardRun - 2) * 3);
    if (hasYear) score -= 8;
    if (leadingName) score -= Math.min(12, 4 + nameMatch[0].length);
    if (longDigitRun) score -= Math.min(14, 4 + maxDigitRun);
    if (repeatedDigits) score -= 15;
    if (sequentialDigits && !sequential) score -= 12;
    if (length >= 10 && classCount >= 2 && uniqueChars / length < 0.5) score -= 8;

    // A short run inside a long password is a minor flaw, not a collapse.
    // Only repetition that dominates the password gets a hard cap.
    if (maxRun >= 6 && repeatShare >= 0.4) score = Math.min(score, 30);
    else if (maxRun >= 4 && repeatShare >= 0.3) score = Math.min(score, 50);
    if (repeatedBlock && blockShare >= 0.5) score = Math.min(score, 35);
    if (repeatedDigits) score = Math.min(score, 20);
    if (sequentialDigits) score = Math.min(score, 35);
    if (sequential && sequentialShare >= 0.35) score = Math.min(score, 39);
    if (keyboardWalk && keyboardShare >= 0.35) score = Math.min(score, 39);
    if (containsWord && (hasYear || wordShare >= 0.5 || length < 14)) score = Math.min(score, 59);
    if (hasYear && length < 20) score = Math.min(score, 79);
    if (leadingName && (nameShare >= 0.35 || length < 14)) score = Math.min(score, 75);
    if (phonePattern) score = Math.min(score, 59);
    if (longDigitRun && maxDigitRun <= 16 && (phoneLike || digitShare >= 0.5)) {
      score = Math.min(score, 70);
    }
    if (phoneLike) score = Math.min(score, 59);

    if (length < 6) score = Math.min(score, 20);
    else if (length < 8) score = Math.min(score, 35);
    else if (length < 10) score = Math.min(score, 49);
    else if (length < 12) score = Math.min(score, 59);

    if (exactCommon) score = Math.min(score, 6);
    else if (variantCommon) score = Math.min(score, 18);

    score = Math.max(0, Math.min(100, Math.round(score)));

    /* --- Entropy estimate -------------------------------------------------
       Raw combinations assume random generation from the observed pool.
       Predictable structures are capped so the figure stays honest. */

    var poolSize = 0;
    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasNumber) poolSize += 10;
    if (hasSpecial) poolSize += 33;
    if (/[^\x00-\x7F]/.test(password)) poolSize += 60;

    var rawEntropy = length * Math.log2(Math.max(poolSize, 2));
    var entropy = rawEntropy;

    if (containsWord) entropy -= Math.min(24, 4 + containedWord.length * 2);
    if (maxRun >= 3) entropy -= Math.min(12, (maxRun - 2) * 1.5);
    if (repeatedBlock) entropy -= Math.min(12, 4 + repeatedBlockInfo.length);
    if (sequential) entropy -= Math.min(12, (sequentialRun - 2) * 2);
    if (keyboardWalk) entropy -= Math.min(12, (keyboardRun - 2) * 2);
    if (hasYear) entropy -= 8;
    if (leadingName) entropy -= Math.min(16, 4 + nameMatch[0].length * 2);
    if (digitCount) {
      var digitEntropyPenalty = Math.max(0, Math.log2(Math.max(poolSize, 2)) - Math.log2(10));
      entropy -= Math.min(rawEntropy * 0.7, digitCount * digitEntropyPenalty);
    }

    if (maxRun >= 6 && repeatShare >= 0.4) {
      entropy = Math.min(entropy, Math.max(10, length * 2.2));
    }
    if (repeatedBlock && blockShare >= 0.5) entropy = Math.min(entropy, 30);
    if (repeatedDigits) entropy = Math.min(entropy, 18);
    if (sequentialDigits) entropy = Math.min(entropy, 28);
    if (sequential && sequentialShare >= 0.35) entropy = Math.min(entropy, 28);
    if (keyboardWalk && keyboardShare >= 0.35) entropy = Math.min(entropy, 24);
    if (containsWord && (hasYear || wordShare >= 0.5 || length < 14)) {
      entropy = Math.min(entropy, 60);
    }
    if (hasYear && length < 20) entropy = Math.min(entropy, 80);
    if (leadingName && (nameShare >= 0.35 || length < 14)) entropy = Math.min(entropy, 70);
    if (phonePattern) entropy = Math.min(entropy, 45);
    if (longDigitRun && maxDigitRun <= 16 && (phoneLike || digitShare >= 0.5)) {
      entropy = Math.min(entropy, 70);
    }
    if (phoneLike) entropy = Math.min(entropy, 45);
    if (length < 8) entropy = Math.min(entropy, 30);

    if (exactCommon) entropy = Math.min(entropy, 8);
    else if (variantCommon) entropy = Math.min(entropy, 14);

    var entropyBits = Math.max(8, Math.round(entropy));

    /* Keep the headline score consistent with the effective entropy.
       A password measured in seconds or minutes should never be "Strong". */
    if (entropy < 33) score = Math.min(score, 39);
    else if (entropy < 45) score = Math.min(score, 55);
    else if (entropy < 60) score = Math.min(score, 69);

    // A long password with genuinely high effective entropy should not be
    // dragged below its band by a single local pattern or a known prefix.
    if (length >= 16) {
      if (entropy >= 128) score = Math.max(score, 92);
      else if (entropy >= 96) score = Math.max(score, 85);
      else if (entropy >= 80) score = Math.max(score, 78);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    var levelIndex = levelIndexFor(score);
    var level = LEVELS[levelIndex];

    /* --- Verdict ---------------------------------------------------------- */

    var verdict;

    if (exactCommon) {
      verdict = 'This is one of the most common passwords in public breach lists. An attacker would find it almost immediately.';
    } else if (variantCommon) {
      verdict = 'A common password in disguise — predictable substitutions and added digits do not slow modern wordlist attacks.';
    } else {
      var issues = [];

      if (leadingName && longDigitRun) {
        issues.push('a name followed by a long number');
      } else {
        if (leadingName) issues.push('a name or word at the start');
        if (longDigitRun) issues.push('a long numeric run');
      }

      if (repeatedDigits) issues.push('repeated digits');
      if (sequentialDigits) issues.push('sequential digits');
      if (phonePattern) issues.push('a phone-number pattern');
      if (keyboardWalk) issues.push('a keyboard walk');
      if (sequential) issues.push('sequential characters');
      if (repeatedBlock) issues.push('a repeating block');
      if (hasYear) issues.push('a year or date');
      if (containsWord) issues.push('a common dictionary word');
      if (maxRun >= 4 && (maxRun >= 6 || repeatShare >= 0.3)) issues.push('repeated characters');

      if (phoneLike) {
        verdict = 'A name followed by a phone/ID-like number is easy to guess from public information — the length is doing less work than it appears.';
      } else if (leadingName && longDigitRun && score >= 80) {
        verdict = 'Strong overall. The name prefix is predictable, but the long numeric tail is too large to be a typical phone number and still adds real entropy.';
      } else if (issues.length > 0 && score >= 80) {
        verdict = 'Strong overall, with minor ' + (issues.length > 1 ? 'patterns' : 'pattern') +
          ': ' + formatList(issues) + '. ' +
          (issues.length > 1 ? 'They barely affect' : 'It barely affects') +
          ' the total, but avoid it in future passwords.';
      } else if (issues.length > 0 && score >= 60) {
        verdict = 'Solid, but predictable elements are present: ' + formatList(issues) +
          '. They make it easier to guess than the length suggests.';
      } else if (issues.length > 0) {
        verdict = 'Predictable ' + (issues.length > 1 ? 'elements' : 'element') +
          ' detected: ' + formatList(issues) + '. Cracking tools try these first.';
      } else if (length < 8) {
        verdict = 'Far too short — even modest hardware can exhaust this search space almost instantly.';
      } else if (length < 12) {
        verdict = 'Short enough that a determined attacker could search the whole space. Length is the biggest gap here.';
      } else if (classCount <= 2) {
        verdict = 'Good length, but a narrow character pool limits the number of possible combinations.';
      } else if (score >= 80 && maxRun >= 3) {
        verdict = 'Strong overall. A short repeated run is the only minor weak spot — keep this password unique to one account.';
      } else if (score >= 80) {
        verdict = 'Strong length and variety, with no common patterns detected. Keep it unique to this account.';
      } else {
        verdict = 'Reasonable, but more length or randomness would meaningfully raise the cost of cracking it.';
      }
    }

    /* --- Actionable suggestions ------------------------------------------ */

    var suggestions = [];
    var missing = [];

    if (!hasUpper) missing.push('uppercase letters');
    if (!hasLower) missing.push('lowercase letters');
    if (!hasNumber) missing.push('numbers');
    if (!hasSpecial) missing.push('symbols');

    if (exactCommon) {
      suggestions.push({
        type: 'critical',
        text: 'This password appears in public breach lists. Replace it on every account where it is used and generate a new one.'
      });
    } else if (variantCommon) {
      suggestions.push({
        type: 'critical',
        text: 'This is a well-known password with cosmetic changes. Switch to a randomly generated password instead.'
      });
    } else {
      if (length < 12) {
        suggestions.push({
          type: 'warning',
          text: 'Add ' + (12 - length) + ' more character' + (12 - length === 1 ? '' : 's') +
            ' — 12 is a sensible floor, and 16 or more is better.'
        });
      } else if (length < 16) {
        suggestions.push({
          type: 'info',
          text: 'Aim for 16 or more characters. Every extra character multiplies the cracking work.'
        });
      }

      if (classCount < 4 && (score < 80 || classCount < 3)) {
        suggestions.push({
          type: 'warning',
          text: 'Mix in ' + formatList(missing) + ' to widen the character pool.'
        });
      }

      if (containsWord) {
        suggestions.push({
          type: 'warning',
          text: 'Swap dictionary words for unrelated characters. A random four-to-six-word passphrase is easier to remember and harder to guess.'
        });
      }

      if (phoneLike) {
        suggestions.push({
          type: 'critical',
          text: 'This looks like a name followed by a phone number, ID, or date. That structure is often public — replace it with a fully random password.'
        });
      } else if (leadingName && longDigitRun) {
        suggestions.push({
          type: 'info',
          text: 'The name prefix is predictable, but the long numeric tail is large enough to add real entropy. A fully random password is still the safer habit.'
        });
      } else {
        if (leadingName) {
          suggestions.push({
            type: 'warning',
            text: 'Avoid starting with a name or personal word. It is one of the first things an attacker tries.'
          });
        }

        if (longDigitRun) {
          suggestions.push({
            type: 'warning',
            text: 'Long numeric runs — phone numbers, IDs, and dates — are guessable. Remove them or break them up.'
          });
        }
      }

      if (repeatedDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Repeated digit groups — such as 555-555-5555 — add almost no entropy. Use unrelated characters instead.'
        });
      }

      if (sequentialDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Sequential digit groups like 123-456-7890 are tried early in phone-keypad and dictionary attacks.'
        });
      }

      if (phonePattern && !repeatedDigits && !sequentialDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Phone-number formats are public and easy to guess. Avoid grouping digits like a real phone number.'
        });
      }

      if (repeatedChar && !repeatedDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Break up repeated character runs — repetition adds length but very little real entropy.'
        });
      }

      if (repeatedBlock) {
        suggestions.push({
          type: 'warning',
          text: 'Avoid repeating the same block of characters. One guess then covers the whole pattern.'
        });
      }

      if (sequential && !sequentialDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Break up sequential runs such as “abcd” or “4321”; they are tried early in almost every attack.'
        });
      }

      if (keyboardWalk && !sequentialDigits && !repeatedDigits) {
        suggestions.push({
          type: 'warning',
          text: 'Avoid keyboard walks like “qwerty” or “asdf”. Cracking tools include them as first-class patterns.'
        });
      }

      if (hasYear) {
        suggestions.push({
          type: 'info',
          text: 'Remove years or dates. They are easy to discover from public profiles and add little uncertainty.'
        });
      }

      if (onlyDigits && score < 70) {
        suggestions.push({
          type: 'warning',
          text: 'Digits alone leave a small character pool. Add letters and symbols — or use the generator.'
        });
      }
    }

    if (score >= 80 && suggestions.length === 0) {
      suggestions.push({
        type: 'success',
        text: 'No weak spots found. Store it in a password manager, keep it unique, and enable multi-factor authentication.'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'info',
        text: 'Add length or randomness to raise the cracking cost. Even a strong password should be unique to this account.'
      });
    }

    return {
      empty: false,
      passwordLength: length,
      score: score,
      levelIndex: levelIndex,
      levelLabel: level.label,
      levelHint: level.hint,
      entropyBits: entropyBits,
      crackTimeSeconds: Math.pow(2, Math.min(entropyBits, 1000) - 1) / GUESSES_PER_SECOND,
      crackTimeLabel: formatCrackTime(entropyBits),
      uniqueChars: uniqueChars,
      poolSize: poolSize,
      checkCount: checkCount,
      checks: checks,
      verdict: verdict,
      suggestions: suggestions
    };
  }

  PL.analyze = analyze;
  PL.formatCrackTime = formatCrackTime;
  PL.LEVELS = LEVELS;
})();
