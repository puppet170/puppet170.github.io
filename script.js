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

  var photos = [];

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

  // 懒加载：首屏前几张立即请求，其余等滑动到附近才下载（省带宽）
  var EAGER_COUNT = 5;
  var lazyObserver = null;

  if ("IntersectionObserver" in window) {
    lazyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          lazyObserver.unobserve(img);
        });
      },
      { root: null, rootMargin: "200px 0px", threshold: 0.01 }
    );
  }

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

      var tile = document.createElement("figure");
      tile.className = "tile";
      tile.dataset.index = String(i);

      var img = document.createElement("img");
      img.alt = (item && item.name) || "作品 " + (i + 1);
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

      // 防随手保存：禁止拖拽图片、屏蔽图片上的右键菜单
      img.draggable = false;
      img.addEventListener("dragstart", function (e) {
        e.preventDefault();
      });
      img.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });

      // 首屏几张立即请求；其余只挂 data-src，滚到附近才真正下载
      if (i < EAGER_COUNT || !lazyObserver) {
        img.src = src;
        img.loading = "eager";
        img.setAttribute("fetchpriority", i === 0 ? "high" : "auto");
      } else {
        img.dataset.src = src;
        img.loading = "lazy";
        img.setAttribute("fetchpriority", "low");
      }

      tile.appendChild(img);

      frag.appendChild(tile);
    });

    gallery.appendChild(frag);

    if (lazyObserver) {
      var pending = gallery.querySelectorAll("img[data-src]");
      for (var k = 0; k < pending.length; k++) lazyObserver.observe(pending[k]);
    }

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
