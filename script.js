/* =========================================================
   访客展示端逻辑（index.html）
   只读：读取 data.json -> 渲染画廊 -> 灯箱浏览
   没有任何上传 / 删除 / 排序入口
   ========================================================= */

(function () {
  "use strict";

  var FALLBACK = {
    title: "170PUPPET",
    photos: [
      { src: "images/01.svg", w: 1200, h: 1500 },
      { src: "images/02.svg", w: 1600, h: 1067 },
      { src: "images/03.svg", w: 1200, h: 1500 },
      { src: "images/04.svg", w: 1400, h: 1400 },
      { src: "images/05.svg", w: 1600, h: 1067 },
      { src: "images/06.svg", w: 1200, h: 1600 },
      { src: "images/07.svg", w: 1600, h: 1000 },
      { src: "images/08.svg", w: 1200, h: 1200 }
    ]
  };

  var gallery = document.getElementById("gallery");
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightbox-img");
  var lbCount = document.getElementById("lightbox-count");

  var photos = [];
  var current = 0;

  /* ---------- 数据加载 ---------- */

  function loadData() {
    // 用 no-store 保证你替换 data.json 后刷新就能看到最新顺序
    return fetch("data.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("data.json " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.photos) || !data.photos.length) {
          throw new Error("data.json 为空");
        }
        return data.photos;
      })
      .catch(function (err) {
        // 直接双击 index.html（file:// 协议）时 fetch 会被浏览器拦截，用内置数组兜底
        console.warn("[170PUPPET] 读取 data.json 失败，使用内置数组：", err.message);
        return FALLBACK.photos;
      });
  }

  /* ---------- 渲染 ---------- */

  function render(list) {
    photos = list;
    gallery.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = "暂无作品";
      gallery.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();

    list.forEach(function (item, i) {
      var src = typeof item === "string" ? item : item.src;
      var w = (item && item.w) || 0;
      var h = (item && item.h) || 0;

      var tile = document.createElement("a");
      tile.className = "tile";
      tile.href = "#";
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", "查看第 " + (i + 1) + " 张作品");
      tile.dataset.index = String(i);

      var img = document.createElement("img");
      img.src = src;
      img.alt = (item && item.name) || "作品 " + (i + 1);
      img.loading = i < 8 ? "eager" : "lazy";
      img.decoding = "async";
      // 预留宽高比，避免加载时布局跳动
      if (w && h) {
        img.width = w;
        img.height = h;
        img.style.aspectRatio = w + " / " + h;
      }

      img.addEventListener("load", function () {
        img.classList.add("is-loaded");
        scheduleLayout();
      });

      tile.appendChild(img);

      tile.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(i);
      });

      frag.appendChild(tile);
    });

    gallery.appendChild(frag);
    scheduleLayout();
  }

  /* ---------- 瀑布流：Grid 行跨度计算 ---------- */

  var RAF = null;

  function scheduleLayout() {
    if (RAF) return;
    RAF = requestAnimationFrame(function () {
      RAF = null;
      layout();
    });
  }

  function layout() {
    var tiles = gallery.querySelectorAll(".tile");
    if (!tiles.length) return;

    var cs = getComputedStyle(gallery);
    // 行高单位取自 CSS 里的 grid-auto-rows（8px）
    var rowUnit = parseFloat(cs.gridAutoRows) || 8;
    var gap =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--gap")
      ) || 20;

    // 先统一读取（避免读写交错触发多次重排）
    var heights = [];
    for (var i = 0; i < tiles.length; i++) {
      var img = tiles[i].querySelector("img");
      heights.push(img ? img.getBoundingClientRect().height : 0);
    }

    // 再统一写入
    for (var j = 0; j < tiles.length; j++) {
      var h = heights[j];
      if (!h) {
        tiles[j].style.gridRowEnd = "span 1";
        continue;
      }
      var span = Math.max(1, Math.ceil((h + gap) / rowUnit));
      tiles[j].style.gridRowEnd = "span " + span;
    }
  }

  /* ---------- 灯箱 ---------- */

  function openLightbox(index) {
    if (!lightbox || !photos.length) return;
    current = (index + photos.length) % photos.length;
    paintLightbox(true);
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function step(delta) {
    if (!photos.length) return;
    current = (current + delta + photos.length) % photos.length;
    paintLightbox(false);
  }

  function paintLightbox(animate) {
    var item = photos[current];
    var src = typeof item === "string" ? item : item.src;
    if (animate) lbImg.style.opacity = "0";
    lbImg.onload = function () {
      lbImg.style.opacity = "1";
    };
    lbImg.src = src;
    lbImg.style.transition = "opacity .3s ease";
    if (lbCount) {
      var n = photos.length;
      lbCount.textContent =
        String(current + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
    }
  }

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    var btnClose = document.getElementById("lightbox-close");
    var btnPrev = document.getElementById("lightbox-prev");
    var btnNext = document.getElementById("lightbox-next");
    if (btnClose) btnClose.addEventListener("click", closeLightbox);
    if (btnPrev) btnPrev.addEventListener("click", function () {
      step(-1);
    });
    if (btnNext) btnNext.addEventListener("click", function () {
      step(1);
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ---------- 导航：滚动阴影 + 标题回顶 ---------- */

  var header = document.querySelector(".site-header");
  var title = document.querySelector(".site-title");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (title) {
    title.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 尺寸变化重新排版 ---------- */

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  window.addEventListener("load", scheduleLayout);

  /* ---------- 启动 ---------- */

  gallery.classList.add("is-loading");
  loadData().then(function (list) {
    render(list);
    gallery.classList.remove("is-loading");
  });
})();
