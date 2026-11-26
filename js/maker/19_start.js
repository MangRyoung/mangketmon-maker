/* ── 조각 19_start.js — 시작 · 폰 숫자 칸 ── */
/* ---------- 시작 ---------- */
load();
/* 10-25 망령: 오레마스 「💾 로그 → 정리기에서 열기」 = 제작기 ?tab=log&oremas=방ID — 로그 정리기 탭을 열고 그 방 로그를 바로 불러온다. 주소의 값은 한 번 쓰고 지운다 */
{
  const q = new URLSearchParams(location.search);
  const om = q.get('oremas'),
    tb = q.get('tab'),
    vw = q.get('view');
  if (om || tb || vw) {
    if (om || vw) {
      S.ui.tab = 'log';
      const f = $('#logFrame');
      if (f) f.src = 'logtool/index.html?v=' + LOGV + (om ? '&oremas=' + encodeURIComponent(om) : '') + (vw ? '&view=' + encodeURIComponent(vw) : '');
    } else if (tb && $('#v-' + tb)) S.ui.tab = tb;
    q.delete('oremas');
    q.delete('tab');
    q.delete('view');
    try {
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    } catch (e) {}
  }
}
showTab(
  EMB.t || EMB.nu ? 'char' : S.ui.tab || 'char'
); /* 10-30 망령 「편집 버튼 누르면 DB 가 떠」: 노트에서 연 제작기(?focus=)는 마지막 탭과 상관없이 캐릭터 시트로 */
loadFx();
meLoad();
shInit();
/* 아직 공유 DB 에 올라가지 않은 수정이 있으면 탭을 닫기 전에 한 번 묻는다 (그 사이 저장을 한 번 더 시도) */
window.addEventListener('beforeunload', e => {
  if (!SH.on || !SH.ready || !SH.canWrite) return;
  if (!SH.userEdit && !SH.flushing) return;
  /* 11-09 감우 57: 이 창에서 고친 게 없으면 떠날 때 올리지 않는다 */ let dirty = !!SH.flushing;
  try {
    if (!dirty)
      for (const [p, b] of shWant()) {
        const j = canon(b);
        if (SH.synced.get(p) !== j && !(SH.bad && SH.bad.get(p) === j)) {
          dirty = true;
          break;
        }
      }
  } catch (_) {}
  if (dirty) {
    try {
      shFlush();
    } catch (_) {}
    e.preventDefault();
    e.returnValue = '';
  }
});
/* ---------- 폰: 숫자 칸 −/+ (포인트 기본값 · 분배 레벨 · 종족치). 손가락 화면에서만 버튼이 보인다. 꾹 누르면 계속 바뀐다 ---------- */
(() => {
  const RE = /\.(base\.[^.]+|dist)$/;
  const root = document.getElementById('v-char');
  if (!root) return;
  const wrap = () => {
    for (const i of root.querySelectorAll('input[data-p]')) {
      if (!RE.test(i.dataset.p) || i.parentElement.classList.contains('stp')) continue;
      const w = document.createElement('span');
      w.className = 'stp';
      i.replaceWith(w);
      const mk = d => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'stpb';
        b.dataset.stp = d;
        b.tabIndex = -1;
        b.textContent = d > 0 ? '+' : '−';
        b.setAttribute('aria-label', d > 0 ? '1 올리기' : '1 내리기');
        return b;
      };
      w.append(mk(-1), i, mk(1));
    }
  };
  let q = 0;
  new MutationObserver(() => {
    if (q) return;
    q = requestAnimationFrame(() => {
      q = 0;
      wrap();
    });
  }).observe(root, { childList: true, subtree: true });
  wrap();
  const step = (sel, d) => {
    const i = root.querySelector(sel);
    if (!i) return;
    const v = parseFloat(i.value);
    i.value = String(Math.max(0, Math.round(((isNaN(v) ? 0 : v) + d) * 10) / 10));
    i.dispatchEvent(new Event('input', { bubbles: true }));
  };
  let T = null;
  const stop = () => {
    if (!T) return;
    clearTimeout(T.t);
    clearInterval(T.iv);
    const i = root.querySelector(T.sel);
    T = null;
    if (i) i.dispatchEvent(new Event('change', { bubbles: true }));
  };
  root.addEventListener('pointerdown', e => {
    const b = e.target.closest('.stpb');
    if (!b) return;
    e.preventDefault();
    const i = b.parentElement.querySelector('input[data-p]');
    if (!i) return;
    stop();
    const sel = `input[data-p="${CSS.escape(i.dataset.p)}"]`;
    const d = +b.dataset.stp;
    step(sel, d);
    T = {
      sel,
      t: setTimeout(() => {
        if (T) T.iv = setInterval(() => step(sel, d), 90);
      }, 420)
    };
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
    root.addEventListener(
      ev,
      e => {
        if (T && (ev !== 'pointerleave' || (e.target.closest && e.target.closest('.stpb')))) stop();
      },
      true
    );
  root.addEventListener('click', e => {
    if (e.target.closest('.stpb')) e.preventDefault();
  });
})();
