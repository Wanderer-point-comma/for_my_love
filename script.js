/* ==========================================================================
   Одним целым ♡ — интерактив
   Vanilla JS, без зависимостей. Никаких внешних запросов.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js-ready');

  /* ---------- 1. Год в подвале ---------- */
  var yearEl = $('#year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  /* ---------- 2. Появление блоков при прокрутке ---------- */
  var revealables = $$('.reveal');
  if (revealables.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) { return; }
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

      // Небольшая каскадная задержка для соседних элементов
      var groups = {};
      revealables.forEach(function (el) {
        var key = el.parentNode ? el.parentNode.className || 'root' : 'root';
        groups[key] = groups[key] || 0;
        var delay = Math.min(groups[key], 4) * 90;
        groups[key] += 1;
        el.setAttribute('data-delay', String(delay));
        revealObserver.observe(el);
      });
    } else {
      revealables.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---------- 3. Прогресс прокрутки + «прилипшая» шапка ---------- */
  var progressBar = $('#scrollProgress');
  var header = $('#siteHeader');
  var ticking = false;

  function onScroll() {
    var top = window.pageYOffset || document.documentElement.scrollTop;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) {
      var ratio = height > 0 ? Math.min(Math.max(top / height, 0), 1) : 0;
      progressBar.style.width = (ratio * 100).toFixed(2) + '%';
    }
    if (header) { header.classList.toggle('is-stuck', top > 24); }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- 4. Активный раздел в меню ---------- */
  var navLinks = $$('.nav a');
  var dockLinks = $$('.dock__item');
  var tracked = navLinks.concat(dockLinks);

  var sections = [];
  tracked.forEach(function (link) {
    var id = link.getAttribute('href');
    if (!id || id.charAt(0) !== '#' || id === '#top') { return; }
    var section = document.querySelector(id);
    if (section && sections.indexOf(section) === -1) { sections.push(section); }
  });

  function setActive(id) {
    tracked.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { setActive('#' + entry.target.id); }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ---------- 5. Музыкальный плеер ---------- */
  var audio = $('#ourTrack');
  var trackTrigger = $('#trackTrigger');
  var trackPlay = $('#trackPlay');
  var seekBar = $('#seekBar');
  var currentTimeEl = $('#currentTime');
  var totalTimeEl = $('#totalTime');
  var volumeSlider = $('#volumeSlider');
  var volumeValue = $('#volumeValue');
  var volumeIcon = $('.player__volume-icon');
  var playerStatus = $('#playerStatus');
  var musicBtn = $('#musicBtn');
  var musicStatus = $('#musicStatus');

  if (!audio || !trackTrigger) { return; }

  var isSeeking = false;
  var lastVolume = 0.75;
  var muted = false;
  var failed = false;

  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) { return '0:00'; }
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function paintSlider(slider, percent) {
    var p = Math.min(Math.max(percent, 0), 100);
    slider.style.background =
      'linear-gradient(to right, var(--rose) 0%, var(--rose) ' + p + '%, #493235 ' + p + '%, #493235 100%)';
  }

  function setStatus(text, isError) {
    if (!playerStatus) { return; }
    playerStatus.textContent = text || '';
    playerStatus.classList.toggle('is-error', !!isError);
  }

  function updateTrackUI() {
    var playing = !audio.paused && !audio.ended;
    if (trackTrigger) {
      trackTrigger.classList.toggle('is-playing', playing);
      trackTrigger.setAttribute('aria-pressed', playing ? 'true' : 'false');
      trackTrigger.setAttribute('aria-label', playing ? 'Поставить трек на паузу' : 'Воспроизвести трек');
    }
    if (musicBtn) { musicBtn.classList.toggle('is-playing', playing); }
    if (musicStatus) { musicStatus.textContent = playing ? 'ПРИОСТАНОВИТЬ МУЗЫКУ' : 'ВКЛЮЧИТЬ МУЗЫКУ'; }
  }

  function updateSeek() {
    if (isSeeking || !seekBar) { return; }
    var duration = audio.duration;
    if (!isFinite(duration) || duration <= 0) { return; }
    var percent = (audio.currentTime / duration) * 100;
    seekBar.value = String(percent);
    paintSlider(seekBar, percent);
    if (currentTimeEl) { currentTimeEl.textContent = fmtTime(audio.currentTime); }
  }

  function updateVolumeUI() {
    var value = Number(volumeSlider.value);
    audio.volume = value;
    if (value > 0) { lastVolume = value; }
    muted = value === 0;
    audio.muted = muted;
    if (volumeValue) { volumeValue.textContent = Math.round(value * 100) + '%'; }
    paintSlider(volumeSlider, value * 100);
    if (volumeIcon) {
      volumeIcon.style.opacity = value === 0 ? '.45' : '1';
      volumeIcon.setAttribute('title', value === 0 ? 'Звук выключен' : 'Громкость');
    }
    try { localStorage.setItem('oml-volume', String(value)); } catch (e) { /* приватный режим */ }
  }

  function toggleTrack() {
    if (audio.paused) {
      setStatus('Загружаем трек…');
      var p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function (error) {
          if (error && error.name === 'NotAllowedError') {
            setStatus('Нажми на play ещё раз, чтобы включить музыку.', true);
          } else {
            failed = true;
            setStatus('Не удалось включить трек. Проверь соединение и попробуй снова.', true);
          }
          updateTrackUI();
        });
      }
    } else {
      audio.pause();
    }
    updateTrackUI();
  }

  trackTrigger.addEventListener('click', function () {
    failed = false;
    toggleTrack();
  });

  if (musicBtn) {
    musicBtn.addEventListener('click', function () {
      var musicSection = document.getElementById('music');
      if (musicSection) { musicSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
      failed = false;
      toggleTrack();
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', updateVolumeUI);
  }

  if (volumeIcon) {
    volumeIcon.style.cursor = 'pointer';
    volumeIcon.setAttribute('role', 'button');
    volumeIcon.setAttribute('tabindex', '0');
    volumeIcon.setAttribute('aria-label', 'Выключить или включить звук');
    var toggleMute = function () {
      if (Number(volumeSlider.value) === 0) {
        volumeSlider.value = String(lastVolume || 0.75);
      } else {
        lastVolume = Number(volumeSlider.value);
        volumeSlider.value = '0';
      }
      updateVolumeUI();
    };
    volumeIcon.addEventListener('click', toggleMute);
    volumeIcon.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMute(); }
    });
  }

  if (seekBar) {
    seekBar.addEventListener('pointerdown', function () { isSeeking = true; });
    seekBar.addEventListener('input', function () {
      isSeeking = true;
      paintSlider(seekBar, Number(seekBar.value));
      if (isFinite(audio.duration)) {
        var t = (Number(seekBar.value) / 100) * audio.duration;
        if (currentTimeEl) { currentTimeEl.textContent = fmtTime(t); }
      }
    });
    var commitSeek = function () {
      if (!isSeeking) { return; }
      isSeeking = false;
      if (isFinite(audio.duration) && audio.duration > 0) {
        try { audio.currentTime = (Number(seekBar.value) / 100) * audio.duration; } catch (e) { /* ignore */ }
      }
      updateSeek();
    };
    seekBar.addEventListener('change', commitSeek);
    seekBar.addEventListener('pointerup', commitSeek);
    seekBar.addEventListener('blur', commitSeek);
    seekBar.addEventListener('keyup', commitSeek);
  }

  // События плеера
  function syncDuration() {
    failed = false;
    if (!isFinite(audio.duration) || audio.duration <= 0) {
      if (seekBar) { seekBar.disabled = true; }
      return;
    }
    if (totalTimeEl) { totalTimeEl.textContent = fmtTime(audio.duration); }
    if (seekBar) { seekBar.disabled = false; }
    updateSeek();
  }

  audio.addEventListener('loadedmetadata', function () {
    syncDuration();
    setStatus('Готово. Нажми play ♡');
  });

  audio.addEventListener('play', function () {
    failed = false;
    updateTrackUI();
    setStatus('Играет ♡');
  });

  audio.addEventListener('playing', function () {
    setStatus('Играет ♡');
    updateTrackUI();
  });

  audio.addEventListener('pause', function () {
    updateTrackUI();
    if (!audio.ended) { setStatus('Пауза'); }
  });

  audio.addEventListener('ended', function () {
    updateTrackUI();
    setStatus('Трек закончился ♡');
    if (seekBar) { seekBar.value = '0'; paintSlider(seekBar, 0); }
    if (currentTimeEl) { currentTimeEl.textContent = '0:00'; }
  });

  audio.addEventListener('timeupdate', updateSeek);

  audio.addEventListener('waiting', function () {
    if (!audio.paused) { setStatus('Подгружаем…'); }
  });

  audio.addEventListener('canplay', function () {
    failed = false;
    if (audio.paused) { setStatus('Готово. Нажми play ♡'); }
  });

  audio.addEventListener('error', function () {
    failed = true;
    var codes = {
      1: 'Загрузка прервана.',
      2: 'Нет связи с интернетом.',
      3: 'Файл повреждён и не читается.',
      4: 'Трек не найден по этой ссылке.'
    };
    var code = audio.error ? audio.error.code : 0;
    setStatus((codes[code] || 'Не удалось загрузить трек.') + ' Попробуй ещё раз позже.', true);
    updateTrackUI();
  });

  // Начальное состояние
  var storedVolume = null;
  try { storedVolume = localStorage.getItem('oml-volume'); } catch (e) { storedVolume = null; }
  if (storedVolume !== null && !isNaN(parseFloat(storedVolume))) {
    volumeSlider.value = storedVolume;
  }
  updateVolumeUI();
  updateTrackUI();
  if (seekBar) { seekBar.disabled = true; }
  if (totalTimeEl) { totalTimeEl.textContent = '0:00'; }
  setStatus('Готово. Нажми play ♡');

  // Если метаданные уже загрузились до подключения слушателя (кэш) — синхронизируем сразу.
  if (audio.readyState >= 1) {
    syncDuration();
    setStatus('Готово. Нажми play ♡');
  }
})();
