/* ===========================================================
 * 山山的推荐 - 前端逻辑
 * =========================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const grid = $('#grid');
  const tipsCard = $('#tipsCard');
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
      // emoji 优先；设备不支持该 emoji 时用景点首字兜底，永不会出现方框
      var useEmoji = !s.fallbackChar || emojiSupported(s.icon);
      var iconHtml = useEmoji
        ? '<span class="s-emoji">' + esc(s.icon || '\u{1F4CD}') + '</span>'
        : '<span class="s-emoji is-fb">' + esc(s.fallbackChar) + '</span>';
      card.innerHTML = iconHtml + '<span class="s-name">' + esc(s.name) + '</span>';
      card.addEventListener('click', () => openScenic(s.id));
      grid.appendChild(card);
    });
  }

  /* ---------- 渲染温馨提示 ---------- */
  function renderTips() {
    if (!tipsCard) return;
    var t = state.tips;
    if (!t || !t.paragraphs || !t.paragraphs.length) {
      tipsCard.innerHTML = '<div class="empty-tip">暂无提示</div>';
      return;
    }
    // 第 1 段是天气提醒，单独一组；从第 2 段（购物相关）开始另起一组，中间用虚线分开
    var paras = t.paragraphs.map(function (text, i) {
      var cls = 'tips-p' + (i === 1 ? ' tips-p-group-start' : '');
      return '<p class="' + cls + '">' + esc(text) + '</p>';
    }).join('');
    tipsCard.innerHTML = paras;
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
    renderGrid();
    renderTips();
  }

  /* ---------- 打开景点（置顶）---------- */
  function openScenic(id) {
    const s = state.scenic.find(x => x.id === id);
    if (!s) return;
    currentId = id;
    currentTab = 'route';

    $$('.s-card').forEach(c => { if (c.dataset.id === id) c.classList.add('is-hidden'); });

    // 详情头部同样做 emoji 兜底，不支持就显示首字
    if (s.fallbackChar && !emojiSupported(s.icon)) {
      pinnedEmoji.textContent = s.fallbackChar;
      pinnedEmoji.classList.add('is-fb');
    } else {
      pinnedEmoji.textContent = s.icon || '📍';
      pinnedEmoji.classList.remove('is-fb');
    }
    pinnedName.textContent = s.name;
    pinned.hidden = false;

    // 动态更新第二个 tab 的文字（如"吃饭推荐"或"一日游"）
    var foodTitle = (s.food && s.food.title) || '吃饭推荐';
    var foodIcon = '';
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
  tabRoute.addEventListener('click', () => {
    if (!currentId) return;
    setActiveTab('route');
    renderPinned(currentId, 'route');
    sweepLoadedImages();
  });
  tabFood.addEventListener('click', () => {
    if (!currentId) return;
    setActiveTab('food');
    renderPinned(currentId, 'food');
    sweepLoadedImages();
  });

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
          const slides = p.images.map((url, i) => `<div class="carousel-slide" data-slide="${i}" style="transform: translateX(${i * 100}%)" data-imgs="${p.images.length}"><img src="${escA(url)}" alt="" loading="lazy" width="1200" height="675" decoding="async" /></div>`).join('');
          const dots = p.images.map((_, i) => `<span class="dot ${i===0?'active':''}" data-carousel="${pIdx}" data-slide="${i}"></span>`).join('');
          imgHtml = `
            <div class="carousel" data-carousel="${pIdx}">
              <div class="carousel-track">${slides}</div>
              <button class="carousel-arrow prev" aria-label="上一张"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
              <button class="carousel-arrow next" aria-label="下一张"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
              <div class="carousel-dots">${dots}</div>
            </div>`;
        } else {
          imgHtml = (p.image || (p.images && p.images[0]))
            ? `<img src="${escA(p.image || p.images[0])}" alt="" loading="lazy" width="1200" height="675" decoding="async" />`
            : '<span class="ic-pin"></span>';
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
        // 手机触摸滑动切换
        let touchX = 0, touchY = 0, touchT = 0;
        carousel.addEventListener('touchstart', (e) => {
          touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; touchT = Date.now();
        }, { passive: true });
        carousel.addEventListener('touchend', (e) => {
          const dx = e.changedTouches[0].clientX - touchX;
          const dy = e.changedTouches[0].clientY - touchY;
          if (Date.now() - touchT > 600) return;      // 长按不算滑动
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // 太短或纵向滚动
          e.preventDefault();
          go(dx < 0 ? 1 : -1);
        }, { passive: false });
      });
    } else {
      const f = s.food || {};
      const shops = f.shops || [];
      const categories = f.categories || [];
      
      // 如果有分类，按分类渲染
      if (categories.length) {
        let html = '';
        categories.forEach(cat => {
          const catShops = cat.shops || [];
          if (!catShops.length) return;
          html += `<div class="food-category"><div class="food-category-title">${esc(cat.icon||'')} ${esc(cat.title||'')}</div>`;
          html += catShops.map(p => {
            const catIcon = cat.icon || '🍜';
            const img = p.image ? `<img src="${escA(p.image)}" alt="" loading="lazy" width="1200" height="675" decoding="async" />` : (p.link ? '<span>🔗</span>' : `<span>${catIcon}</span>`);
            if (p.link) {
              return `<a class="food-link" href="${escA(p.link)}" target="_blank" rel="noopener"><span class="food-link-icon">🔗</span><span>${esc(p.name)}</span><span class="food-link-arrow">›</span></a>`;
            }
            return `<div class="point"><div class="point-img">${img}</div><div class="point-body"><div class="point-name">${esc(p.name)}</div><div class="point-desc">${esc(p.desc||'')}</div></div></div>`;
          }).join('');
          html += '</div>';
        });
        foodPane.innerHTML = html;
        return;
      }
      
      // 没有分类，用原来的逻辑
      if (!shops.length) { foodPane.innerHTML = '<div class="empty-tip">该景点餐饮推荐还未配置</div>'; return; }
      const defaultIcon = (f.title === '一日游' || f.title === '二日游') ? '📋' : '🍜';
      foodPane.innerHTML = shops.map(p => {
        if (p.name === '__banner__' && p.image) {
          return `<div class="food-banner"><img src="${escA(p.image)}" alt="" loading="lazy" width="1200" height="675" decoding="async" /></div>`;
        }
        if (p.link) {
          return `<a class="food-link" href="${escA(p.link)}" target="_blank" rel="noopener"><span class="food-link-icon">🔗</span><span>${esc(p.name)}</span><span class="food-link-arrow">›</span></a>`;
        }
        const img = p.image ? `<img src="${escA(p.image)}" alt="" loading="lazy" width="1200" height="675" decoding="async" />` : `<span>${defaultIcon}</span>`;
        // 管家提示卡片无需缩略图，纯文字更清爽
        if (p.name && p.name.indexOf('可咨询管家') === 0) {
          return `<div class="point point-text"><div class="point-body"><div class="point-name">${esc(p.name)}</div><div class="point-desc">${esc(p.desc||'')}</div></div></div>`;
        }
        return `<div class="point"><div class="point-img">${img}</div><div class="point-body"><div class="point-name">${esc(p.name)}</div><div class="point-desc">${esc(p.desc||'')}</div></div></div>`;
      }).join('');
    }
  }

    // 检测设备是否真的能渲染某个 emoji（用 canvas 比对像素，避免出现方框）
    var _emojiCache = {};
    function emojiSupported(ch) {
      if (!ch) return true;
      if (ch in _emojiCache) return _emojiCache[ch];
      try {
        var cv = document.createElement('canvas');
        cv.width = cv.height = 32;
        var ctx = cv.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '28px sans-serif';
        // 参考字符：一个肯定没有字形的高位私用区字符
        var ref = String.fromCharCode(0xE000);
        ctx.fillText(ref, 0, 0);
        var refData = ctx.getImageData(0, 0, 32, 32).data;
        ctx.clearRect(0, 0, 32, 32);
        ctx.fillText(ch, 0, 0);
        var chData = ctx.getImageData(0, 0, 32, 32).data;
        var supported = false;
        for (var i = 0; i < chData.length; i += 4) {
          if (chData[i + 3] !== refData[i + 3] || chData[i] !== refData[i]) { supported = true; break; }
        }
        _emojiCache[ch] = supported;
        return supported;
      } catch (e) {
        _emojiCache[ch] = true;
        return true;
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
    // 缩略图预览条
    var thumbs = document.getElementById('lbThumbs');
    if (thumbs) {
      if (!hasMultiple) { thumbs.innerHTML = ''; thumbs.style.display = 'none'; }
      else {
        thumbs.style.display = '';
        thumbs.innerHTML = lbImages.map(function(u, i) {
          return '<img src="' + u + '" data-i="' + i + '" class="' + (i === lbIndex ? 'active' : '') + '" loading="lazy" width="52" height="52" alt="" />';
        }).join('');
        var act = thumbs.querySelector('img.active');
        if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }
  }

  function lbGo(dir) {
    if (lbImages.length <= 1) return;
    lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
    renderLightbox();
  }

  if (lbPrev) lbPrev.addEventListener('click', function(e) { e.stopPropagation(); lbGo(-1); });
  // 大图也支持左右滑动切换
  (function() {
    var sx = 0, sy = 0;
    var target = document.getElementById('lightboxImg');
    if (!target) return;
    target.addEventListener('touchstart', function(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    target.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); lbGo(dx < 0 ? 1 : -1); }
    }, { passive: false });
  })();
  var lbThumbs = document.getElementById('lbThumbs');
  if (lbThumbs) lbThumbs.addEventListener('click', function(e) {
    var t = e.target.closest('img[data-i]');
    if (!t) return;
    e.stopPropagation();
    lbIndex = +t.dataset.i;
    renderLightbox();
  });
  if (lbNext) lbNext.addEventListener('click', function(e) { e.stopPropagation(); lbGo(1); });

  document.addEventListener('click', (e) => {
    if (!lightbox.hidden) return;   // 大图已打开时，忽略页面上的其他点击

    // 1) 轮播图：收集同组全部图片
    const carouselImg = e.target.closest('.carousel-slide img');
    if (carouselImg) {
      const carousel = carouselImg.closest('.carousel');
      const slides = carousel ? Array.from(carousel.querySelectorAll('.carousel-slide img')) : [carouselImg];
      // 用 getAttribute 取原始相对路径，避免绝对/相对地址不一致导致索引匹配失败
      const urls = slides.map(function(im) { return im.getAttribute('src'); }).filter(Boolean);
      const cur = carouselImg.getAttribute('src');
      const idx = Math.max(0, urls.indexOf(cur));
      if (urls.length) openLightbox(urls, idx);
      return;
    }

    // 2) 横向小图集：同样收集整组
    const galImg = e.target.closest('.img-gallery img');
    if (galImg) {
      const gal = galImg.closest('.img-gallery');
      const imgs = gal ? Array.from(gal.querySelectorAll('img')) : [galImg];
      const urls = imgs.map(function(im) { return im.getAttribute('src'); }).filter(Boolean);
      const cur = galImg.getAttribute('src');
      const idx = Math.max(0, urls.indexOf(cur));
      if (urls.length) openLightbox(urls, idx);
      return;
    }

    // 3) 单图卡片
    const imgWrap = e.target.closest('.point-img');
    if (imgWrap) {
      const img = imgWrap.querySelector('img');
      const src = img && img.getAttribute('src');
      if (src) openLightbox([src], 0);
    }
  });

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    lbImages = [];
    lbIndex = 0;
    document.body.style.overflow = '';
  }
  if (lightboxClose) lightboxClose.addEventListener('click', function(e) {
    e.stopPropagation();
    closeLightbox();
  });
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      // 只点背景才关；点图片/箭头/缩略图一律不关
      if (e.target === lightbox || e.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });
  }
  document.addEventListener('keydown', function(e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbGo(-1);
    if (e.key === 'ArrowRight') lbGo(1);
  });

  // 图片淡入：同时兼容"已经加载完"和"还在加载"两种情况
  // 之前只监听 load 事件，命中缓存时图片早已加载完、事件永远不触发 -> 一直 opacity:0 显示空白
  function markLoaded(img) {
    if (img.tagName === 'IMG' && img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    }
  }
  document.addEventListener('load', function(e) {
    if (e.target.tagName === 'IMG') e.target.classList.add('loaded');
  }, true);
  // 图片加载失败（如 GitHub Pages 偶发 502）自动重试，最多 3 次
  var _retryMap = {};
  function retryImage(img) {
    var src = img.getAttribute('src');
    if (!src) return;
    var n = _retryMap[src] || 0;
    if (n >= 3) return;
    _retryMap[src] = n + 1;
    setTimeout(function() {
      // 加时间戳绕过失败缓存
      var clean = src.split('?')[0];
      img.src = clean + (clean.indexOf('?') >= 0 ? '&' : '?') + '_r=' + (n + 1) + '_' + Date.now();
    }, 350 * (n + 1));
  }
  document.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG') retryImage(e.target);
  }, true);

  // 每次渲染后，把所有已完成加载的图片立即标记为 loaded
  function sweepLoadedImages() {
    var imgs = document.querySelectorAll('img:not(.loaded)');
    for (var i = 0; i < imgs.length; i++) markLoaded(imgs[i]);
  }
  // 兜底：定时检查几次，处理缓存命中的情况
  [0, 60, 200, 600, 1500].forEach(function(t) { setTimeout(sweepLoadedImages, t); });

  // 温和兜底：极少数情况下连接会被静默丢弃（既不报 error 也不加载）。
  // 只在"图片确实进入视口且已等待足够久(6s)"时才重试，且每张图全局只重试一次，
  // 避免把正常加载中的请求反复打断造成死循环。
  var _revivedOnce = {};
  function reviveSlowImages() {
    var vh = window.innerHeight || 800;
    var imgs = document.querySelectorAll('img:not(.loaded)');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.naturalWidth > 0) { markLoaded(img); continue; }
      var src = img.getAttribute('src');
      if (!src || _revivedOnce[src]) continue;
      var r = img.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh && r.width > 0) {
        _revivedOnce[src] = true;
        retryImage(img);
      }
    }
  }
  window.addEventListener('scroll', function() {
    if (reviveSlowImages._t) clearTimeout(reviveSlowImages._t);
    reviveSlowImages._t = setTimeout(reviveSlowImages, 6000);
  }, { passive: true });

  loadContent();
})();
