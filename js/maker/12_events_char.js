/* ── 조각 12_events_char.js — 이벤트: 캐릭터 ── */
/* ---------- 이벤트: 캐릭터 ---------- */
function getRef(path) {
  const a = path.split('.').map(unseg);
  let o = S;
  if (a[0] === 'T') {
    o = S.trainers;
    a.shift();
  }
  for (let i = 0; i < a.length - 1; i++) {
    o = o == null ? o : o[a[i]];
  }
  return [o, a[a.length - 1]];
}
function trOf(el) {
  const s = el.closest('[data-ti]');
  return s ? S.trainers[+s.dataset.ti] : null;
}
let rfBusy = false;
/* 11-06 망령 「대가 코멘트 칸 입력하다가 커서가 자꾸 꺼진다」: 다른 창 · 다른 사람의 저장이 들어올 때마다(shRender) 지금 글을 쓰는 트레이너 카드를 통째로 다시 그려서 한글 조합 · 커서가 끊겼다 → 쓰는 동안은 미뤘다가 그 카드에서 손을 떼면 다시 그린다 */
const RF_PEND = new Set();
document.addEventListener('focusout', e => {
  if (!RF_PEND.size) return;
  setTimeout(() => {
    const a = document.activeElement;
    const typing = a && a.matches && a.matches('input,textarea,select');
    for (const t of [...RF_PEND]) {
      const el = $('#tr-' + t.id);
      if (typing && el && el.contains(a)) continue;
      RF_PEND.delete(t);
      if (el && S.trainers.includes(t)) refreshTrainer(t);
    }
  }, 0);
});
function focusKey(f) {
  if (!f || f === document.body || !f.closest || !f.closest('#v-char')) return null;
  if (f.dataset && f.dataset.p) return `[data-p="${CSS.escape(f.dataset.p)}"]`;
  if (f.id) return '#' + CSS.escape(f.id);
  const a = f.closest('[data-act],[data-ptab],[data-tog]');
  if (!a) return null;
  const at = ['data-act', 'data-ptab', 'data-tog', 'data-i', 'data-j', 'data-k']
    .filter(x => a.hasAttribute(x))
    .map(x => `[${x}="${CSS.escape(a.getAttribute(x))}"]`)
    .join('');
  return at || null;
}
function withFocus(fn) {
  const f = document.activeElement;
  const key = focusKey(f);
  let ss = null,
    se = null;
  try {
    ss = f.selectionStart;
    se = f.selectionEnd;
  } catch (e) {}
  fn();
  if (!key) return;
  const n = document.querySelector(key);
  if (n && n !== document.activeElement) {
    n.focus({ preventScroll: true });
    try {
      if (ss != null) n.setSelectionRange(ss, se);
    } catch (e) {}
  }
}
function refreshTrainer(t) {
  try {
    stMgrRedraw();
  } catch (e) {}
  if (rfBusy) return;
  const ti = S.trainers.indexOf(t);
  const el = $('#tr-' + t.id);
  if (!el || !el.parentNode || ti < 0) return renderChar();
  rfBusy = true;
  try {
    withFocus(() => {
      try {
        el.outerHTML = trainerHTML(t, ti);
      } catch (e) {
        renderChar();
      }
    });
  } finally {
    rfBusy = false;
  }
}
/* 로그 정리기 iframe 을 남은 창 높이에 딱 맞춘다 (휴대폰 아래 탭 막대는 뺀다) — 제작기 쪽은 스크롤이 없고 정리기 안에서만 스크롤 */
function fitLog() {
  for (const [fi, vi] of [
    ['#logFrame', '#v-log'],
    ['#ruleFrame', '#v-rule']
  ]) {
    const f = $(fi),
      v = $(vi);
    if (f && v && !v.hidden) fitFrame(f);
  }
} /* 10-23 망령: 룰북 탭도 창 높이에 맞춘다 */
function fitFrame(f) {
  const top = f.getBoundingClientRect().top + window.scrollY;
  let bot = 0;
  const tb = $('#mk .tabs');
  if (tb) {
    const r = tb.getBoundingClientRect();
    if (getComputedStyle(tb).position === 'fixed' && r.top > innerHeight / 2) bot = r.height;
  }
  f.style.height = Math.max(420, Math.floor(innerHeight - top - bot)) + 'px';
}
addEventListener('resize', () => {
  clearTimeout(fitLog.t);
  fitLog.t = setTimeout(fitLog, 80);
});
const LOGV = '20261126d'; /* 로그 정리기 판 (캐시 깨기) */
function refreshAll() {
  stApply();
  if (S.ui.tab === 'log') {
    const f = $('#logFrame');
    if (f && !f.getAttribute('src')) f.src = 'logtool/index.html?v=' + LOGV;
    requestAnimationFrame(fitLog);
    return;
  }
  if (S.ui.tab === 'rule') {
    const f = $('#ruleFrame');
    if (f && !f.getAttribute('src')) f.src = 'rulebook.html?v=202611201130hl';
    requestAnimationFrame(fitLog);
    return;
  }
  if (S.ui.tab === 'notes') {
    if (window.MKM_NOTES) MKM_NOTES.render();
    return;
  }
  if (S.ui.tab === 'dg') {
    if (window.MK_DG) MK_DG.render({ soft: true });
    return;
  }
  if (S.ui.tab === 'char') renderChar();
  else if (S.ui.tab === 'type') renderType();
  else if (S.ui.tab === 'db') renderDB();
  else renderTbl();
}
let rT = null;
let composing = false;
$('#v-char').addEventListener('compositionstart', () => {
  composing = true;
  clearTimeout(rT);
});
$('#v-char').addEventListener('compositionend', e => {
  composing = false;
  const t = trOf(e.target);
  if (t && e.target.tagName !== 'TEXTAREA') {
    clearTimeout(rT);
    rT = setTimeout(() => refreshTrainer(t), 550);
  }
});
$('#v-char').addEventListener('input', e => {
  if (e.target.dataset.tuneitem) {
    const t = S.trainers[+e.target.dataset.i];
    const P = t && t.pokemon[+e.target.dataset.j];
    if (!P) return;
    const T0 = tuneOf(P, true);
    T0.item = e.target.value;
    T0.itemName = T0.item.trim() ? P.item : '';
    save();
    const pv = $('#tunePrev-' + P.id);
    if (pv && fxReady()) pv.innerHTML = tuneItemPrev(T0.item);
    return;
  }
  const p = e.target.dataset.p;
  if (!p) return;
  if (/^T\.\d+\.rp\./.test(p)) {
    const tt = S.trainers[+p.split('.')[1]];
    if (tt && (!tt.rp || typeof tt.rp !== 'object')) tt.rp = {};
  }
  const [o, k] = getRef(p);
  if (!o) return;
  o[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  if (k === 'sub' && o[k]) {
    const tt = S.trainers[+p.split('.')[1]];
    if (tt) for (const q of tt.pokemon) if (q !== o && q.sub) delete q.sub;
  }
  if (k === 'sub' && !o[k]) delete o.sub;
  /* 11-11 서브는 트레이너마다 1체 */ {
    const c = e.target.closest('article.pk,section.folder');
    SVF.id = c ? c.id : null;
  }
  save();
  const t = trOf(e.target);
  if (e.target.tagName === 'TEXTAREA' || e.isComposing || composing) return;
  clearTimeout(rT);
  rT = setTimeout(() => t && refreshTrainer(t), 550);
});
/* 10-25 망령: 능력치 막대를 좌우로 끌어 종족치 조절 (0~200 눈금 · 놓으면 저장하고 다시 그림) */
{
  let dg = null;
  const valAt = (bar, x) => {
    const r = bar.getBoundingClientRect();
    return Math.max(1, Math.min(200, Math.round(((x - r.left) / r.width) * 200)));
  };
  const mv = e => {
    if (!dg || e.pointerId !== dg.id) return;
    const v = valAt(dg.bar, e.clientX);
    dg.o[dg.k] = String(v);
    if (dg.inp) dg.inp.value = v;
    const fi = dg.bar.querySelector('i');
    if (fi) fi.style.width = Math.min(100, v / 2) + '%';
    const kn = dg.bar.querySelector('.knob');
    if (kn) kn.style.left = Math.min(100, v / 2) + '%';
    dg.bar.classList.add('dragging');
    dg.bar.title = '종족치 ' + v;
  };
  $('#v-char').addEventListener('pointerdown', e => {
    const bar = e.target.closest('.bar[data-drag]');
    if (!bar || e.button !== 0) return;
    const path = bar.dataset.drag;
    const [o, k] = getRef(path);
    if (!o) return;
    e.preventDefault();
    try {
      bar.setPointerCapture(e.pointerId);
    } catch (err) {}
    dg = { bar, o, k, id: e.pointerId, t: trOf(bar), inp: bar.parentNode.querySelector(`[data-p="${CSS.escape(path)}"]`) };
    clearTimeout(rT);
    mv(e);
  });
  $('#v-char').addEventListener('pointermove', mv);
  const end = e => {
    if (!dg || e.pointerId !== dg.id) return;
    const t = dg.t;
    dg.bar.classList.remove('dragging');
    dg = null;
    save();
    if (t) refreshTrainer(t);
  };
  $('#v-char').addEventListener('pointerup', end);
  $('#v-char').addEventListener('pointercancel', end);
}
$('#v-char').addEventListener('change', e => {
  const el = e.target;
  /* 10-27 망령: 기능 확장 · 해석 차단 */
  if (el.dataset.ext) {
    const t = S.trainers[+el.dataset.i];
    const x = t && (t.ext || [])[+el.dataset.k];
    if (!x) return;
    const f = el.dataset.ext;
    if (f === 'lim') x.lim = Math.max(0, Math.min(9, Math.round(+el.value) || 0));
    else if (f === 'kind') x.kind = el.value === 'extra' ? 'extra' : 'act';
    else if (f === 'who') x.who = String(el.value || '');
    else if (f === 'src')
      x.src = String(el.value || '')
        .trim()
        .slice(0, 60);
    save();
    refreshTrainer(t);
    return;
  }
  if (el.dataset.tdexfw != null) {
    const t = S.trainers[+el.dataset.i];
    if (!t) return;
    t.dexFw = el.value === '0' ? '' : el.value;
    save();
    refreshTrainer(t);
    return;
  }
  if (el.dataset.tdexp != null) {
    const t = S.trainers[+el.dataset.i];
    if (!t) return;
    const o = Object.assign({}, t.dexFwParts || {});
    if (el.checked) o[el.dataset.dexp] = 1;
    else delete o[el.dataset.dexp];
    t.dexFwParts = o;
    save();
    return;
  }
  if (el.dataset.dexfw) {
    const t = S.trainers[+el.dataset.i];
    const P = t && t.pokemon[+el.dataset.j];
    if (!P) return;
    if (el.dataset.dexfw === 'lv') {
      if (el.value === '') delete P.dexFw;
      else P.dexFw = el.value;
      save();
      refreshTrainer(t);
      return;
    }
    const o = Object.assign({}, P.dexFwParts || {});
    if (el.checked) o[el.dataset.dexp] = 1;
    else delete o[el.dataset.dexp];
    P.dexFwParts = o;
    save();
    return;
  }
  if (el.dataset.tunecr) {
    const t = S.trainers[+el.dataset.i];
    const P = t && t.pokemon[+el.dataset.j];
    if (!P) return;
    const c = tuneOf(P, true).crit;
    const k = el.dataset.tunecr;
    const v = el.type === 'checkbox' ? el.checked : String(el.value).trim();
    if (v === '' || v === false || (k !== 'tbl' && k !== 'dmg' && el.type === 'number' && !+v)) delete c[k];
    else c[k] = el.type === 'checkbox' ? 1 : v;
    save();
    return;
  }
  if (el.dataset.tunest) {
    const t = S.trainers[+el.dataset.i];
    const P = t && t.pokemon[+el.dataset.j];
    if (!P) return;
    const v = el.value.replace(/\s+/g, '');
    const x = tuneOf(P, true).st.find(q => q.st === el.dataset.tunest);
    if (!x) return;
    if (!FRAC_RE.test(v) || !(+v.split('/')[1] > 0)) {
      toast('비율을 1/6 처럼 적어 주세요');
      el.value = x.v;
      return;
    }
    x.v = v;
    save();
    refreshTrainer(t);
    return;
  }
  if (stChange(el)) return;
  if (el.dataset.ivs) {
    const [a, b, k] = el.dataset.ivs.split('.').map(Number);
    const t = S.trainers[a];
    const P = t && t.pokemon[b];
    if (!P) return;
    let v = Math.round(+el.value);
    if (!isFinite(v)) v = 0;
    if (!P.ivs) P.ivs = [0, 0, 0, 0, 0, 0];
    P.ivs[k] = v;
    P.ivs = ivNorm(P.ivs, P);
    P.ivLog = Object.assign({}, P.ivLog || {}, { e: 1 });
    save();
    refreshTrainer(t);
    return;
  }
  if (el.dataset.tordx != null || el.dataset.tordadd != null) {
    const t = S.trainers[+(el.dataset.tordx ?? el.dataset.tordadd)];
    if (!t || !t.orders) return;
    const kind = el.dataset.kind;
    let k = el.dataset.key,
      f = +el.value;
    if (el.dataset.tordadd != null) {
      if (!el.value) return;
      [k, f] = el.value.split(':');
      f = +f;
    }
    const o = Object.assign({}, t.orders);
    const tc = tOrdTc(t),
      def = kind === 'o' ? TORD.tordOf(tc) : tc;
    const ty = Object.assign({}, o.type || {});
    if (f === def) delete ty[kind + '_' + k];
    else ty[kind + '_' + k] = f;
    if (Object.keys(ty).length) o.type = ty;
    else delete o.type;
    t.orders = o;
    save();
    refreshTrainer(t);
    return;
  }
  if (el.dataset.tord != null) {
    const t = S.trainers[+el.dataset.tord];
    if (!t) return;
    const k = el.dataset.k;
    const o = Object.assign({}, t.orders || {});
    if (k === 'preset') {
      if (!el.value) {
        delete t.orders;
        save();
        refreshTrainer(t);
        return;
      }
      o.preset = el.value;
      if (o.preset === 'manual' && o.tc == null) {
        const tc = TORD.presetTc((t.orders || {}).preset, (t.ranks || {})['지시']);
        o.tc = isNaN(tc) ? 0 : tc;
      }
    } else if (k === 'tc') o.tc = +el.value || 0;
    else o.base = Math.max(0, Math.min(9, Math.round(+el.value || 0)));
    if (o.base == null) o.base = 1;
    t.orders = o;
    save();
    refreshTrainer(t);
    return;
  }
  if (el.dataset.tmove != null) {
    const t = trOfRow(el.closest('section.folder')) || S.trainers[+el.dataset.tmove];
    if (t) {
      t.folder = el.value;
      S.ui.fclosed = S.ui.fclosed || {};
      delete S.ui.fclosed[el.value || '_none'];
      save();
      renderChar();
      const f = S.folders.find(x => x.id === el.value);
      toast(`「${t.name}」 → ${f ? f.name : '폴더 없음'}`);
    }
    return;
  }
  if (el.dataset.p) {
    const t = trOf(el);
    const m = el.dataset.p.match(/^T\.\d+\.ranks\.(.+)$/);
    if (m && t) {
      if (el.tagName === 'INPUT') {
        const v = el.value.trim().toUpperCase().replace(/\s+/g, '').replace(/＋/g, '+').replace(/[－−]/g, '-') || 'C';
        el.value = v;
        t.ranks[m[1]] = v;
      }
      applyTpl(t, m[1]);
      save();
    }
    if (t && /^T\.\d+\.dist(Adj|Note)$/.test(el.dataset.p)) {
      if (/Adj$/.test(el.dataset.p)) {
        const v = String(t.distAdj ?? '').trim();
        const n = v === '' ? NaN : Math.round(parseFloat(v.replace(/[＋+]/, '').replace('−', '-')));
        if (isFinite(n) && n !== 0) t.distAdj = n;
        else delete t.distAdj;
      } else if (!String(t.distNote || '').trim()) delete t.distNote;
      save();
      refreshTrainer(t);
    } /* 11-22 분배레벨 조정 */
    if (t && /^T\.\d+\.isock(Adj|Note)$/.test(el.dataset.p)) {
      if (/Adj$/.test(el.dataset.p)) {
        const v = String(t.isockAdj ?? '').trim();
        const n = v === '' ? NaN : Math.round(parseFloat(v.replace(/[＋+]/, '')) * 2) / 2;
        if (isFinite(n) && n !== 0) t.isockAdj = n;
        else delete t.isockAdj;
      } else if (!String(t.isockNote || '').trim()) delete t.isockNote;
      save();
      refreshTrainer(t);
    } /* 11-04 소지품 소켓 조정 */
    if (t && /^T\.\d+\.solo$/.test(el.dataset.p)) {
      for (const [n, d] of ptItems()) t.base[n] = +d || 0;
      t.misag = t.solo === 'm';
      if (t.solo === '' || t.solo === '0' || t.solo === 'm') t.solo = false;
      else if (t.solo === '2') t.solo = true;
      else if (t.solo === '3') t.solo = 3;
      applyTpl(t);
      save();
      toast(
        isMisag(t)
          ? '미사그 대학 (4+2) — PL 4체 통솔점을 맞췄습니다 · 포켓몬 「기본」 탭에서 각성체 2체를 고르세요'
          : soloN(t) === 3
            ? '1인 기준 (3체) — 6체 기준의 절반으로 맞췄습니다'
            : soloN(t)
              ? '1인 기준 (2체) 템플릿을 적용했습니다'
              : '6체 기준 템플릿을 적용했습니다'
      );
    }
    {
      const am = el.dataset.p.match(/^T\.\d+\.pokemon\.(\d+)\.awaken$/);
      if (am && t && awClassSync(t, t.pokemon[+am[1]])) save();
    }
    if (t && awSubSync(t)) save();
    clearTimeout(rT);
    if (t) setTimeout(() => refreshTrainer(t), 0);
    return;
  }
  if (el.dataset.img) {
    const f = el.files[0];
    if (!f) return;
    setTrainerImg(S.trainers[+el.dataset.img], f);
  }
  if (el.dataset.stf) {
    const f = el.files[0];
    if (!f) return;
    const t = S.trainers[+el.dataset.stf];
    uploadStand(t, f)
      .then(u => {
        const inp = $('#stu-' + t.id);
        if (inp) inp.value = u;
        const l = $('#stl-' + t.id);
        if (l && !l.value) l.value = f.name.replace(/\.[^.]+$/, '');
        toast('올렸습니다 — 「추가」를 누르세요');
      })
      .catch(e => toast('올리지 못했습니다: ' + e.message));
    el.value = '';
  }
  if (el.dataset.pstf) {
    const f = el.files[0];
    if (!f) return;
    const [a, b] = el.dataset.pstf.split('.').map(Number);
    const t = S.trainers[a],
      p = t && t.pokemon[b];
    if (!p) return;
    uploadStand(p, f)
      .then(u => {
        const inp = $('#pstu-' + p.id);
        if (inp) inp.value = u;
        const l = $('#pstl-' + p.id);
        if (l && !l.value) l.value = f.name.replace(/\.[^.]+$/, '');
        toast('올렸습니다 — 「추가」를 누르세요');
      })
      .catch(e => toast('올리지 못했습니다: ' + e.message));
    el.value = '';
    return;
  }
  if (el.dataset.pimg) {
    const f = el.files[0];
    if (!f) return;
    const [a, b] = el.dataset.pimg.split('.').map(Number);
    setPokeImg(a, b, f);
  }
});
/* 스탠딩 그림을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 올리고 공개 주소를 돌려준다 */
/* 10-26 용량 점검: 올리는 그림은 전부 webp 로 줄인다 (긴 변 2048 · 품질 .86 · 투명 배경 유지). gif · svg 는 그대로. 줄인 게 더 크면 원본 */
async function shrinkUpload(blob, maxSide) {
  try {
    if (!/^image\/(png|jpe?g|webp|bmp)$/i.test(blob.type || '')) return blob;
    const bmp = await createImageBitmap(blob);
    const sc = Math.min(1, (maxSide || 2048) / Math.max(bmp.width, bmp.height));
    if (sc >= 1 && blob.type === 'image/webp') return blob;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(bmp.width * sc));
    cv.height = Math.max(1, Math.round(bmp.height * sc));
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const out = await new Promise(r => cv.toBlob(r, 'image/webp', 0.86));
    return out && out.size < blob.size ? out : blob;
  } catch (e) {
    return blob;
  }
}
async function putImg(path, blob) {
  const c = window.MKM_CONFIG || {};
  if (!c.supabaseUrl || !c.supabaseKey) throw new Error('공유 저장소 설정이 없습니다 (js/config.js)');
  blob = await shrinkUpload(blob, 2048);
  const ty = blob.type || 'image/png';
  const ext = ty.includes('png') ? 'png' : ty.includes('webp') ? 'webp' : ty.includes('gif') ? 'gif' : 'jpg';
  const full = `${path}.${ext}`;
  const base = c.supabaseUrl.replace(/\/$/, '');
  const r = await fetch(`${base}/storage/v1/object/oremas/${full}`, {
    method: 'POST',
    headers: { apikey: c.supabaseKey, Authorization: 'Bearer ' + c.supabaseKey, 'Content-Type': ty, 'cache-control': '31536000' },
    body: blob
  });
  if (!r.ok) {
    let m = '';
    try {
      m = (await r.json()).message || '';
    } catch (e) {}
    if (/bucket not found/i.test(m)) m = '그림 저장소(버킷 oremas)가 없습니다 — supabase/schema.sql 을 다시 실행해 주세요';
    throw new Error(m || 'HTTP ' + r.status);
  }
  return `${base}/storage/v1/object/public/oremas/${full}`;
}
/* 스탠딩 그림(트레이너·포켓몬)을 공유 저장소(Supabase Storage, 버킷 oremas — 오레마스와 같은 프로젝트)에 원본 그대로 올리고 공개 주소를 돌려준다. 투명 배경이 그대로 남는다 */
async function uploadStand(o, f) {
  if (!/^image\//.test(f.type)) throw new Error('그림 파일만');
  if (f.size > 5 * 1024 * 1024) throw new Error('5MB 이하만');
  return putImg(`stands/${o.id}_${Date.now().toString(36)}`, f);
}
/* 시트 이미지(data URL)를 공유 저장소로: 문서가 1.5MB 를 넘지 않게 */
async function hostImg(tag, id, dataUrl) {
  const b = await (await fetch(dataUrl)).blob();
  return putImg(`maker/${tag}_${id}_${Date.now().toString(36)}`, b);
}
const shHostOn = () => {
  try {
    return !!(SH.on && SH.canWrite);
  } catch (e) {
    return false;
  }
};
/* 10-23 이그레스: 예전에 시트 안(data URL)에 넣은 그림을 공유 저장소로 옮기고 주소만 남긴다 — 시트를 받을 때마다 그림까지 받지 않게.
   공유 DB 를 다 읽은 뒤 한 장씩 천천히. 못 옮긴 그림은 그대로 두고 다음에 열 때 다시 해 본다 */
let shMigBusy = false;
async function shMigrateImgs() {
  if (shMigBusy || !shHostOn()) return;
  shMigBusy = true;
  let n = 0;
  const isD = u => /^data:image\//.test(String(u || ''));
  const jobs = [];
  for (const f of S.folders) if (f.deco && isD(f.deco.bg)) jobs.push([f.deco, 'bg', 'fb', f.id, null]);
  for (const t of S.trainers) {
    if (isD(t.image)) jobs.push([t, 'image', 't', t.id, t]);
    if (t.deco && isD(t.deco.bg)) jobs.push([t.deco, 'bg', 'tb', t.id, t]);
    for (const p of t.pokemon || []) {
      if (isD(p.image)) jobs.push([p, 'image', 'p', p.id, t]);
      for (const fm of p.forms || []) if (fm && isD(fm.image)) jobs.push([fm, 'image', 'p', fm.id || p.id, t]);
    }
    for (const fm of t.sforms || []) if (fm && isD(fm.image)) jobs.push([fm, 'image', 'p', fm.id || t.id, t]);
  }
  try {
    for (const [o, k, tag, id, t] of jobs) {
      if (!shHostOn()) break;
      const u = o[k];
      try {
        const url = await hostImg(tag, id, u);
        if (o[k] !== u) continue;
        o[k] = url;
        n++;
        save();
        if (t) refreshTrainer(t);
      } catch (e) {
        console.warn('[그림 옮기기]', e);
      }
    }
  } finally {
    shMigBusy = false;
  }
  if (n) {
    renderAll();
    toast(`예전 시트 그림 ${n}장을 공유 저장소로 옮겼습니다`);
  }
}
/* 10-23 이그레스: 공유 중이면 먼저 저장소에 올리고 주소만 저장한다 (예전엔 그림째 한 번 저장한 뒤 바꿔서, 그림 든 시트가 모두에게 한 번씩 갔다). 못 올리면 예전처럼 시트 안에 */
const IMG_TK = new WeakMap();
function setImgOf(o, tag, u, t) {
  if (!shHostOn()) {
    o.image = u;
    save();
    refreshTrainer(t);
    return;
  }
  const tk = {};
  IMG_TK.set(o, tk);
  toast('그림을 공유 저장소에 올리는 중…');
  hostImg(tag, o.id, u)
    .then(url => {
      if (IMG_TK.get(o) !== tk) return;
      o.image = url;
      save();
      refreshTrainer(t);
    })
    .catch(e => {
      if (IMG_TK.get(o) !== tk) return;
      o.image = u;
      save();
      refreshTrainer(t);
      toast('그림을 공유 저장소에 올리지 못해 시트 안에 넣었습니다 (' + e.message + ')');
    });
}
/* 10-21 망령: 폼체인지·메가진화 그림도 포켓몬 그림처럼 (클릭 · 끌어다 놓기 · 붙여넣기) */
function setFormImg(key, f) {
  const ps = String(key).split('.');
  const a = +ps[0],
    k = +ps[2];
  const t = S.trainers[a];
  const SHF = ps[1] === 's';
  const p = SHF ? null : t && t.pokemon[+ps[1]];
  const fm = SHF ? t && (t.sforms || [])[k] : p && (p.forms || [])[k];
  /* 11-14 「i.s.k」 = 트레이너 공유 폼 */ if (!fm || !f || !/^image\//.test(f.type)) return false;
  if (!fm.id) fm.id = ((SHF ? t.id : p.id) || uid()) + '_f' + uid();
  readImg(f, 480, 'image/webp', u => {
    setImgOf(fm, 'p', u, t);
    toast(`「${fm.name || '폼'}」 그림을 넣었습니다`);
  });
  return true;
}
document.addEventListener(
  'drop',
  e => {
    const z = e.target.closest && e.target.closest('[data-fdrop]');
    if (!z) return;
    const f = e.dataTransfer && e.dataTransfer.files && [...e.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (!f) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setFormImg(z.dataset.fdrop, f);
  },
  true
);
document.addEventListener(
  'dragover',
  e => {
    const z = e.target.closest && e.target.closest('[data-fdrop]');
    document.querySelectorAll('.fmrow.fdz').forEach(x => {
      if (x !== z) x.classList.remove('fdz');
    });
    if (z) {
      e.preventDefault();
      z.classList.add('fdz');
    }
  },
  true
);
document.addEventListener(
  'dragleave',
  e => {
    const z = e.target.closest && e.target.closest('[data-fdrop]');
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('fdz');
  },
  true
);
document.addEventListener('drop', () => document.querySelectorAll('.fmrow.fdz').forEach(x => x.classList.remove('fdz')));
document.addEventListener(
  'paste',
  e => {
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith('image/'));
    if (!it) return;
    const ae = document.activeElement;
    if (ae && ae.matches && ae.matches('input,textarea,select')) return;
    const z = (ae && ae.closest && ae.closest('[data-fdrop]')) || (window.__hoverFm && window.__hoverFm.isConnected ? window.__hoverFm : null);
    if (!z) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setFormImg(z.dataset.fdrop, it.getAsFile());
  },
  true
);
document.addEventListener('mouseover', e => {
  window.__hoverFm = (e.target.closest && e.target.closest('[data-fdrop]')) || null;
});
function setTrainerImg(t, f) {
  readImg(f, 640, 'image/webp', u => setImgOf(t, 't', u, t));
}
/* 11-28 망령 「포트레이트 따기 … 곧바로 연계」: 「이미지 삽입」 옆 「✂ 자르기」 — 웹툴 사이트의 포트레이트 따기(OM_CUTTER · /oremas/js/cutter.js)에서 자른 그림을 같은 길로 넣는다 */
async function cutImage(label, use) {
  if (!window.OM_CUTTER) return toast('포트레이트 따기를 불러오지 못했습니다');
  const fs = await window.OM_CUTTER.open({ label });
  if (fs.length) use(fs[0]);
}
function setPokeImg(a, b, f) {
  const t = S.trainers[a],
    p = t && t.pokemon[b];
  if (!p || !f || !/^image\//.test(f.type)) return false;
  readImg(f, 480, 'image/webp', u => {
    setImgOf(p, 'p', u, t);
    toast('이미지를 넣었습니다');
  });
  return true;
}
/* 끌어다 놓기 · 붙여넣기 (포켓몬 카드 위에서) */
document.addEventListener('dragover', e => {
  if (e.target.closest && e.target.closest('[data-pdrop],.pk')) e.preventDefault();
});
document.addEventListener('drop', e => {
  const z = e.target.closest && (e.target.closest('[data-pdrop]') || e.target.closest('.pk'));
  if (!z) return;
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;
  e.preventDefault();
  const key =
    z.dataset.pdrop ||
    (() => {
      const art = z.closest('.pk');
      const pl = art && art.closest('.plist');
      if (!pl) return null;
      return pl.dataset.i + '.' + [...pl.querySelectorAll(':scope>.pk')].indexOf(art);
    })();
  if (!key) return;
  const [a, b] = key.split('.').map(Number);
  setPokeImg(a, b, f);
});
document.addEventListener('paste', e => {
  const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.type.startsWith('image/'));
  if (!it) return;
  const ae = document.activeElement;
  if (ae && ae.matches && ae.matches('input,textarea,select') && !ae.matches('[data-pdrop]')) return;
  const art = (ae && ae.closest && ae.closest('.pk')) || window.__hoverPk;
  if (!art) return;
  const pl = art.closest('.plist');
  if (!pl) return;
  const b = [...pl.querySelectorAll(':scope>.pk')].indexOf(art);
  if (b < 0) return;
  e.preventDefault();
  setPokeImg(+pl.dataset.i, b, it.getAsFile());
});
document.addEventListener('mouseover', e => {
  const art = e.target.closest && e.target.closest('.pk');
  if (art) window.__hoverPk = art;
});
/* 포켓몬 스탠딩 (오레마스 무대 · RP 에서 포켓몬이 말할 때) — 트레이너와 같은 모양 */
function pStandsHtml(p, ti, pi) {
  return `<div class="pstands"><div class="row" style="gap:6px;align-items:baseline"><b class="small">스탠딩</b><span class="small muted">오레마스 무대용 · 투명 PNG 그대로 · 없으면 위 이미지로 선다</span></div>${standsHtml(p, 'p:' + ti + '.' + pi)}</div>`;
}
/* 스탠딩 편집 (트레이너·포켓몬 공통): 카드에서 라벨·보정·모양을 바로 고치고, 그림 여러 장·폴더째 끌어 놓아 한 번에 올린다 (파일 이름 = 라벨, 같은 라벨은 그림만 교체) */
function standsHtml(o, key, full) {
  const st = o.stands || [],
    a = +o.standActive || 0;
  const K = `data-sk="${key}"`;
  const LIM = 2;
  const show =
    full || st.length <= LIM
      ? st.map((s, k) => k)
      : [Math.min(a, st.length - 1), ...st.map((s, k) => k).filter(k => k !== Math.min(a, st.length - 1))].slice(0, LIM).sort((x, y) => x - y);
  return `<div class="stdw" data-sdz="${key}"><div class="stdz"><div class="stdzt"><b>그림을 여기로 끌어 놓기</b><span class="small muted">여러 장 · 폴더째 · 파일 이름이 라벨 · 같은 라벨은 그림만 바뀜</span></div>
  <div class="row" style="gap:4px"><label class="btn sm pri" tabindex="0" role="button" data-kbd>파일 고르기<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" multiple data-sfiles="${key}" hidden></label><label class="btn sm" tabindex="0" role="button" data-kbd>폴더 올리기<input type="file" webkitdirectory multiple data-sfiles="${key}" hidden></label><span class="small muted" data-sprog="${key}"></span></div></div>
  ${
    st.length
      ? `<div class="stgrid">${show
          .map(k => [st[k], k])
          .map(
            ([
              s,
              k
            ]) => `<div class="stc ${k === a ? 'on' : ''}"><div class="stcp" data-act="sdef" ${K} data-k="${k}" title="눌러서 기본 그림으로">${s.src ? `<img src="${esc(s.src)}" alt="" loading="lazy">` : ''}${k === a ? '<span class="stcon">기본</span>' : ''}</div>
   <div class="stcf"><input type="text" value="${esc(s.label || '')}" data-sl="${key}:${k}" placeholder="라벨" aria-label="라벨"><input type="number" value="${+s.point || 0}" data-spt="${key}:${k}" title="보정 — 위로 올릴 px (음수면 내림)" aria-label="보정"></div>
   <div class="stcf"><select data-skd="${key}:${k}" title="오레마스 무대에 서는 모양 — 자동: 그림 비율 · 스탠딩: 틀 없이 전신 · 초상: 네모 틀">${[
     ['', '모양 자동'],
     ['stand', '스탠딩'],
     ['portrait', '초상 틀']
   ]
     .map(([v, n]) => `<option value="${v}" ${(s.kind || '') === v ? 'selected' : ''}>${n}</option>`)
     .join(
       ''
     )}</select><label class="btn sm ghost" title="그림만 바꾸기" tabindex="0" role="button" data-kbd>교체<input type="file" accept="image/png,image/webp,image/gif,image/jpeg" data-srep="${key}:${k}" hidden></label><button type="button" class="btn sm ghost danger" data-act="sdel" ${K} data-k="${k}" aria-label="삭제">×</button></div></div>`
          )
          .join(
            ''
          )}</div>${!full && st.length > LIM ? `<button type="button" class="btn sm stmgr" data-act="smgr" ${K}>스탠딩 관리 · 전체 ${st.length}장 보기 (+${st.length - show.length})</button>` : ''}`
      : '<div class="small muted" style="margin-top:6px">아직 없음 — 없으면 오레마스에서 위 이미지(초상)로 선다</div>'
  }
  <details class="stmore"><summary class="small muted">그림 주소로 추가</summary><div class="row" style="gap:4px;margin-top:4px"><input type="text" data-sul="${key}" placeholder="라벨" style="width:100px"><input type="text" data-suu="${key}" placeholder="https://…" style="flex:1;min-width:120px"><button type="button" class="btn sm" data-act="sadd" ${K}>추가</button></div></details></div>`;
}
/* 스탠딩 칸 입력 (시트 · 관리 창 공통) — 처리했으면 true */
function stChange(el) {
  if (el.dataset.sfiles) {
    const fs = [...el.files];
    el.value = '';
    stUpload(el.dataset.sfiles, fs);
    return true;
  }
  if (el.dataset.srep || el.dataset.sl != null || el.dataset.spt != null || el.dataset.skd != null) {
    const ref = el.dataset.srep || el.dataset.sl || el.dataset.spt || el.dataset.skd;
    const c = ref.lastIndexOf(':');
    const R = stRef(ref.slice(0, c));
    const s = R.o && (R.o.stands || [])[+ref.slice(c + 1)];
    if (!s) return true;
    if (el.dataset.srep) {
      const f = el.files[0];
      el.value = '';
      if (!f) return true;
      toast('올리는 중…');
      uploadStand(R.o, f)
        .then(u => {
          s.src = u;
          save();
          refreshTrainer(R.t);
          toast('그림을 바꿨습니다');
        })
        .catch(er => toast('올리지 못했습니다: ' + er.message));
      return true;
    }
    if (el.dataset.sl != null) s.label = el.value.trim() || '기본';
    else if (el.dataset.spt != null) s.point = +el.value || 0;
    else {
      if (el.value) s.kind = el.value;
      else delete s.kind;
    }
    save();
    return true;
  }
  return false;
}
async function stAct(b) {
  const R = stRef(b.dataset.sk);
  const o = R.o;
  if (!o) return;
  o.stands = o.stands || [];
  const k2 = +b.dataset.k;
  if (b.dataset.act === 'sdef') o.standActive = k2;
  else if (b.dataset.act === 'sdel') {
    const s = o.stands[k2];
    if (!s || !(await ask(`스탠딩 「${esc(s.label || '기본')}」을(를) 지울까요?`, '삭제'))) return;
    o.stands.splice(k2, 1);
    if (+o.standActive > k2 || +o.standActive >= o.stands.length) o.standActive = Math.max(0, (+o.standActive || 0) - 1);
  } else {
    const u = (((b.closest('.stdw') || document).querySelector(`[data-suu="${b.dataset.sk}"]`) || {}).value || '').trim();
    if (!/^https?:\/\//.test(u)) {
      toast('그림 주소(https://…)가 필요합니다. 파일은 끌어 놓거나 「파일 고르기」로');
      return;
    }
    const l =
      (((b.closest('.stdw') || document).querySelector(`[data-sul="${b.dataset.sk}"]`) || {}).value || '').trim() ||
      decodeURIComponent(u.split('?')[0].split('/').pop() || '').replace(/\.[^.]+$/, '') ||
      '기본';
    o.stands.push({ label: l, src: u, point: 0 });
    if (o.stands.length === 1) o.standActive = 0;
  }
  save();
  refreshTrainer(R.t);
}
/* 11-07 망령 「스탠딩이 세로로 쭉 늘어난다 — 기본은 2개만, 더 보려면 관리 창」: 시트에는 기본 그림 + 1장, 나머지는 「스탠딩 관리」 창에서 (창 안 입력 · 버튼은 stChange · stAct 를 같이 쓴다) */
function openStMgr(key) {
  const R = stRef(key);
  if (!R.o) return;
  const l = openModal(
    `<div class="mhead"><h2>스탠딩 관리 — ${esc(R.o.name || '')}</h2><span class="sp"></span><button class="btn ghost" data-x>닫기</button></div><div class="mbody" data-stmgr="${key}">${standsHtml(R.o, key, true)}</div>`,
    { wide: true }
  );
  l.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) {
      closeModal();
      return;
    }
    const b = e.target.closest('[data-act]');
    if (b && ['sdef', 'sdel', 'sadd'].includes(b.dataset.act)) await stAct(b);
  });
  l.addEventListener('change', e => stChange(e.target));
}
function stMgrRedraw() {
  const mb = document.querySelector('[data-stmgr]');
  if (!mb) return;
  const R = stRef(mb.dataset.stmgr);
  if (R.o) mb.innerHTML = standsHtml(R.o, mb.dataset.stmgr, true);
}
function stRef(key) {
  const [w, x] = String(key).split(':');
  if (w === 't') {
    const t = S.trainers[+x];
    return { o: t, t };
  }
  const [a, c] = String(x).split('.').map(Number);
  const t = S.trainers[a];
  return { o: t && t.pokemon[c], t };
}
const isImgF = f => f && (/^image\//.test(f.type || '') || /\.(png|webp|gif|jpe?g)$/i.test(f.name || ''));
/* 끌어 놓은 파일·폴더 → 그림 파일 목록. items 는 drop 순간에만 읽히니 await 전에 entry 로 바꿔 둔다 */
async function dropImgFiles(dt) {
  const ents = [...(dt.items || [])].map(it => it.kind === 'file' && it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  const plain = [...(dt.files || [])];
  if (!ents.length) return plain.filter(isImgF);
  const out = [];
  const walk = async e => {
    if (e.isFile) {
      const f = await new Promise((r, j) => e.file(r, j));
      if (isImgF(f)) out.push(f);
    } else if (e.isDirectory) {
      const rd = e.createReader();
      for (;;) {
        const xs = await new Promise((r, j) => rd.readEntries(r, j));
        if (!xs.length) break;
        for (const x of xs) await walk(x);
      }
    }
  };
  for (const e of ents) await walk(e);
  return out;
}
async function stUpload(key, files) {
  const R = stRef(key);
  if (!R.o) return;
  files = files
    .filter(isImgF)
    .sort((x, y) => (x.webkitRelativePath || x.name).localeCompare(y.webkitRelativePath || y.name, 'ko', { numeric: true }));
  if (!files.length) {
    toast('그림 파일이 없습니다');
    return;
  }
  const urls = [];
  let done = 0,
    fail = 0,
    nx = 0;
  const tick = () => {
    const pg = $(`[data-sprog="${key}"]`);
    if (pg) pg.textContent = done < files.length ? `올리는 중 ${done}/${files.length}${fail ? ` · 실패 ${fail}` : ''}` : '';
  };
  tick();
  const work = async () => {
    while (nx < files.length) {
      const k = nx++;
      try {
        urls[k] = await uploadStand(R.o, files[k]);
      } catch (e) {
        fail++;
        toast(files[k].name + ' — ' + e.message);
      }
      done++;
      tick();
    }
  };
  await Promise.all([work(), work(), work()]);
  const o = R.o;
  o.stands = o.stands || [];
  const had = o.stands.length;
  let add = 0,
    rp = 0;
  files.forEach((f, k) => {
    const u = urls[k];
    if (!u) return;
    const label = f.name.replace(/\.[^.]+$/, '').trim() || '기본';
    const s = o.stands.find(x => (x.label || '') === label);
    if (s) {
      s.src = u;
      rp++;
    } else {
      o.stands.push({ label, src: u, point: 0 });
      add++;
    }
  });
  if (!had && o.stands.length) o.standActive = 0;
  if (add || rp) {
    save();
    refreshTrainer(R.t);
  }
  toast(`스탠딩 ${add}장 추가${rp ? ` · ${rp}장 교체` : ''}${fail ? ` · ${fail}장 실패` : ''}`);
}
document.addEventListener(
  'dragover',
  e => {
    const z = e.target.closest && e.target.closest('[data-sdz]');
    if (!z || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    z.classList.add('over');
  },
  true
);
document.addEventListener(
  'dragleave',
  e => {
    const z = e.target.closest && e.target.closest('[data-sdz]');
    if (z && !z.contains(e.relatedTarget)) z.classList.remove('over');
  },
  true
);
document.addEventListener(
  'drop',
  e => {
    const z = e.target.closest && e.target.closest('[data-sdz]');
    if (!z) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    z.classList.remove('over');
    dropImgFiles(e.dataTransfer).then(fs => stUpload(z.dataset.sdz, fs));
  },
  true
);
function readImg(f, max, type, cb) {
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'),
        s = Math.min(1, max / Math.max(im.width, im.height));
      c.width = Math.max(1, Math.round(im.width * s));
      c.height = Math.max(1, Math.round(im.height * s));
      const g = c.getContext('2d');
      if (type === 'image/jpeg') {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(im, 0, 0, c.width, c.height);
      let u = c.toDataURL(type, 0.85);
      if (type !== 'image/jpeg' && /^data:image\/jpeg/.test(u)) u = c.toDataURL('image/png');
      cb(u);
    };
    im.onerror = () => toast('이미지를 읽지 못했습니다');
    im.src = rd.result;
  };
  rd.readAsDataURL(f);
}
$('#v-char').addEventListener('click', async e => {
  if (Date.now() - dragEnd < 300) return;
  const ft = e.target.closest('[data-ftog]');
  if (ft && !e.target.closest('button,input,select,label,textarea')) {
    S.ui.fclosed = S.ui.fclosed || {};
    const k = ft.dataset.ftog;
    S.ui.fclosed[k] = !S.ui.fclosed[k];
    if (S.ui.fclosed[k]) {
      const ids = k === '_none' ? [''] : [k, ...fDesc(k)];
      for (const id of ids) if (id) S.ui.fclosed[id] = true;
      for (const t of S.trainers)
        if (ids.includes(tFolder(t))) {
          t.open = false;
          for (const p of t.pokemon) p.open = false;
        }
    }
    save();
    renderChar();
    return;
  }
  const tg = e.target.closest('[data-tog]');
  if (tg && !e.target.closest('button,input,select,label,textarea')) {
    const [o, k] = getRef(tg.dataset.tog);
    o[k].open = !o[k].open;
    save();
    const t = trOf(tg);
    t ? refreshTrainer(t) : renderChar();
    return;
  }
  const pt = e.target.closest('[data-ptab]');
  if (pt) {
    const T = S.trainers[+pt.dataset.i];
    T.pokemon[+pt.dataset.j].tab = pt.dataset.ptab;
    save();
    refreshTrainer(T);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const i = +b.dataset.i,
    j = +b.dataset.j,
    k = b.dataset.k,
    T = S.trainers[i],
    P = T && T.pokemon[j];
  const rf = () => {
    save();
    T ? refreshTrainer(T) : renderChar();
  };
  /* 11-14 폼 칸의 주인: 포켓몬(P.forms) 또는 트레이너 공유 폼(data-j="s" → T.sforms) */
  const FO =
    b.dataset.j === 's'
      ? T
        ? {
            get forms() {
              return T.sforms || (T.sforms = []);
            },
            set forms(v) {
              T.sforms = v;
            }
          }
        : null
      : P;
  switch (b.dataset.act) {
    case 'fav':
      FAV.toggle(b.dataset.fk, b.dataset.fid);
      break;
    case 'fhide':
      openFHide();
      break;
    case 'cqClear':
      CQ = '';
      renderChar();
      break;
    case 'introtog': {
      const open = INTRO.first || localStorage.getItem('mkm_intro_open') === '1';
      INTRO.first = false;
      lsSet('mkm_intro_open', open ? '0' : '1');
      renderChar();
      break;
    }
    case 'histT':
      if (T) openHistory('trainers', T.id, '트레이너 ' + (T.name || '이름 없음'));
      break;
    case 'histP':
      if (T && P) openHistory('pokemon', P.id, `${T.name || '이름 없음'} › ${P.name || '이름 없음'}`);
      break;
    case 'chkF':
      openFolderCheck(b.dataset.f || '');
      break;
    case 'favtog':
      lsSet('mkm_fav_open', localStorage.getItem('mkm_fav_open') === '0' ? '1' : '0');
      renderChar();
      break;
    case 'favgo': {
      const L = FAV.get().filter(f => FAV.label(f) != null);
      const f = L[+b.dataset.i];
      if (f) FAV.go(f);
      break;
    }
    case 'favdel': {
      e.stopPropagation();
      const L = FAV.get().filter(f => FAV.label(f) != null);
      L.splice(+b.dataset.i, 1);
      FAV.set(L);
      renderChar();
      break;
    }
    case 'addT': {
      const t = newTrainer();
      S.trainers.push(t);
      S.ui.fclosed = S.ui.fclosed || {};
      delete S.ui.fclosed._none;
      save();
      renderChar();
      goNew('tr-' + t.id, 'tn-' + t.id);
      break;
    }
    case 'addF': {
      const name = await askText('새 폴더', '폴더 이름 (예: 3월 세션, PL 홍길동)');
      if (name) {
        S.folders.push({ id: uid(), name });
        save();
        renderChar();
      }
      break;
    }
    case 'addTin': {
      const t = newTrainer();
      t.folder = b.dataset.f || '';
      S.trainers.push(t);
      S.ui.fclosed = S.ui.fclosed || {};
      delete S.ui.fclosed[b.dataset.f || '_none'];
      save();
      renderChar();
      goNew('tr-' + t.id, 'tn-' + t.id);
      break;
    }
    case 'decoF': {
      const f = S.folders.find(x => x.id === b.dataset.f);
      if (!f) break;
      openTDeco(
        f,
        () => {
          save();
          renderChar();
        },
        1
      );
      break;
    }
    case 'renF': {
      const f = S.folders.find(x => x.id === b.dataset.f);
      if (!f) break;
      const name = await askText('폴더 이름 바꾸기', '폴더 이름', f.name);
      if (name) {
        f.name = name;
        save();
        renderChar();
      }
      break;
    }
    case 'delF': {
      const f = S.folders.find(x => x.id === b.dataset.f);
      if (!f) break;
      const n = S.trainers.filter(t => t.folder === f.id).length;
      const up = fById(fPar(f));
      const kids = fKids(f.id);
      if (
        await ask(
          `폴더 「${esc(f.name)}」를 삭제할까요?<br><span class="small muted">안에 있던 트레이너 ${n}명${kids.length ? `과 하위 폴더 ${kids.length}개` : ''}는 지워지지 않고 ${up ? `상위 폴더 「${esc(up.name || '')}」` : '「폴더 없음」'}으로 옮겨집니다. 5초 안에 「실행 취소」로 되돌릴 수 있습니다.</span>`,
          '폴더 삭제'
        )
      ) {
        const at = S.folders.indexOf(f);
        const movedT = S.trainers.filter(t => t.folder === f.id);
        S.trainers.forEach(t => {
          if (t.folder === f.id) t.folder = up ? up.id : '';
        });
        kids.forEach(k => {
          if (up) k.parent = up.id;
          else delete k.parent;
        });
        S.folders = S.folders.filter(x => x !== f);
        save();
        renderChar();
        undoDel(`폴더 「${f.name || ''}」 삭제`, () => {
          if (S.folders.includes(f)) return;
          S.folders.splice(Math.min(at, S.folders.length), 0, f);
          movedT.forEach(t => {
            if (S.trainers.includes(t)) t.folder = f.id;
          });
          kids.forEach(k => {
            if (S.folders.includes(k)) k.parent = f.id;
          });
          S.ui.fclosed = S.ui.fclosed || {};
          delete S.ui.fclosed[f.id];
          save();
          renderChar();
          toast('되살렸습니다');
        });
      }
      break;
    }
    case 'addFin': {
      const p = fById(b.dataset.f);
      if (!p) break;
      const name = await askText('하위 폴더', `「${p.name || ''}」 안에 만들 폴더 이름`);
      if (name) {
        const at = S.folders.indexOf(p) + 1 + fDesc(p.id).length;
        S.folders.splice(at, 0, { id: uid(), name, parent: p.id });
        S.ui.fclosed = S.ui.fclosed || {};
        delete S.ui.fclosed[p.id];
        save();
        renderChar();
      }
      break;
    }
    case 'moveF': {
      const f = fById(b.dataset.f);
      if (!f) break;
      const v = await askFolder(`「${f.name || ''}」 옮기기`, '어느 폴더 안으로 옮길까요?', fPar(f), f.id);
      if (v == null) break;
      if (v) f.parent = v;
      else delete f.parent;
      S.ui.fclosed = S.ui.fclosed || {};
      if (v) delete S.ui.fclosed[v];
      save();
      renderChar();
      const p = fById(v);
      toast(`「${f.name}」 → ${p ? fPath(p) : '맨 위'}`);
      break;
    }
    case 'delT':
      if (await ask(`트레이너 「${esc(T.name)}」와 소속 포켓몬 ${T.pokemon.length}체를 모두 삭제할까요?${delHint()}`, '삭제')) {
        const at = S.trainers.indexOf(T);
        S.trainers = S.trainers.filter(x => x !== T);
        save();
        renderChar();
        undoDel(`「${T.name || '이름 없음'}」 삭제`, () => {
          if (S.trainers.includes(T)) return;
          S.trainers.splice(Math.min(at, S.trainers.length), 0, T);
          save();
          renderChar();
          goNew('tr-' + T.id);
          toast('되살렸습니다');
        });
      }
      break;
    case 'privP': {
      if (!P) break;
      if (!P.priv && !ME.hash) {
        toast('먼저 「서명」에 이름과 비밀구를 적어 주세요 — 숨긴 포켓몬은 같은 서명과 GM 만 봅니다');
        break;
      }
      if (P.priv) {
        delete P.priv;
        delete P.owner;
      } else {
        P.priv = true;
        P.owner = ME.hash;
      }
      save();
      renderChar();
      toast(P.priv ? `「${P.name || '이름 없음'}」 숨김 — 주인과 GM 만 봅니다 (세션 노트 · 웹툴도)` : `「${P.name || '이름 없음'}」 공개`);
      break;
    }
    case 'cardT': {
      openTrainerCard(T);
      break;
    }
    case 'dupT': {
      const c = clone(T);
      c.id = uid();
      c.name += ' (복사)';
      c.pokemon.forEach(p => (p.id = uid()));
      S.trainers.splice(i + 1, 0, c);
      save();
      renderChar();
      break;
    }
    case 'noimg':
      T.image = '';
      rf();
      break;
    case 'imgCut':
      cutImage('트레이너 그림', f => setTrainerImg(T, f));
      break;
    case 'ivHatch':
      if (P) openIvHatch(T, P);
      break;
    case 'ivClear':
      if (P && (await ask('개체값을 비울까요? (0 으로)', '비우기'))) {
        delete P.ivs;
        delete P.ivLog;
        rf();
      }
      break;
    case 'fldAdd':
    case 'fldEdit': {
      if (e.target.closest('[data-act="fldDel"]')) break;
      const o = P || T;
      if (!o) break;
      openFieldEditor(o, b.dataset.act === 'fldEdit' ? +b.dataset.k : null, rf);
      break;
    }
    case 'extAdd': {
      if (!T) break;
      T.ext = T.ext || [];
      openPicker('moves', {
        title: '기능 확장 기술',
        multi: true,
        hideOrig: false,
        chosen: () => new Set((T.ext || []).map(x => x.mv)),
        onPick: n => {
          if ((T.ext || []).length >= 12) return toast('기능 확장은 12개까지');
          T.ext.push({ mv: n, lim: 1, kind: 'act', who: '', src: '' });
          rf();
        },
        onRemove: n => {
          T.ext = (T.ext || []).filter(x => x.mv !== n);
          rf();
        }
      });
      break;
    }
    case 'extAddP': {
      if (!T || !P) break;
      T.ext = T.ext || [];
      const pid = P.id;
      openPicker('moves', {
        title: `기능 확장 기술 · ${P.name || '이 포켓몬'}`,
        multi: true,
        hideOrig: false,
        chosen: () => new Set((T.ext || []).filter(x => x.who === pid).map(x => x.mv)),
        onPick: n => {
          if ((T.ext || []).length >= 12) return toast('기능 확장은 12개까지');
          T.ext.push({ mv: n, lim: 1, kind: 'act', who: pid, src: '' });
          rf();
        },
        onRemove: n => {
          T.ext = (T.ext || []).filter(x => !(x.mv === n && x.who === pid));
          rf();
        }
      });
      break;
    } /* 11-01 망령: 기술 탭에서 이 포켓몬 기능 확장 */
    case 'extDel': {
      const x = T && (T.ext || [])[+b.dataset.k];
      if (!x) break;
      T.ext = T.ext.filter(y => y !== x);
      rf();
      break;
    }
    case 'spAdd':
    case 'spEdit': {
      if (e.target.closest('[data-act="spDel"]')) break;
      if (!T) break;
      openSpEditor(T, b.dataset.act === 'spEdit' ? +b.dataset.k : null, rf);
      break;
    }
    case 'deckAdd': {
      if (!T) break;
      T.deck = T.deck || [];
      openPicker('cards', {
        title: '덱에 넣을 카드',
        multi: true,
        chosen: () => new Set((T.deck || []).map(x => x.n)),
        onPick: n => {
          const r = idx.cards && idx.cards.get(n);
          T.deck.push({ n, q: Math.max(1, Math.round(+(r && r[7])) || 1) });
          rf();
        },
        onRemove: n => {
          T.deck = T.deck.filter(x => x.n !== n);
          rf();
        }
      });
      break;
    }
    case 'deckQ': {
      if (!T || !T.deck) break;
      const x = T.deck[+b.dataset.k];
      if (!x) break;
      x.q = Math.max(0, Math.min(99, (+x.q || 0) + (+b.dataset.d || 0)));
      rf();
      break;
    }
    case 'deckCard': {
      if (!T || !T.deck) break;
      const x = T.deck[+b.dataset.k];
      if (!x) break;
      if (!ME.gm) {
        toast('카드는 「DB」 탭의 카드 DB 에서 고친다');
        break;
      }
      {
        const i = S.db.cards.findIndex(r => r[1] === x.n);
        if (i >= 0) openEdit('cards', i, { onSaved: rf });
        else openEdit('cards', -1, { preset: { 1: x.n }, onSaved: rf });
      }
      break;
    }
    case 'sk3Pick': {
      if (!T) break;
      openSk3Pick(T, b.dataset.k, rf);
      break;
    }
    case 'vaultAdd': {
      if (!T) break;
      openVaultPick(T, rf);
      break;
    }
    case 'vaultCard': {
      const x = T && (T.vault || [])[+b.dataset.k];
      if (!x) break;
      if (!ME.gm) {
        toast('카드는 「DB」 탭의 카드 DB 에서 고친다');
        break;
      }
      {
        const i = S.db.cards.findIndex(r => r[1] === x.n);
        if (i >= 0) openEdit('cards', i, { onSaved: rf });
        else openEdit('cards', -1, { preset: { 1: x.n }, onSaved: rf });
      }
      break;
    }
    case 'vaultDel': {
      const x = T && (T.vault || [])[+b.dataset.k];
      if (!x) break;
      const inS = Object.entries(T.sk3 || {})
        .filter(([, v]) => v === x.n)
        .map(([k]) => k);
      const com = skCommon().some(r => r[1] === x.n);
      if (
        !(await ask(
          `「${x.n}」 을(를) 보관소에서 뺄까요?${inS.length && !com ? ` (${inS.map(k => SK3N[k]).join(' · ')} 칸에서도 빠집니다)` : ''}`,
          '빼기'
        ))
      )
        break;
      T.vault = T.vault.filter(y => y !== x);
      if (!com) {
        T.sk3 = Object.assign({}, T.sk3);
        for (const k of inS) delete T.sk3[k];
      }
      rf();
      break;
    }
    case 'deckDel': {
      if (!T || !T.deck) break;
      T.deck.splice(+b.dataset.k, 1);
      rf();
      break;
    }
    case 'tordOff': {
      const t = T;
      if (!t) break;
      const kind = b.dataset.kind,
        k = b.dataset.key,
        n = misagOrdNeed(t)[kind] || 0;
      const P0 = misagPen(t);
      let L = misagOrdOff(t, kind).slice();
      if (L.includes(k)) L = L.filter(x => x !== k);
      else {
        L.push(k);
        while (L.length > n) L.shift();
      }
      P0.ordOff = Object.assign({}, P0.ordOff, { [kind]: L });
      rf();
      break;
    }
    case 'tordPick3': {
      const t = T;
      if (!t || !t.orders) break;
      const kind = b.dataset.kind,
        k = b.dataset.key,
        n = misag3OrdN(kind, t);
      const o = Object.assign({}, t.orders);
      const pk = Object.assign({}, o.pick3 || {});
      let L = (Array.isArray(pk[kind]) ? pk[kind] : []).slice();
      if (L.includes(k)) L = L.filter(x => x !== k);
      else {
        L.push(k);
        while (L.length > n) L.shift();
      }
      pk[kind] = L;
      o.pick3 = pk;
      t.orders = o;
      rf();
      break;
    } /* 11-11 미사그 3체 추가 */
    case 'tordPick': {
      const t = T;
      if (!t || !t.orders) break;
      const kind = b.dataset.kind,
        k = b.dataset.key,
        n = soloOrdN(kind, t);
      const o = Object.assign({}, t.orders);
      const pk = Object.assign({}, o.pick || {});
      let L = (Array.isArray(pk[kind]) ? pk[kind] : []).slice();
      if (L.includes(k)) L = L.filter(x => x !== k);
      else {
        L.push(k);
        const need = kind === 'c' && soloA(t);
        while (L.length > n) {
          let i = 0;
          if (need && L.filter(x => SOLO_A_MUST.includes(x)).length === 1) {
            const j = L.findIndex(x => !SOLO_A_MUST.includes(x) && x !== k);
            if (j >= 0) i = j;
          }
          L.splice(i, 1);
        }
      }
      /* 지시 A: 넘쳐서 하나 뺄 때 하나뿐인 회피 · 명중은 남긴다 */ pk[kind] = L;
      o.pick = pk;
      if (o.pick3 && Array.isArray(o.pick3[kind]) && o.pick3[kind].includes(k) && L.includes(k))
        o.pick3 = Object.assign({}, o.pick3, { [kind]: o.pick3[kind].filter(x => x !== k) });
      t.orders = o;
      rf();
      break;
    }
    case 'spDel': {
      const x = T && (T.sps || [])[+b.dataset.k];
      if (!x) break;
      if (await ask(`SP 『${esc(x.name)}』를 지울까요?`, '삭제')) {
        T.sps = T.sps.filter(y => y !== x);
        rf();
      }
      break;
    }
    case 'fldDel': {
      const o = P || T;
      const f = o && (o.fields || [])[+b.dataset.k];
      if (!f) break;
      if (await ask(`필드 《${esc(f.name)}》를 지울까요?`, '삭제')) {
        o.fields = o.fields.filter(y => y !== f);
        rf();
      }
      break;
    }
    case 'sdef':
    case 'sdel':
    case 'sadd':
      await stAct(b);
      break;
    case 'smgr':
      openStMgr(b.dataset.sk);
      break;
    case 'decoU':
      e.stopPropagation();
      openUqDeco(T, j, rf);
      break;
    case 'stadd': {
      const l = ($('#stl-' + T.id) || {}).value || '',
        u = (($('#stu-' + T.id) || {}).value || '').trim();
      if (!/^https?:\/\//.test(u)) {
        toast('그림 주소(https://…)가 필요합니다. 파일은 「올리기」로');
        break;
      }
      T.stands = T.stands || [];
      T.stands.push({ label: l.trim() || '기본', src: u, point: 0 });
      if (T.stands.length === 1) T.standActive = 0;
      rf();
      break;
    }
    case 'stdef':
      T.standActive = +b.dataset.k;
      rf();
      break;
    case 'stkind': {
      const st = T.stands[+b.dataset.k];
      if (!st) break;
      const nx = { '': 'stand', stand: 'portrait', portrait: '' }[st.kind || ''];
      if (nx) st.kind = nx;
      else delete st.kind;
      rf();
      break;
    }
    case 'stedit': {
      const st = T.stands[+b.dataset.k];
      if (!st) break;
      const l = await askText('스탠딩 라벨', '라벨', st.label);
      if (l == null) break;
      const u = await askText('그림 주소', '주소', st.src);
      if (u == null || !/^https?:\/\//.test(u)) break;
      const pt = await askText('보정 (위로 올릴 px, 음수면 내림)', '보정', String(st.point || 0));
      st.label = l.trim() || st.label;
      st.src = u.trim();
      st.point = +pt || 0;
      rf();
      break;
    }
    case 'stdel': {
      T.stands.splice(+b.dataset.k, 1);
      if (T.standActive >= T.stands.length) T.standActive = Math.max(0, T.stands.length - 1);
      rf();
      break;
    }
    case 'tpl':
      if (await ask('테이블·계산식 탭의 랭크 템플릿 값으로 포인트 기본값을 덮어쓸까요?', '적용', false)) {
        applyTpl(T);
        rf();
        toast('템플릿을 적용했습니다');
      }
      break;
    case 'addPt':
      openPicker('points', {
        title: '포인트 사용 항목',
        onPick: n => {
          T.pts.push(n);
          rf();
        }
      });
      break;
    case 'delPt':
      T.pts.splice(j, 1);
      rf();
      break;
    case 'ptType':
      ptTypeModal(T);
      break;
    case 'addU':
      T.unique.push({ name: '', eff: '' });
      rf();
      openPotEditor(T, null, { unique: T.unique.length - 1 });
      break;
    case 'editU':
      if (e.target.closest('[data-act="delU"],[data-act="decoU"]')) break;
      openPotEditor(T, null, { unique: j });
      break;
    case 'delU':
      e.stopPropagation();
      T.unique.splice(j, 1);
      rf();
      break;
    case 'tuneAdd': {
      const sel = $(`[data-tuneadd="${P.id}"]`),
        vi = $(`[data-tuneaddv="${P.id}"]`);
      const v = String((vi || {}).value || '').replace(/\s+/g, '');
      if (!sel || !FRAC_RE.test(v) || !(+v.split('/')[1] > 0)) {
        toast('비율을 1/6 처럼 적어 주세요');
        break;
      }
      tuneOf(P, true).st.push({ st: sel.value, v });
      rf();
      toast(`「${sel.value}」 ${v} — 이 포켓몬만`);
      break;
    }
    case 'tuneDel': {
      const T0 = tuneOf(P, true);
      T0.st = T0.st.filter(x => x.st !== b.dataset.k);
      rf();
      break;
    }
    case 'tuneItemCopy': {
      const T0 = tuneOf(P, true);
      const bs = tuneItemBase(P);
      if (T0.item.trim() && !(await ask('지금 적어 둔 소지품 구문을 DB 구문으로 바꿀까요?', '바꾸기'))) break;
      T0.item = bs;
      T0.itemName = P.item;
      rf();
      break;
    }
    case 'tuneItemClr': {
      const T0 = tuneOf(P, true);
      T0.item = '';
      T0.itemName = '';
      rf();
      break;
    }
    case 'addP': {
      const p = newPoke();
      applySheetTpl(T, p);
      T.pokemon.push(p);
      rf();
      goNew('pk-' + p.id, 'nm-' + p.id);
      break;
    }
    /* 10-29 망령: 미사그 — 각성체를 바로 추가 (대가 쪽이 비었으면 대가, 아니면 보조) */
    case 'addAw': {
      const p = newPoke();
      applySheetTpl(T, p);
      p.awaken = T.pokemon.some(x => awOf(T, x) === 'free') ? 'c' : 'free';
      T.pokemon.push(p);
      awClassSync(T, p);
      rf();
      goNew('pk-' + p.id, 'nm-' + p.id);
      break;
    }
    case 'stpl': {
      const n = applySheetTpl(T, P);
      rf();
      toast(n ? `템플릿 포텐셜 ${n}개를 넣었습니다` : '더 넣을 템플릿 포텐셜이 없습니다');
      break;
    }
    case 'moreP': {
      if (!T || !P) break;
      popMenu(b, [
        SH.on ? { label: '이력', title: '공유 DB 에 남은 옛 판 보기 · 되돌리기', attrs: `data-act="histP" data-i="${i}" data-j="${j}"` } : null,
        { label: '🗑 삭제', danger: true, title: '이 포켓몬 시트 삭제', attrs: `data-act="delP" data-i="${i}" data-j="${j}"` }
      ]);
      break;
    }
    case 'delP':
      if (await ask(`포켓몬 시트 「${esc(P.name || '이름 없음')}」을(를) 삭제할까요?${delHint()}`, '삭제')) {
        const at = T.pokemon.indexOf(P);
        T.pokemon = T.pokemon.filter(x => x !== P);
        rf();
        undoDel(`「${P.name || '이름 없음'}」 삭제`, () => {
          if (T.pokemon.includes(P)) return;
          T.pokemon.splice(Math.min(at, T.pokemon.length), 0, P);
          save();
          S.trainers.includes(T) ? refreshTrainer(T) : renderChar();
          goNew('pk-' + P.id);
          toast('되살렸습니다');
        });
      }
      break;
    case 'dupP': {
      const c = clone(P);
      c.id = uid();
      T.pokemon.splice(j + 1, 0, c);
      rf();
      break;
    }
    case 'moveP': {
      const r = await askMoveP(T, P);
      if (!r) break;
      const D = S.trainers.find(x => x.id === r.tid);
      if (!D) break;
      if (r.copy) {
        const c = clone(P);
        c.id = uid();
        c.open = false;
        D.pokemon.push(c);
        toast(`「${P.name || '이름 없음'}」을(를) ${D.name || '이름 없음'}에게 복사했습니다`);
      } else {
        T.pokemon = T.pokemon.filter(x => x !== P);
        D.pokemon.push(P);
        toast(`「${P.name || '이름 없음'}」을(를) ${D.name || '이름 없음'}에게 옮겼습니다`);
      }
      D.open = true;
      save();
      renderChar();
      break;
    }
    case 'noPimg':
      P.image = '';
      rf();
      break;
    case 'pimgCut':
      cutImage('포켓몬 그림', f => setPokeImg(+b.dataset.i, +b.dataset.j, f));
      break;
    case 'pstadd': {
      const l = ($('#pstl-' + P.id) || {}).value || '',
        u = (($('#pstu-' + P.id) || {}).value || '').trim();
      if (!/^https?:\/\//.test(u)) {
        toast('그림 주소(https://…)가 필요합니다. 파일은 「올리기」로');
        break;
      }
      P.stands = P.stands || [];
      P.stands.push({ label: l.trim() || '기본', src: u, point: 0 });
      if (P.stands.length === 1) P.standActive = 0;
      rf();
      break;
    }
    case 'pstdef':
      P.standActive = +b.dataset.k;
      rf();
      break;
    case 'pstkind': {
      const st = (P.stands || [])[+b.dataset.k];
      if (!st) break;
      const nx = { '': 'stand', stand: 'portrait', portrait: '' }[st.kind || ''];
      if (nx) st.kind = nx;
      else delete st.kind;
      rf();
      break;
    }
    case 'pstedit': {
      const st = (P.stands || [])[+b.dataset.k];
      if (!st) break;
      const l = await askText('스탠딩 라벨', '라벨', st.label);
      if (l == null) break;
      const u = await askText('그림 주소', '주소', st.src);
      if (u == null || !/^https?:\/\//.test(u)) break;
      const pt = await askText('보정 (위로 올릴 px, 음수면 내림)', '보정', String(st.point || 0));
      st.label = l.trim() || st.label;
      st.src = u.trim();
      st.point = +pt || 0;
      rf();
      break;
    }
    case 'pstdel': {
      P.stands.splice(+b.dataset.k, 1);
      if (P.standActive >= P.stands.length) P.standActive = Math.max(0, P.stands.length - 1);
      rf();
      break;
    }
    case 'coF': {
      const o = S.folders.find(x => x.id === b.dataset.f);
      if (!o) break;
      if (!(ME.gm || (ME.hash && o.owner === ME.hash))) {
        toast('폴더 주인(또는 GM)만 바꿀 수 있습니다');
        break;
      }
      openCo(o);
      break;
    }
    case 'privT':
    case 'privF': {
      const o = b.dataset.act === 'privT' ? T : S.folders.find(x => x.id === b.dataset.f);
      if (!o) break;
      if (!ME.hash) {
        toast('먼저 오른쪽 위 「서명」에 이름과 비밀구를 적어 주세요');
        openMe();
        break;
      }
      if (!canEditPriv(o)) {
        toast('만든 사람(또는 GM)만 바꿀 수 있습니다');
        break;
      }
      if (o.priv) {
        o.priv = false;
      } else {
        o.priv = true;
        if (!o.owner) {
          o.owner = ME.hash;
          o.ownerName = ME.name;
        }
      }
      save();
      renderChar();
      toast(o.priv ? '비공개로 두었습니다 · 같은 비밀구를 적은 브라우저와 GM 만 봅니다' : '공개로 바꿨습니다');
      break;
    }
    case 'tuneFx': {
      const C = tuneCands(P);
      const sel = $(`[data-tunefx="${P.id}"]`);
      const c = C[+(sel || {}).value];
      if (c) fxOpen(T, P, c.kind, c.name, c.slot);
      break;
    }
    case 'tuneFxK': {
      const C = tuneCands(P);
      const n = b.dataset.name;
      const c = C.find(x => FXK(x.name) === n);
      fxOpen(T, P, c ? c.kind : 'pot', c ? c.name : n, c ? c.slot : null);
      break;
    }
    case 'fx': {
      e.stopPropagation();
      const sl = b.dataset.slot;
      fxOpen(T, P, b.dataset.kind, b.dataset.name, sl === '' ? null : /^\d+$/.test(sl) ? +sl : sl);
      break;
    }
    case 'decoT': {
      e.stopPropagation();
      openTDeco(T, rf);
      break;
    }
    case 'bioT': {
      e.stopPropagation();
      openBio(T, rf);
      break;
    }
    case 'tpk': {
      e.stopPropagation();
      if (!P) break;
      openPokeCard(T, P);
      break;
    }
    case 'tuq': {
      e.stopPropagation();
      openUqInfo(T, j);
      break;
    }
    case 'fimgPick': {
      e.stopPropagation();
      let inp = $('#fimg-any');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.id = 'fimg-any';
        inp.hidden = true;
        inp.addEventListener('change', () => {
          const f = inp.files[0];
          if (f) setFormImg(inp.dataset.fimg, f);
        });
        MKROOT().appendChild(inp);
      }
      inp.dataset.fimg = `${b.dataset.i}.${b.dataset.j}.${b.dataset.k}`;
      inp.value = '';
      inp.click();
      break;
    }
    case 'fimgDel': {
      const fm = (FO.forms || [])[+b.dataset.k];
      if (fm) {
        fm.image = '';
        rf();
      }
      break;
    }
    case 'pimgPick': {
      e.stopPropagation();
      let inp = $('#pimg-any');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.id = 'pimg-any';
        inp.hidden = true;
        inp.addEventListener('change', () => {
          const f = inp.files[0];
          if (!f) return;
          const [a, b] = String(inp.dataset.pimg).split('.').map(Number);
          setPokeImg(a, b, f);
        });
        MKROOT().appendChild(inp);
      }
      inp.dataset.pimg = `${i}.${j}`;
      inp.value = '';
      inp.click();
      break;
    }
    case 'pickOld':
      openOldFill(T, P);
      break;
    case 'addForm':
      FO.forms = FO.forms || [];
      FO.forms.push(newForm());
      rf();
      break;
    case 'tordReset': {
      const t = T;
      if (!t || !t.orders || !t.orders.type) break;
      const ty = Object.assign({}, t.orders.type);
      for (const k of Object.keys(ty)) if (k.startsWith(b.dataset.kind + '_')) delete ty[k];
      t.orders = Object.assign({}, t.orders);
      if (Object.keys(ty).length) t.orders.type = ty;
      else delete t.orders.type;
      save();
      refreshTrainer(t);
      break;
    }
    case 'addFormOld':
      openPicker('old', {
        title: '올드 타입 일람에서 폼 고르기',
        onPick: n => {
          const r = idx.old.get(n);
          if (!r) return;
          FO.forms = FO.forms || [];
          FO.forms.push(formFromOld(r));
          rf();
          toast(`「${r[1]}」 폼을 넣었습니다`);
        }
      });
      break;
    case 'delForm': {
      const k = +b.dataset.k;
      const f = (FO.forms || [])[k];
      if (!f) break;
      if (await ask(`폼 「${esc(f.name || '이름 없음')}」을(를) 지울까요?`, '삭제')) {
        FO.forms = FO.forms.filter(x => x !== f);
        rf();
      }
      break;
    }
    case 'addFormPot': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      f.pots = f.pots || [];
      const used = f.pots.map(x => +x.slot);
      let sl = [4, 5, 6, 7, 8].find(i => !used.includes(i));
      if (sl == null) sl = 0;
      f.pots.push({ slot: sl, name: '', eff: '' });
      rf();
      break;
    }
    case 'delFormPot': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      f.pots.splice(+b.dataset.x, 1);
      rf();
      break;
    }
    case 'addFormEx': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      f.exs = f.exs || [];
      if (f.exs.length >= 6) {
        toast('폼 전용은 6개까지');
        break;
      }
      f.exs.push({ name: '', eff: '' });
      rf();
      break;
    }
    case 'delFormEx': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      (f.exs || []).splice(+b.dataset.x, 1);
      rf();
      break;
    }
    case 'addFormMv': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      f.mvs = f.mvs || [];
      f.mvs.push({ from: '', to: '' });
      rf();
      break;
    }
    case 'delFormMv': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      (f.mvs || []).splice(+b.dataset.x, 1);
      rf();
      break;
    }
    case 'pickFormMv': {
      const f = (FO.forms || [])[+b.dataset.k];
      const x = f && (f.mvs || [])[+b.dataset.x];
      if (!x) break;
      openPicker('moves', {
        title: '폼일 때 기술',
        hideOldOnly: !(P && isOld(P)),
        onPick: n => {
          x.to = n;
          rf();
        }
      });
      break;
    }
    case 'fxForm': {
      e.stopPropagation();
      const f = (FO.forms || [])[+b.dataset.k];
      const arr = f && (b.dataset.fk === 'e' ? f.exs : f.pots);
      const x = arr && arr[+b.dataset.x];
      if (!x || !x.name) break;
      if (!fxReady()) {
        toast('구문 편집기를 아직 불러오는 중입니다');
        break;
      }
      const K = OM_FX;
      const nm = FXK(x.name);
      const mon = { auto: {} };
      const r0 = b.dataset.fk === 'p' ? potRow(x.name) : null;
      const tx = x.eff || (r0 ? r0[2] : '');
      if (String(x.auto || '').trim()) mon.auto[nm] = { dsl: x.auto, ops: K.parse(x.auto).ops };
      else {
        try {
          const W = window.MKM_POTLINT;
          const fx = W && tx.trim() ? W.fixAll(tx) : '';
          const sg = fx ? W.suggest(fx) : null;
          const dsl = sg && (sg.lines || []).join('\n');
          if (dsl) {
            mon.auto[nm] = { dsl, ops: K.parse(dsl).ops };
            toast('추천 구문을 채워 두었습니다 — 저장해야 들어갑니다');
          }
        } catch (e2) {}
      } /* 추천기: 글에서 읽은 구문을 미리 채움 */
      OM_FX_UI.openEditor({
        mon,
        kind: 'pot',
        name: x.name,
        text: tx,
        save: auto => {
          if (auto && auto.dsl) x.auto = auto.dsl;
          else delete x.auto;
          save();
          rf();
          toast(auto ? '구문을 저장했습니다' : '구문을 지웠습니다');
        }
      });
      break;
    } /* 11-26 공유 폼 포텐셜 · 전용 구문 */
    case 'pickFormPot': {
      const f = (FO.forms || [])[+b.dataset.k];
      const x = f && f.pots[+b.dataset.x];
      if (!x) break;
      openPicker('pots', {
        onPick: n => {
          x.name = n;
          x.eff = '';
          rf();
        }
      });
      break;
    }
    case 'pickFormAbil': {
      const f = (FO.forms || [])[+b.dataset.k];
      if (!f) break;
      openPicker('abil', {
        hideOldOnly: !(P && isOld(P)),
        onPick: n => {
          f.ability = n;
          rf();
        }
      });
      break;
    }
    case 'addOld':
      openOldFill(T, null);
      break;
    case 'copy':
      copyStr(copyText(T, P));
      break;
    case 'pcard':
      e.stopPropagation();
      openPokeCard(T, P);
      break;
    case 'fview': {
      if (!P) break;
      const n = +k;
      if (n < 0 || FV[P.id] === n) delete FV[P.id];
      else FV[P.id] = n;
      refreshTrainer(T);
      break;
    }
    case 'sessT':
      copySession([T]);
      break;
    case 'impP':
      openImport(T);
      break;
    case 'impText':
      openImport(null);
      break;
    case 'pickAbil':
      openPicker('abil', {
        hideOldOnly: !isOld(P),
        chosen: () => new Set([P.ability]),
        onPick: n => {
          P.ability = n;
          rf();
        }
      });
      break;
    case 'newAbil':
      if (!ME.gm) break;
      openEdit('abil', -1, {
        preset: { 1: P.ability },
        onSaved: n => {
          P.ability = n;
          rf();
        }
      });
      break;
    case 'pickItem':
      openPicker('items', {
        onPick: n => {
          P.item = n;
          rf();
        },
        onOrig: q =>
          openOwnItem(P, q, () => {
            closeModal();
            rf();
          })
      });
      break;
    case 'ownItem':
      openOwnItem(P, P.item, rf);
      break;
    case 'addItemX':
      P.items2 = P.items2 || [];
      if (P.items2.length < 2) {
        P.items2.push({ item: '' });
        rf();
      }
      break;
    case 'delItemX': {
      const x = (P.items2 || [])[+k];
      if (!x) break;
      if (x.item && !(await ask(`소지품 ${+k + 2}번 칸(「${esc(x.item)}」)을 지울까요?`, '지우기'))) break;
      P.items2.splice(+k, 1);
      rf();
      break;
    }
    case 'pickItemX': {
      const x = (P.items2 || [])[+k];
      if (!x) break;
      openPicker('items', {
        onPick: n => {
          x.item = n;
          if (x.itemOwn && x.itemOwn.name !== n) delete x.itemOwn;
          rf();
        },
        onOrig: q =>
          openOwnItem(x, q, () => {
            closeModal();
            rf();
          })
      });
      break;
    }
    case 'ownItemX': {
      const x = (P.items2 || [])[+k];
      if (x) openOwnItem(x, x.item, rf);
      break;
    }
    case 'pickMove':
      openPicker('moves', {
        title: '기술 검색·추가',
        multi: true,
        hideOldOnly: !isOld(P),
        chosen: () => new Set(P.moves.map(m => m.name)),
        onPick: n => {
          const m = { name: n, half: false };
          P.moves.push(m);
          if (isBigMv(T, P, m)) toast(`「${n}」 소켓 ${moveSock(P, m)} · ${bigMvRule(T)} · 경고만 띄우고 넣었습니다`);
          else if (followWide(P)) toast(followWideTxt(followWide(P)));
          rf();
        },
        onRemove: n => {
          P.moves = P.moves.filter(m => m.name !== n);
          rf();
        }
      });
      break;
    case 'mvDel':
      P.moves.splice(+k, 1);
      rf();
      break;
    case 'mvOv':
      openMvOv(T, P, k, rf);
      break; /* 11-08 포켓몬별 기술 덮어쓰기 */
    case 'mvEdit':
      if (!ME.gm) break;
      {
        const n = b.dataset.name;
        const ix = S.db.moves.findIndex(r => r[2] === n);
        if (ix >= 0) openEdit('moves', ix, { onSaved: () => renderChar() });
        break;
      }
    case 'editPot':
      if (e.target.closest('[data-act="potDel"]')) break;
      openPotEditor(T, P, k === 'excl' ? 'excl' : String(k)[0] === 'x' ? { ex: +String(k).slice(1) } : +k);
      break;
    case 'addEx':
      P.exclX = P.exclX || [];
      P.exclX.push({ name: '', eff: '' });
      save();
      refreshTrainer(T);
      openPotEditor(T, P, { ex: P.exclX.length - 1 });
      break;
    case 'addPot': {
      const ix = P.pots.findIndex(n => !n);
      if (ix >= 0) openPotEditor(T, P, ix);
      break;
    }
    case 'potDel':
      e.stopPropagation();
      if (String(k)[0] === 'x') {
        P.exclX.splice(+String(k).slice(1), 1);
        rf();
        break;
      }
      {
        const x = +k;
        P.pots[x] = '';
        P.potEff[x] = '';
        P.potKind[x] = '';
        rf();
      }
      break;
  }
});

