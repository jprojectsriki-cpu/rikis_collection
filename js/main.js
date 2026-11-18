/* ReicherRick Portfolio - front-end
 * - プロダクト一覧は GAS(API)から取得して描画する
 * - お問い合わせは GAS(API)へ POST する
 * - 背景の時計の針は、スクロールに合わせて動く
 */
(function () {
    'use strict';

    var CONFIG = window.PORTFOLIO_CONFIG || {};
    var API_URL = CONFIG.API_URL || '';
    var CACHE_KEY = 'portfolio_products_v1';
    var COLORS = ['pink', 'cyan', 'green', 'purple', 'orange', 'indigo'];

    function $(s) { return document.querySelector(s); }

    /* ---------------------------------------------------------
     * 小さなDOM作成ヘルパー(データは必ず textContent / setAttribute で入れる)
     * --------------------------------------------------------- */
    function h(tag, props) {
        var node = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) {
            var v = props[k];
            if (v === null || v === undefined || v === false || v === '') return;
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else node.setAttribute(k, v);
        });
        for (var i = 2; i < arguments.length; i++) {
            var c = arguments[i];
            if (Array.isArray(c)) {
                c.forEach(function (x) { if (x) node.append(x); });
            } else if (c) {
                node.append(c);
            }
        }
        return node;
    }

    function isHttpUrl(url) {
        return /^https?:\/\//i.test(String(url || ''));
    }

    /* ---------------------------------------------------------
     * 時計の目盛り
     * --------------------------------------------------------- */
    (function () {
        var g = $('.ticks');
        if (!g) return;
        for (var i = 0; i < 12; i++) {
            var long = i % 3 === 0;
            var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            l.setAttribute('x1', 100); l.setAttribute('x2', 100);
            l.setAttribute('y1', 14); l.setAttribute('y2', long ? 28 : 21);
            l.setAttribute('transform', 'rotate(' + (i * 30) + ' 100 100)');
            g.appendChild(l);
        }
    })();

    /* ---------------------------------------------------------
     * メニュー(ハンバーガー + R-SERIES)
     * --------------------------------------------------------- */
    var nav = $('#nav');
    var burger = $('#burger');
    var sub = $('#subList');
    var toggle = $('#subToggle');

    function setSub(open) {
        sub.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        sub.style.maxHeight = open ? sub.scrollHeight + 'px' : '';
    }
    function setNav(open) {
        nav.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
        if (!open) setSub(false);
    }
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
    toggle.addEventListener('click', function () { setSub(!sub.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#seriesMenu')) setSub(false);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { setNav(false); setSub(false); }
    });

    /* ---------------------------------------------------------
     * スクロール連動：時計の針
     * --------------------------------------------------------- */
    var root = document.documentElement;
    var target = 0, cur = 0, raf = 0;
    function tick() {
        cur += (target - cur) * 0.12;
        if (Math.abs(target - cur) < 0.0005) cur = target;
        root.style.setProperty('--p', cur.toFixed(4));
        raf = cur === target ? 0 : requestAnimationFrame(tick);
    }
    function onScroll() {
        var max = root.scrollHeight - window.innerHeight;
        target = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (!raf) raf = requestAnimationFrame(tick);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    /* ---------------------------------------------------------
     * スクロール連動：要素の表示アニメーション
     * --------------------------------------------------------- */
    var io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    }

    function reveal(scope) {
        (scope || document).querySelectorAll('.hero-text > *, .sec-title, .sec-sub, .panel, .card, .timeline li').forEach(function (el) {
            if (el.dataset.rv) return;
            el.dataset.rv = 1;
            if (!io) return; // 古いブラウザでは、アニメーションなしでそのまま表示
            el.classList.add('rv');
            var i = Array.prototype.indexOf.call(el.parentElement.children, el);
            el.style.setProperty('--d', Math.min(i, 5) * 90 + 'ms');
            io.observe(el);
        });
    }
    reveal();

    /* ---------------------------------------------------------
     * プロダクトカードの描画
     * --------------------------------------------------------- */
    function buildCard(p) {
        var color = COLORS.indexOf(p.tagColor) >= 0 ? p.tagColor : 'cyan';

        var img = isHttpUrl(p.image)
            ? h('img', { src: p.image, alt: p.nameEn + 'のイメージ', loading: 'lazy' })
            : h('div', { class: 'card-fallback', 'aria-hidden': 'true', text: String(p.nameEn || 'R').charAt(0) });

        function detail(title, text) {
            if (!title) return null;
            return h('div', { class: 'pt' }, h('h4', { text: title }), h('p', { text: text }));
        }

        var button = isHttpUrl(p.publicUrl)
            ? h('a', { class: 'btn', href: p.publicUrl, target: '_blank', rel: 'noopener', 'aria-label': p.nameEn + ' の詳細を見る（新しいタブで開きます）', text: '詳細を見る ➔' })
            : h('span', { class: 'btn off', text: 'COMING SOON' });

        var body = h('div', { class: 'card-body' },
            p.tag ? h('span', { class: 'ptag', text: p.tag }) : null,
            h('h3', { text: p.nameEn }),
            p.subtitle ? h('span', { class: 'ja', text: p.subtitle }) : null,
            h('p', { class: 'desc', text: p.description }),
            detail(p.detail1Title, p.detail1Text),
            detail(p.detail2Title, p.detail2Text),
            h('div', { class: 'card-foot' }, button));

        return h('article', {
            id: p.slug,
            class: 'card c-' + color,
            'aria-label': p.nameEn + (p.subtitle ? '（' + p.subtitle + '）' : '')
        }, h('div', { class: 'card-img' }, img), body);
    }

    function renderNav(products) {
        sub.replaceChildren();
        products.forEach(function (p) {
            sub.append(h('li', null,
                h('a', { href: '#' + p.slug },
                    p.nameEn,
                    p.subtitle ? h('small', { text: p.subtitle }) : null)));
        });
        sub.append(h('li', null, h('a', { href: '#products', text: 'プロダクト一覧' })));
        if (sub.classList.contains('open')) sub.style.maxHeight = sub.scrollHeight + 'px';
    }

    function renderProducts(products) {
        var grid = $('#productGrid');
        if (!grid) return;
        grid.replaceChildren();
        if (!products.length) {
            grid.append(h('p', { class: 'note', text: 'プロダクトを準備中です。' }));
        } else {
            products.forEach(function (p) { grid.append(buildCard(p)); });
        }
        reveal(grid);
        renderNav(products);
    }

    function showProductError() {
        var grid = $('#productGrid');
        if (!grid || grid.querySelector('.card')) return;
        grid.replaceChildren(h('p', {
            class: 'note err',
            text: 'プロダクト情報を読み込めませんでした。時間をおいて、再読み込みしてください。'
        }));
    }

    /* ---------------------------------------------------------
     * API
     * --------------------------------------------------------- */
    function apiReady() {
        return isHttpUrl(API_URL) && API_URL.indexOf('ここに') === -1;
    }

    function loadProducts() {
        if (!apiReady()) {
            console.error('config.js の API_URL が設定されていません。');
            showProductError();
            return Promise.resolve();
        }

        // 2回目以降の訪問では、前回のデータを先に表示して待ち時間を減らす
        var cachedRaw = null;
        try {
            cachedRaw = localStorage.getItem(CACHE_KEY);
            var cached = JSON.parse(cachedRaw);
            if (Array.isArray(cached) && cached.length) renderProducts(cached);
        } catch (e) { cachedRaw = null; }

        return fetch(API_URL + '?action=products')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data || !data.ok || !Array.isArray(data.products)) throw new Error('bad response');
                var fresh = JSON.stringify(data.products);
                if (fresh !== cachedRaw) renderProducts(data.products);
                try { localStorage.setItem(CACHE_KEY, fresh); } catch (e) { /* 無視 */ }
            })
            .catch(function (err) {
                console.error(err);
                showProductError();
            });
    }

    function postContact(data) {
        // Content-Type を text/plain にすると、ブラウザの事前確認(プリフライト)が不要になる
        return fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        }).then(function (res) { return res.json(); });
    }

    loadProducts();

    /* ---------------------------------------------------------
     * お問い合わせフォーム
     * --------------------------------------------------------- */
    var form = $('#contactForm');
    if (!form) return;
    var msg = $('#formMsg');
    var count = $('#count');
    var btn = $('#submitBtn');
    var overlay = $('#sending');
    var MIN_LOADING_MS = 800; // 一瞬で消えてチラつかないよう、最低限は表示する
    var startedAt = 0;

    form.message.addEventListener('input', function () { count.textContent = form.message.value.length; });

    function setSending(on) {
        btn.disabled = on;
        form.setAttribute('aria-busy', String(on));
        overlay.hidden = !on;
    }

    function finish(ok, text) {
        var wait = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));
        setTimeout(function () {
            setSending(false);
            msg.className = ok ? 'note' : 'note err';
            msg.textContent = text;
        }, wait);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        msg.className = 'note';
        if (form.website.value) return; // ボット対策
        if (!form.checkValidity()) {
            msg.className = 'note err';
            msg.textContent = '必須項目をすべて入力してください。';
            return;
        }
        if (!apiReady()) { msg.className = 'note err'; msg.textContent = '送信先が設定されていません。'; return; }

        var fd = new FormData(form);
        var data = {
            name: fd.get('name'),
            email: fd.get('email'),
            subject: fd.get('subject'),
            message: fd.get('message'),
            website: fd.get('website')
        };

        startedAt = Date.now();
        setSending(true);
        msg.textContent = '';

        postContact(data)
            .then(function (res) {
                if (res && res.ok) {
                    form.reset();
                    count.textContent = '0';
                    finish(true, 'お問い合わせを受け付けました。ありがとうございます。');
                } else {
                    finish(false, (res && res.message) || '送信に失敗しました。');
                }
            })
            .catch(function (err) {
                console.error(err);
                finish(false, '送信に失敗しました。時間をおいてもう一度お試しください。');
            });
    });
})();
