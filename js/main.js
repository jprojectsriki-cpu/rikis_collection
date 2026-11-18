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
        (scope || document).querySelectorAll('.hero-text > *, .sec-title, .sec-sub, .panel, .timeline li').forEach(function (el) {
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

    /* ---------------------------------------------------------
     * 3D の円形カルーセル（プロダクトが増えても、そのまま動く）
     * - カードを円筒の上に並べ、いちばん前のカードの左右に次のカードが見える
     * - 切り替え：◀ ▶ ボタン／カードを左右にドラッグ・スワイプ／← → キー／点／横のカードをクリック
     * - 並べる角度は、1枚あたり最大45°。8枚以上になると、ぐるっと一周の輪になる
     * --------------------------------------------------------- */
    var ringApi = null;

    function createRing(products, startAt) {
        var N = products.length;
        var cards = products.map(buildCard);
        var step = Math.min(45, 360 / N);       // 隣のカードとの角度
        var cur = Math.max(0, Math.min(N - 1, startAt || 0));
        var CW = 340, RH = 560, R = 0;
        var prevOff = [];

        var ring = h('div', { class: 'rring' }, cards);
        var stage = h('div', {
            class: 'rstage', tabindex: '0', role: 'group',
            'aria-roledescription': 'カルーセル',
            'aria-label': 'R-SERIES のプロダクト（← → キーで切り替え）'
        }, ring);

        var counter = h('span', { class: 'rcount', 'aria-live': 'polite' });
        var dots = h('div', { class: 'rdots' });
        var prevBtn = h('button', { type: 'button', class: 'rbtn', 'aria-label': '前のプロダクト', text: '◀' });
        var nextBtn = h('button', { type: 'button', class: 'rbtn', 'aria-label': '次のプロダクト', text: '▶' });
        products.forEach(function (p, i) {
            var d = h('button', { type: 'button', class: 'rdot', 'aria-label': p.nameEn });
            d.addEventListener('click', function () { goTo(i); });
            dots.append(d);
        });
        var hint = h('p', { class: 'rhint' },
            h('span', { class: 'rhint-pc', text: 'カードをクリック・ドラッグ、または ← → キーで切り替え' }),
            h('span', { class: 'rhint-sp', text: 'カードを左右にスワイプして切り替え' }));
        var ctl = h('div', { class: 'rctl' }, prevBtn, counter, nextBtn);
        var wrap = h('div', { class: 'rwrap' }, stage, N > 1 ? ctl : null, N > 1 ? dots : null, N > 1 ? hint : null);

        function pad2(n) { return (n < 10 ? '0' : '') + n; }

        // いちばん前から何枚ぶん右（＋）か左（－）か
        function offOf(i) {
            var d = (((i - cur) % N) + N) % N;
            return d > N / 2 ? d - N : d;
        }
        // 前から離れるほど、うすくする
        function alpha(x) {
            x = Math.abs(x);
            if (x <= 1) return 1 - 0.2 * x;
            if (x <= 2) return 0.8 - 0.35 * (x - 1);
            if (x <= 3) return 0.45 * (3 - x);
            return 0;
        }

        function place(frac) {
            var jumped = [];
            cards.forEach(function (c, i) {
                var o = offOf(i);
                var p = o + frac;
                // 輪の反対側へ回りこむカードは、動きをつけずに移す
                if (prevOff[i] !== undefined && N > 1 && Math.abs(o - prevOff[i]) > N / 2) {
                    c.style.transition = 'none';
                    jumped.push(c);
                }
                prevOff[i] = o;
                c.style.transform = 'translateZ(' + (-R) + 'px) rotateY(' + (p * step).toFixed(2) + 'deg) translateZ(' + R + 'px)';
                var a = alpha(p);
                c.style.opacity = a.toFixed(3);
                c.style.pointerEvents = a > 0.05 ? '' : 'none';
                var front = o === 0;
                c.classList.toggle('is-front', front);
                if (front) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
                Array.prototype.forEach.call(c.querySelectorAll('a'), function (a2) { a2.tabIndex = front ? 0 : -1; });
            });
            if (jumped.length) {
                void stage.offsetWidth; // 動きなしで移したあと、元にもどす
                jumped.forEach(function (c) { c.style.transition = ''; });
            }
        }

        function render() {
            place(0);
            counter.textContent = pad2(cur + 1) + ' / ' + pad2(N);
            Array.prototype.forEach.call(dots.children, function (d, i) {
                if (i === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
            });
        }

        function goTo(i) { if (i === cur || i < 0 || i >= N) return; cur = i; render(); }
        function next() { if (N > 1) { cur = (cur + 1) % N; render(); } }
        function prev() { if (N > 1) { cur = (cur - 1 + N) % N; render(); } }

        // カードの幅・高さ・輪の半径を決める（画面の幅が変わったときも呼ぶ）
        function layout() {
            var avail = wrap.clientWidth || 360;
            CW = Math.round(Math.max(250, Math.min(360, avail * 0.84)));
            // 隣のカードの縁が、前のカードに重ならない半径（カードを輪の接線に並べる）に、少しだけ余白を足す
            R = N > 1 ? Math.round((CW / 2) / Math.tan(step * Math.PI / 360) * 1.06) : 0;
            ring.style.width = CW + 'px';
            var max = 0;
            cards.forEach(function (c) { c.style.width = CW + 'px'; c.style.height = 'auto'; });
            cards.forEach(function (c) { max = Math.max(max, c.offsetHeight); });
            RH = max;
            cards.forEach(function (c) { c.style.height = RH + 'px'; });
            stage.style.height = RH + 'px';
            place(0);
        }

        prevBtn.addEventListener('click', prev);
        nextBtn.addEventListener('click', next);
        stage.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        });

        /* ---- ドラッグ・スワイプ ---- */
        var drag = null;
        var moved = false;

        stage.addEventListener('pointerdown', function (e) {
            if (N < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
            if (e.target.closest('a, button')) return; // 「詳細を見る」などはそのまま使えるように
            drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, horizontal: null };
            moved = false;
        });
        stage.addEventListener('pointermove', function (e) {
            if (!drag || e.pointerId !== drag.id) return;
            var dx = e.clientX - drag.x;
            var dy = e.clientY - drag.y;
            if (drag.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                drag.horizontal = Math.abs(dx) > Math.abs(dy);
                if (!drag.horizontal) { drag = null; return; } // 縦の動きは、ページのスクロールにまかせる
                try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
                stage.classList.add('dragging');
            }
            if (!drag.horizontal) return;
            moved = true;
            drag.dx = dx;
            place(Math.max(-1, Math.min(1, dx / (CW * 0.55))));
        });
        function endDrag(e) {
            if (!drag || (e && e.pointerId !== drag.id)) return;
            var d = drag;
            drag = null;
            if (!d.horizontal) return;
            stage.classList.remove('dragging');
            if (Math.abs(d.dx) > Math.min(90, CW * 0.2)) {
                if (d.dx < 0) next(); else prev();
            } else {
                place(0); // もとの位置にもどす
            }
        }
        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);

        // 横に見えているカードをクリック → そのカードを前に出す
        stage.addEventListener('click', function (e) {
            if (moved) { moved = false; e.preventDefault(); return; } // ドラッグのあとのクリックは無視
            if (e.target.closest('a, button')) return;
            var c = e.target.closest('.card');
            var i = c ? cards.indexOf(c) : -1;
            if (i >= 0 && i !== cur) goTo(i);
        });

        render();
        wrap.classList.toggle('is-single', N < 2);

        return {
            el: wrap,
            layout: layout,
            index: function () { return cur; },
            goToId: function (id) {
                for (var i = 0; i < N; i++) { if (cards[i].id === id) { goTo(i); return true; } }
                return false;
            }
        };
    }

    window.addEventListener('resize', function () { if (ringApi) ringApi.layout(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (ringApi) ringApi.layout(); });

    // R-SERIES のメニュー：そのプロダクトのカードを前に出して、カルーセルまでスクロール
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a || !ringApi) return;
        var id = a.getAttribute('href').slice(1);
        if (!id || id === 'products') return;
        if (ringApi.goToId(id)) {
            e.preventDefault();
            ringApi.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    function renderProducts(products) {
        var grid = $('#productGrid');
        if (!grid) return;
        var keep = ringApi ? ringApi.index() : 0;
        ringApi = null;
        grid.replaceChildren();
        if (!products.length) {
            grid.append(h('p', { class: 'note', text: 'プロダクトを準備中です。' }));
        } else {
            ringApi = createRing(products, keep);
            grid.append(ringApi.el);
            ringApi.layout(); // 画面に入れてから、大きさを決める
        }
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
