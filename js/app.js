/* ==========================================================================
   CY3ER-CAT — UI controller
   Wires the analyzer and generator to the page. All work stays local.
   ========================================================================== */
(function () {
  'use strict';

  var PL = window.PasswordLab;
  var DIAL_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in the SVG

  var state = {
    generated: '',
    scoreDisplay: 0,
    scoreFrame: 0,
    analysisTimer: 0,
    copyTimer: 0,
    toastTimer: 0
  };

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var els = {};

  var SUGGESTION_ICONS = {
    critical: '<svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>',
    warning: '<svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>',
    info: '<svg class="icon" aria-hidden="true"><use href="#i-info"></use></svg>',
    success: '<svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>',
    empty: '<svg class="icon" aria-hidden="true"><use href="#i-key"></use></svg>'
  };

  function cacheElements() {
    els.analyzerCard = document.getElementById('analyzer-card');
    els.form = document.getElementById('analyze-form');
    els.password = document.getElementById('password');
    els.field = document.getElementById('password-field');
    els.toggle = document.getElementById('toggle-visibility');
    els.visibilityIcon = document.getElementById('visibility-icon');
    els.clear = document.getElementById('clear-password');

    els.scoreValue = document.getElementById('score-value');
    els.dialProgress = document.getElementById('dial-progress');
    els.strengthLabel = document.getElementById('strength-label');
    els.strengthHint = document.getElementById('strength-hint');
    els.segments = document.getElementById('segments');
    els.entropyValue = document.getElementById('entropy-value');
    els.crackValue = document.getElementById('crack-value');
    els.uniqueValue = document.getElementById('unique-value');
    els.verdictText = document.getElementById('verdict-text');

    els.checklist = Array.prototype.slice.call(document.querySelectorAll('#checklist [data-check]'));
    els.checksCount = document.getElementById('checks-count');
    els.suggestions = document.getElementById('suggestions');

    els.generated = document.getElementById('generated-password');
    els.generatedMeta = document.getElementById('generated-meta');
    els.generatedMetaRow = document.getElementById('generated-meta-row');
    els.copy = document.getElementById('copy-password');
    els.copyIcon = document.getElementById('copy-icon');
    els.copyLabel = document.getElementById('copy-label');

    els.length = document.getElementById('password-length');
    els.lengthValue = document.getElementById('length-value');
    els.optUpper = document.getElementById('opt-uppercase');
    els.optLower = document.getElementById('opt-lowercase');
    els.optNumbers = document.getElementById('opt-numbers');
    els.optSymbols = document.getElementById('opt-symbols');
    els.excludeAmbiguous = document.getElementById('exclude-ambiguous');
    els.generate = document.getElementById('generate-password');
    els.analyzeGenerated = document.getElementById('analyze-generated');

    els.toast = document.getElementById('toast');
    els.toastText = document.getElementById('toast-text');
  }

  /* ---------- Small utilities ---------- */

  function showToast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add('is-visible');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      els.toast.classList.remove('is-visible');
    }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }

    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        var copied = document.execCommand('copy');
        textarea.remove();
        if (copied) resolve();
        else reject(new Error('copy unavailable'));
      } catch (error) {
        textarea.remove();
        reject(error);
      }
    });
  }

  function setVisibility(visible) {
    els.password.type = visible ? 'text' : 'password';
    els.toggle.setAttribute('aria-pressed', String(visible));
    els.toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    els.toggle.setAttribute('title', visible ? 'Hide password' : 'Show password');
    els.visibilityIcon.setAttribute('href', visible ? '#i-eye-off' : '#i-eye');
  }

  /* ---------- Analyzer rendering ---------- */

  function animateScore(target) {
    // Keep the number and the verdict in sync. The dial itself still eases
    // to the new value via CSS; a separate count-up made the number disagree
    // with the label for a few hundred milliseconds.
    window.cancelAnimationFrame(state.scoreFrame);
    state.scoreFrame = 0;
    state.scoreDisplay = target;
    els.scoreValue.textContent = String(target);
  }

  function renderSuggestions(result) {
    els.suggestions.textContent = '';

    if (result.empty) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'suggestion suggestion--empty';
      emptyItem.innerHTML =
        '<span class="suggestion__icon" aria-hidden="true">' + SUGGESTION_ICONS.empty + '</span>' +
        '<p>Type a password above and tailored fixes will appear here.</p>';
      els.suggestions.appendChild(emptyItem);
      return;
    }

    result.suggestions.forEach(function (suggestion) {
      var item = document.createElement('li');
      item.className = 'suggestion suggestion--' + suggestion.type;

      var icon = document.createElement('span');
      icon.className = 'suggestion__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SUGGESTION_ICONS[suggestion.type] || SUGGESTION_ICONS.info;

      var text = document.createElement('p');
      text.textContent = suggestion.text;

      item.appendChild(icon);
      item.appendChild(text);
      els.suggestions.appendChild(item);
    });
  }

  function renderChecks(result) {
    els.checklist.forEach(function (item) {
      var key = item.getAttribute('data-check');

      if (result.empty) {
        item.classList.remove('is-pass', 'is-fail');
        return;
      }

      item.classList.toggle('is-pass', Boolean(result.checks[key]));
      item.classList.toggle('is-fail', !result.checks[key]);
    });

    els.checksCount.textContent = result.empty ? '0 / 7' : result.checkCount + ' / 7';
    els.checksCount.classList.toggle('is-complete', !result.empty && result.checkCount === 7);
  }

  function render(result) {
    var toneIndex = result.empty ? 'none' : String(result.levelIndex);

    els.analyzerCard.setAttribute('data-strength', toneIndex);
    els.strengthLabel.textContent = result.empty ? 'Awaiting input' : result.levelLabel;
    els.strengthHint.textContent = result.empty ? 'Start typing to begin' : result.levelHint;
    els.verdictText.textContent = result.verdict;

    var score = result.empty ? 0 : result.score;

    if (result.empty) {
      window.cancelAnimationFrame(state.scoreFrame);
      state.scoreFrame = 0;
      state.scoreDisplay = 0;
      els.scoreValue.textContent = '0';
    } else {
      animateScore(score);
    }

    els.dialProgress.style.strokeDashoffset = String(DIAL_CIRCUMFERENCE * (1 - score / 100));

    Array.prototype.forEach.call(els.segments.children, function (segment, index) {
      var isOn = !result.empty && index <= result.levelIndex;
      segment.classList.toggle('is-on', isOn);
      segment.classList.toggle('is-current', !result.empty && index === result.levelIndex);
    });

    els.segments.setAttribute('aria-valuenow', String(score));
    els.segments.setAttribute('aria-valuetext', result.empty
      ? 'No password entered'
      : result.levelLabel + ', ' + score + ' out of 100');

    els.entropyValue.textContent = String(result.entropyBits);
    els.crackValue.textContent = result.crackTimeLabel;
    els.uniqueValue.textContent = String(result.uniqueChars);

    renderChecks(result);
    renderSuggestions(result);
  }

  function updateAnalysis(value) {
    window.clearTimeout(state.analysisTimer);
    els.field.classList.toggle('has-value', value.length > 0);
    els.clear.disabled = value.length === 0;
    render(PL.analyze(value));
  }

  function scheduleAnalysis(value) {
    els.field.classList.toggle('has-value', value.length > 0);
    els.clear.disabled = value.length === 0;
    window.clearTimeout(state.analysisTimer);
    state.analysisTimer = window.setTimeout(function () {
      render(PL.analyze(value));
    }, 250);
  }

  /* ---------- Generator ---------- */

  function syncLengthDisplay() {
    var minimum = Number(els.length.min);
    var maximum = Number(els.length.max);
    var value = Number(els.length.value);
    var fill = ((value - minimum) / (maximum - minimum)) * 100;

    els.lengthValue.textContent = String(value);
    els.length.style.setProperty('--fill', fill + '%');
  }

  function resetCopyButton() {
    window.clearTimeout(state.copyTimer);
    els.copy.classList.remove('is-copied');
    els.copyLabel.textContent = 'Copy';
    els.copyIcon.setAttribute('href', '#i-copy');
  }

  function generateAndShow() {
    var generated = PL.generatePassword({
      length: Number(els.length.value),
      lower: els.optLower.checked,
      upper: els.optUpper.checked,
      numbers: els.optNumbers.checked,
      symbols: els.optSymbols.checked,
      excludeAmbiguous: els.excludeAmbiguous.checked
    });

    if (!generated) {
      showToast('Select at least one character set');
      return;
    }

    state.generated = generated;

    els.generated.textContent = generated;
    els.generated.classList.remove('is-placeholder');
    els.generated.classList.remove('is-fresh');
    void els.generated.offsetWidth;
    els.generated.classList.add('is-fresh');

    els.copy.disabled = false;
    els.analyzeGenerated.disabled = false;
    resetCopyButton();

    var result = PL.analyze(generated);
    els.generatedMeta.textContent = result.entropyBits + ' bits · ' + result.levelLabel;
    els.generatedMetaRow.setAttribute('data-strength', String(result.levelIndex));
  }

  function ensureCharacterSet(event) {
    var anySelected = [els.optUpper, els.optLower, els.optNumbers, els.optSymbols].some(function (checkbox) {
      return checkbox.checked;
    });

    if (!anySelected) {
      event.target.checked = true;
      showToast('Keep at least one character set selected');
    }
  }

  /* ---------- Event wiring ---------- */

  function bindEvents() {
    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
    });

    els.password.addEventListener('input', function () {
      scheduleAnalysis(els.password.value);
    });

    els.toggle.addEventListener('click', function () {
      var isVisible = els.password.type === 'text';
      setVisibility(!isVisible);
      els.password.focus({ preventScroll: true });
    });

    els.clear.addEventListener('click', function () {
      els.password.value = '';
      setVisibility(false);
      updateAnalysis('');
      els.password.focus({ preventScroll: true });
      showToast('Password field cleared');
    });

    els.generate.addEventListener('click', generateAndShow);

    els.length.addEventListener('input', syncLengthDisplay);

    [els.optUpper, els.optLower, els.optNumbers, els.optSymbols].forEach(function (checkbox) {
      checkbox.addEventListener('change', ensureCharacterSet);
    });

    els.copy.addEventListener('click', function () {
      if (!state.generated) return;

      copyText(state.generated).then(function () {
        els.copy.classList.add('is-copied');
        els.copyLabel.textContent = 'Copied';
        els.copyIcon.setAttribute('href', '#i-check');
        showToast('Generated password copied');

        window.clearTimeout(state.copyTimer);
        state.copyTimer = window.setTimeout(resetCopyButton, 1800);
      }).catch(function () {
        showToast('Copy failed — select the password manually');
      });
    });

    els.analyzeGenerated.addEventListener('click', function () {
      if (!state.generated) return;

      els.password.value = state.generated;
      updateAnalysis(state.generated);

      els.password.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'center'
      });
      els.password.focus({ preventScroll: true });
      showToast('Generated password loaded into the inspector');
    });
  }

  function init() {
    cacheElements();
    bindEvents();
    syncLengthDisplay();
    updateAnalysis('');
    generateAndShow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
