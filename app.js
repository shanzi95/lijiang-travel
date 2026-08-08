/* ===========================================================
 * 山山的推荐 - 前端逻辑
 * =========================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const grid = $('#grid');
  const routeList = $('#routeList');
  const routeDetail = $('#routeDetail');
  const pinned = $('#pinnedCard');
  const pinnedBtn = $('#pinnedBtn');
  const pinnedEmoji = $('#pinnedEmoji');
  const pinnedName = $('#pinnedName');
  const submenu = $('#submenu');
  const tabRoute = $('#tabRoute');
  const tabFood = $('#tabFood');
  const routePane = $('#routePane');
  const foodPane = $('#foodPane');
  const toast = $('#toast');

  let state = { scenic: [], routes: [], site: {} };
  let currentId = null;
  let currentTab = 'route';
  let currentRouteId = null;

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => (toast.hidden = true), 250);
    }, 1800);
  }

  /* ---------- 复制微信号 ---------- */
  const btnCopyWechat = document.getElementById('btnCopyWechat');
  if (btnCopyWechat) {
    btnCopyWechat.addEventListener('click', () => {
      const wechat = 'SHAA9524';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(wechat).then(() => {
          showToast('微信号已复制：' + wechat);
        }).catch(() => { fallbackCopy(wechat); });
      } else {
        fallbackCopy(wechat);
      }
    });
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); showToast('微信号已复制：' + text); }
    catch(e) { showToast('请手动复制：' + text); }
    document.body.removeChild(ta);
  }

  /* ---------- 加载内容 ---------- */
  function loadContent() {
    if (typeof __CONTENT__ !== 'undefined' && __CONTENT__) {
      state = __CONTENT__;
      renderAll();
      if (currentId) renderPinned(currentId, currentTab);
    }
  }

  /* ---------- 渲染宫格 ---------- */
  function renderGrid() {
    grid.innerHTML = '';
    state.scenic.forEach((s, i) => {
      const card = document.createElement('button');
      card.className = 's-card';
      card.style.animationDelay = `${i * 0.04}s`;
      card.dataset.id = s.id;
      card.innerHTML = `<span class="s-emoji">${esc(s.icon || '📍')}</span><span class="s-name">${esc(s.name)}</span>`;
      card.addEventListener('click', () => openScenic(s.id));
      grid.appendChild(card);
    });
  }

  /* ---------- 渲染推荐路线 ---------- */
  function renderRoutes() {
    if (!state.routes || !state.routes.length) {
      routeList.innerHTML = '<div class="empty-tip">暂无推荐路线</div>';
      return;
    }
    routeList.innerHTML = state.routes.map(r => {
      const thumb = r.image ? `<img src="${escA(r.image)}" alt="" loading="lazy" />` : '<span>🗺️</span>';
      const tags = [];
      if (r.duration) tags.push(`<span class="tag">⏱ ${esc(r.duration)}</span>`);
      if (r.type) tags.push(`<span class="tag">${esc(r.type)}</span>`);
      const hasDetail = r.detail && r.detail.length > 0;
      const arrow = hasDetail ? '<span class="route-arrow">›</span>' : '';
      return `<div class="route-card${hasDetail ? ' has-detail' : ''}" data-route-id="${esc(r.id)}"><div class="route-thumb">${thumb}</div><div class="route-body"><div class="route-title">${esc(r.title)}${arrow}</div><div class="route-summary-text">${esc(r.summary||'')}</div><div class="route-tags">${tags.join('')}</div></div></div>`;
    }).join('');

    // 绑定点击事件
    $$('.route-card.has-detail').forEach(card => {
      card.addEventListener('click', () => {
        const rid = card.dataset.routeId;
        toggleRouteDetail(rid);
      });
    });
  }

  function toggleRouteDetail(rid) {
    // 先移除所有已存在的展开面板
    var existing = document.querySelector('.route-detail-inline');
    if (existing) existing.remove();

    if (currentRouteId === rid) {
      // 收起
      currentRouteId = null;
      $$('.route-card').forEach(c => c.classList.remove('is-expanded'));
      return;
    }
    // 展开
    currentRouteId = rid;
    const r = state.routes.find(x => x.id === rid);
    if (!r || !r.detail) return;

    $$('.route-card').forEach(c => c.classList.remove('is-expanded'));
    const card = document.querySelector('.route-card[data-route-id="' + rid + '"]');
    if (!card) return;
    card.classList.add('is-expanded');

    // 创建展开面板，插入到当前卡片后面
    var detail = document.createElement('div');
    detail.className = 'route-detail-inline';
    detail.innerHTML = r.detail.map(function(d) {
      var items = d.items.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('');
      return '<div class="route-day"><div class="route-day-head"><span class="route-day-num">' + esc(d.day) + '</span><span class="route-day-title">' + esc(d.title) + '</span></div><ul class="route-day-items">' + items + '</ul></div>';
    }).join('');
    card.insertAdjacentElement('afterend', detail);
    setTimeout(function() { detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
  }

  function renderAll() {
    const site = state.site || {};
    if (site.bannerTitle) {
      const subs = (site.bannerSubtitle || '').split(/[·•]/).map(s => s.trim()).filter(Boolean);
      $('.hero-sub').innerHTML = subs.map((s,i) => i ? `<span class="dot">·</span><span>${esc(s)}</span>` : `<span>${esc(s)}</span>`).join('');
    }
    renderGrid();
    renderRoutes();
  }

  /* ---------- 打开景点（置顶）---------- */
  function openScenic(id) {
    const s = state.scenic.find(x => x.id === id);
    if (!s) return;
    currentId = id;
    currentTab = 'route';

    $$('.s-card').forEach(c => { if (c.dataset.id === id) c.classList.add('is-hidden'); });

    pinnedEmoji.textContent = s.icon || '📍';
    pinnedName.textContent = s.name;
    pinned.hidden = false;

    // 动态更新第二个 tab 的文字（如"吃饭推荐"或"一日游"）
    var foodTitle = (s.food && s.food.title) || '吃饭推荐';
    var foodIcon = foodTitle === '一日游' ? '🚌' : '🍜';
    tabFood.innerHTML = '<span class="tab-icon">' + foodIcon + '</span> ' + esc(foodTitle);

    setTimeout(() => { pinned.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    setActiveTab('route');
    renderPinned(id, 'route');
  }

  function closeScenic() {
    currentId = null;
    pinned.hidden = true;
    $$('.s-card').forEach(c => c.classList.remove('is-hidden'));
    $('#scenicSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  pinnedBtn.addEventListener('click', closeScenic);

  const fabHome = $('#fabHome');
  if (fabHome) fabHome.addEventListener('click', () => {
    closeScenic();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function setActiveTab(tab) {
    currentTab = tab;
    tabRoute.classList.toggle('tab-active', tab === 'route');
    tabFood.classList.toggle('tab-active', tab === 'food');
    routePane.hidden = tab !== 'route';
    foodPane.hidden = tab !== 'food';
  }
  tabRoute.addEventListener('click', () => { if (currentId) { setActiveTab('route'); renderPinned(currentId, 'route'); } });
  tabFood.addEventListener('click', () => { if (currentId) { setActiveTab('food'); renderPinned(currentId, 'food'); } });

  function renderPinned(id, tab) {
    const s = state.scenic.find(x => x.id === id);
    if (!s) return;
    if (tab === 'route') {
      const r = s.route || {};
      const pts = r.points || [];
      let summary = '';
      if (r.summary) summary = `<div class="route-summary"><div class="label">${esc(r.title||'游玩环线')}</div><div>${esc(r.summary)}</div></div>`;
      if (!pts.length) { routePane.innerHTML = summary + '<div class="empty-tip">该景点路线点位还未配置</div>'; return; }
      routePane.innerHTML = summary + pts.map((p, pIdx) => {
        let imgHtml;
        if (p.images && p.images.length > 1) {
          // 多图：轮播组件
          const slides = p.images.map((url, i) => `<div class="carousel-slide" data-slide="${i}" style="transform: translateX(${i * 100}%)" data-imgs="${p.images.length}"><img src="${escA(url)}" alt="" loading="${i===0?'eager':'lazy'}" /></div>`).join('');
          const dots = p.images.map((_, i) => `<span class="dot ${i===0?'active':''}" data-carousel="${pIdx}" data-slide="${i}"></span>`).join('');
          imgHtml = `
            <div class="carousel" data-carousel="${pIdx}">
              <div class="carousel-track">${slides}</div>
              <button class="carousel-arrow prev" aria-label="上一张">‹</button>
              <button class="carousel-arrow next" aria-label="下一张">›</button>
              <div class="carousel-dots">${dots}</div>
            </div>`;
        } else {
          imgHtml = (p.image || (p.images && p.images[0]))
            ? `<img src="${escA(p.image || p.images[0])}" alt="" loading="lazy" />`
            : '<span>📍</span>';
        }
        return `<div class="point"><div class="point-img">${imgHtml}</div><div class="point-body"><div class="point-name">${esc(p.name)}</div><div class="point-desc">${esc(p.desc||'')}</div></div></div>`;
      }).join('');

      // 挂载轮播事件
      $$('.carousel').forEach(carousel => {
        const total = carousel.querySelectorAll('.carousel-slide').length;
        // 每次重新渲染都重置轮播状态（total 可能因数据更新而变化）
        const idx = +carousel.dataset.carousel;
        const stateKey = 'carousel_' + currentId + '_' + idx;
        const st = { current: 0, total };
        window[stateKey] = st;
        function go(dir) {
          st.current = (st.current + dir + st.total) % st.total;
          updateCarousel(carousel, st.current);
        }
        carousel.querySelector('.prev').addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
        carousel.querySelector('.next').addEventListener('click', (e) => { e.stopPropagation(); go(1); });
        carousel.querySelectorAll('.carousel-dots .dot').forEach(dot => {
          dot.addEventListener('click', (e) => { e.stopPropagation(); st.current = +dot.dataset.slide; updateCarousel(carousel, st.current); });
        });
      });
    } else {
      const f = s.food || {};
      const shops = f.shops || [];
      if (!shops.length) { foodPane.innerHTML = '<div class="empty-tip">该景点餐饮推荐还未配置</div>'; return; }
      foodPane.innerHTML = shops.map(p => {
        if (p.name === '__banner__' && p.image) {
          return `<div class="food-banner"><img src="${escA(p.image)}" alt="" loading="eager" /></div>`;
        }
        if (p.link) {
          return `<a class="food-link" href="${escA(p.link)}" target="_blank" rel="noopener"><span class="food-link-icon">🔗</span><span>${esc(p.name)}</span><span class="food-link-arrow">›</span></a>`;
        }
        const img = p.image ? `<img src="${escA(p.image)}" alt="" loading="lazy" />` : '<span>🍜</span>';
        return `<div class="point"><div class="point-img">${img}</div><div class="point-body"><div class="point-name">${esc(p.name)}</div><div class="point-desc">${esc(p.desc||'')}</div></div></div>`;
      }).join('');
    }
  }

    function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function escA(s) { return esc(s); }

  function updateCarousel(carousel, current) {
    const slides = carousel.querySelectorAll('.carousel-slide');
    slides.forEach((s, i) => { s.style.transform = `translateX(${(i - current) * 100}%)`; });
    carousel.querySelectorAll('.carousel-dots .dot').forEach((d, i) => { d.classList.toggle('active', i === current); });
  }

  /* ---------- 图片点击放大 ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbCounter = document.getElementById('lbCounter');

  let lbImages = [];
  let lbIndex = 0;

  function openLightbox(images, index) {
    lbImages = images;
    lbIndex = index;
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function renderLightbox() {
    lightboxImg.src = lbImages[lbIndex];
    var hasMultiple = lbImages.length > 1;
    lbPrev.style.display = hasMultiple ? '' : 'none';
    lbNext.style.display = hasMultiple ? '' : 'none';
    lbCounter.textContent = hasMultiple ? (lbIndex + 1) + ' / ' + lbImages.length : '';
  }

  function lbGo(dir) {
    if (lbImages.length <= 1) return;
    lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
    renderLightbox();
  }

  if (lbPrev) lbPrev.addEventListener('click', function(e) { e.stopPropagation(); lbGo(-1); });
  if (lbNext) lbNext.addEventListener('click', function(e) { e.stopPropagation(); lbGo(1); });

  document.addEventListener('click', (e) => {
    // carousel image click: collect all images in same group
    const carouselImg = e.target.closest('.carousel-slide img');
    if (carouselImg && carouselImg.src) {
      const carousel = e.target.closest('.carousel');
      const allSlides = carousel ? Array.from(carousel.querySelectorAll('.carousel-slide img')).map(function(img) { return img.src; }) : [carouselImg.src];
      const idx = allSlides.indexOf(carouselImg.src);
      openLightbox(allSlides, idx >= 0 ? idx : 0);
      return;
    }
    // single image click
    const imgWrap = e.target.closest('.point-img');
    if (imgWrap) {
      const img = imgWrap.querySelector('img');
      if (img && img.src) {
        openLightbox([img.src], 0);
      }
    }
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    lbImages = [];
    lbIndex = 0;
    document.body.style.overflow = '';
  }
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target.classList.contains('lightbox-backdrop')) closeLightbox();
    });
  }
  document.addEventListener('keydown', function(e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbGo(-1);
    if (e.key === 'ArrowRight') lbGo(1);
  });

  // 图片加载完成后淡入显示
  document.addEventListener('load', function(e) {
    if (e.target.tagName === 'IMG') {
      e.target.classList.add('loaded');
    }
  }, true);

  loadContent();
})();
