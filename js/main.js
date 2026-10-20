/* ReicherRick Portfolio - front-end
 * - プロダクト一覧は GAS(API)から取得して描画する
 * - お問い合わせは GAS(API)へ POST する
 */
(function () {
    'use strict';

    var CONFIG = window.PORTFOLIO_CONFIG || {};
    var API_URL = CONFIG.API_URL || '';
    var CACHE_KEY = 'portfolio_products_v1';

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

    var COLORS = ['pink', 'cyan', 'green', 'purple'];

    /* ---------------------------------------------------------
     * プロダクトカードの描画
     * --------------------------------------------------------- */
    function buildImage(p) {
        var wrap = h('div', { class: 'business-img pop-img-wrap' });
        if (isHttpUrl(p.image)) {
            wrap.append(h('img', { src: p.image, alt: p.nameEn + 'のイメージ', loading: 'lazy' }));
        } else {
            wrap.append(h('div', { class: 'img-fallback dela-gothic-one-regular', text: p.nameEn }));
        }
        return wrap;
    }

    function buildDetail(title, text) {
        if (!title) return null;
        return h('div', null, h('h4', { text: title }), h('p', { text: text }));
    }

    function buildCard(p, reverse) {
        var color = COLORS.indexOf(p.tagColor) >= 0 ? p.tagColor : 'pink';

        var name = h('h3', { class: 'business-name dela-gothic-one-regular' }, p.nameEn);
        if (p.subtitle) name.append(h('span', { class: 'business-name-sub', text: p.subtitle }));

        var details = null;
        if (p.detail1Title || p.detail2Title) {
            details = h('div', { class: 'business-detail' },
                buildDetail(p.detail1Title, p.detail1Text),
                buildDetail(p.detail2Title, p.detail2Text));
        }

        var button;
        if (isHttpUrl(p.publicUrl)) {
            button = h('a', {
                href: p.publicUrl, target: '_blank', rel: 'noopener',
                class: 'card-btn c-' + color + ' dela-gothic-one-regular',
                text: p.nameEn + ' の詳細を見る ➔'
            });
        } else {
            button = h('span', { class: 'card-btn is-disabled dela-gothic-one-regular', text: 'COMING SOON' });
        }

        var body = h('div', { class: 'business-body' },
            p.tag ? h('span', { class: 'business-tag tag-' + color + ' dela-gothic-one-regular', text: p.tag }) : null,
            name,
            h('p', { class: 'business-desc', text: p.description }),
            details,
            button);

        var card = h('div', {
            id: p.slug,
            class: 'business-card' + (reverse ? ' reverse' : '') + ' pop-card animate-item ' + (reverse ? 'from-right' : 'from-left')
        });
        if (reverse) { card.append(body, buildImage(p)); }
        else { card.append(buildImage(p), body); }
        return card;
    }

    function renderNav(products) {
        var desktop = document.getElementById('dropdownMenu');
        var mobile = document.getElementById('mobileSubMenu');
        if (!desktop || !mobile) return;
        desktop.replaceChildren();
        mobile.replaceChildren();

        products.forEach(function (p) {
            desktop.append(
                h('a', { href: '#' + p.slug, class: 'dropdown-item' },
                    h('span', { class: 'title-en', text: p.nameEn }),
                    h('span', { class: 'title-ja', text: p.subtitle })));
            mobile.append(
                h('a', { href: '#' + p.slug, class: 'mobile-link mobile-sub-item' },
                    h('span', { text: p.nameEn }),
                    h('span', { style: 'font-size:0.7rem; color:var(--text-sub);', text: p.subtitle })));
        });
    }

    function renderProducts(products) {
        var list = document.getElementById('productList');
        if (!list) return;
        list.replaceChildren();

        if (!products.length) {
            list.append(h('p', { class: 'empty-note', text: 'プロダクトを準備中です。' }));
        }
        products.forEach(function (p, i) { list.append(buildCard(p, i % 2 === 1)); });

        renderNav(products);
        handleScrollAnimation();
    }

    function showProductError() {
        var list = document.getElementById('productList');
        if (!list || list.querySelector('.business-card')) return;
        list.replaceChildren(h('p', {
            class: 'empty-note',
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

    /* ---------------------------------------------------------
     * スクロール連動アニメーション
     * --------------------------------------------------------- */
    function handleScrollAnimation() {
        var windowHeight = window.innerHeight;
        document.querySelectorAll('.animate-item').forEach(function (el) {
            var rect = el.getBoundingClientRect();
            var inView = rect.top < windowHeight * 0.88 && rect.bottom > windowHeight * 0.1;
            el.classList.toggle('is-visible', inView);
        });
    }

    /* ---------------------------------------------------------
     * 初期化
     * --------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        var navDropdown = document.getElementById('navDropdown');
        var dropdownBtn = document.getElementById('dropdownBtn');
        var menuBtn = document.getElementById('menuBtn');
        var mobileNav = document.getElementById('mobileNav');
        var mobileAccordionBtn = document.getElementById('mobileAccordionBtn');
        var mobileSubMenu = document.getElementById('mobileSubMenu');
        var mobileAccordionIcon = document.getElementById('mobileAccordionIcon');

        // スクロールアニメーション
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(function () {
                handleScrollAnimation();
                ticking = false;
            });
        });
        handleScrollAnimation();

        function closeMenus() {
            navDropdown.classList.remove('active');
            dropdownBtn.setAttribute('aria-expanded', 'false');
            mobileNav.classList.remove('is-open');
            mobileSubMenu.classList.remove('is-open');
            mobileAccordionIcon.textContent = '▼';
        }

        // PC: ドロップダウン
        dropdownBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = navDropdown.classList.contains('active');
            navDropdown.classList.toggle('active');
            dropdownBtn.setAttribute('aria-expanded', String(!isOpen));
        });
        document.addEventListener('click', function (e) {
            if (!navDropdown.contains(e.target)) {
                navDropdown.classList.remove('active');
                dropdownBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // スマホ: メニューとアコーディオン
        menuBtn.addEventListener('click', function () { mobileNav.classList.toggle('is-open'); });
        mobileAccordionBtn.addEventListener('click', function () {
            var isOpen = mobileSubMenu.classList.toggle('is-open');
            mobileAccordionIcon.textContent = isOpen ? '▲' : '▼';
        });

        // ページ内リンク(動的に作られるメニュー項目にも効くよう、まとめて処理)
        document.addEventListener('click', function (e) {
            var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!a) return;
            e.preventDefault();
            var href = a.getAttribute('href');
            if (href === '#') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                var target = document.getElementById(href.slice(1));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            closeMenus();
        });

        // プロダクト一覧
        loadProducts();

        // お問い合わせフォーム
        var form = document.getElementById('contactForm');
        if (!form) return;
        var btn = document.getElementById('submitBtn');
        var label = document.getElementById('submitLabel');
        var status = document.getElementById('formStatus');
        var msg = document.getElementById('f-message');
        var counter = document.getElementById('msgCount');

        function updateCount() {
            if (msg && counter) counter.textContent = msg.value.length + ' / 2000';
        }
        if (msg) msg.addEventListener('input', updateCount);

        var overlay = document.getElementById('sendOverlay');
        var MIN_LOADING_MS = 800; // 一瞬で消えてチラつかないよう、最低限は表示する
        var startedAt = 0;

        function setSending(on) {
            btn.disabled = on;
            btn.classList.toggle('is-sending', on);
            form.setAttribute('aria-busy', String(on));
            label.textContent = on ? '送信中...' : '送信する';
            if (overlay) overlay.hidden = !on;
        }

        function finish(ok, text) {
            var wait = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));
            setTimeout(function () {
                setSending(false);
                status.className = ok ? 'form-status' : 'form-status is-error';
                status.textContent = text;
            }, wait);
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!apiReady()) { finish(false, '送信先が設定されていません。'); return; }

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
            status.textContent = '';
            status.className = 'form-status';

            postContact(data)
                .then(function (res) {
                    if (res && res.ok) {
                        form.reset();
                        updateCount();
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
    });
})();