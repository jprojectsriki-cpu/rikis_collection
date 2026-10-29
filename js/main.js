/* ReicherRick Portfolio - front-end
 * - プロダクト一覧は GAS(API)から取得して描画する（カードを重ねたスライダーで表示）
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

    var COLORS = ['pink', 'cyan', 'green', 'purple', 'orange'];

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

    function buildCard(p) {
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

        var card = h('article', {
            id: p.slug,
            class: 'business-card pop-card',
            'aria-roledescription': 'スライド',
            'aria-label': p.nameEn + (p.subtitle ? '（' + p.subtitle + '）' : '')
        });
        card.append(buildImage(p), body);
        return card;
    }

    /* ---------------------------------------------------------
     * カードを重ねたスライダー
     * - いちばん前のカードの後ろに、次のカードが少しずつずれて重なって見える
     * - PC：前のカード・後ろに見えているカード・左右のボタン・点をクリックで切り替え
     * - スマホ：前のカードを左右にスワイプで切り替え
     * - キーボード：スライダーを選んで ← → で切り替え
     * --------------------------------------------------------- */
    var deck = null;

    function createDeck(products) {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var cards = products.map(function (p) { return buildCard(p); });
        var count = cards.length;
        var current = 0;
        var busy = false;

        var stage = h('div', { class: 'deck-stage' }, cards);
        var counter = h('span', { class: 'deck-count dela-gothic-one-regular', 'aria-live': 'polite' });
        var dots = h('div', { class: 'deck-dots', role: 'tablist', 'aria-label': '表示するプロダクトを選ぶ' });
        var prevBtn = h('button', { type: 'button', class: 'deck-btn dela-gothic-one-regular', 'aria-label': '前のプロダクト', text: '◀' });
        var nextBtn = h('button', { type: 'button', class: 'deck-btn dela-gothic-one-regular', 'aria-label': '次のプロダクト', text: '▶' });
        var hint = h('p', { class: 'deck-hint' });
        hint.append(
            h('span', { class: 'deck-hint-pc', text: 'カードをクリックすると、次のプロダクトに切り替わります（← → キーでも操作できます）' }),
            h('span', { class: 'deck-hint-sp', text: 'カードを左右にスワイプして切り替え' }));

        products.forEach(function (p, i) {
            var dot = h('button', { type: 'button', class: 'deck-dot', role: 'tab', 'aria-label': p.nameEn });
            dot.addEventListener('click', function () { goTo(i); });
            dots.append(dot);
        });

        var root = h('div', {
            class: 'deck animate-item zoom-in',
            tabindex: '0',
            'aria-roledescription': 'カルーセル',
            'aria-label': 'R-SERIES のプロダクト（← → キーで切り替え）'
        }, stage, h('div', { class: 'deck-controls' }, prevBtn, h('div', { class: 'deck-center' }, counter, dots), nextBtn), hint);

        function pad2(n) { return (n < 10 ? '0' : '') + n; }

        // 重なりのずれ（スマホは小さめ）
        function offset() { return window.innerWidth <= 960 ? 10 : 18; }

        // 前から何枚目か（0 がいちばん前）
        function posOf(i) { return (i - current + count) % count; }

        function place(card, pos, extra) {
            var o = offset();
            var shown = Math.min(pos, 2);
            var deg = window.innerWidth <= 960 ? 0.5 : 0.8; // 縦に長いスマホのカードは、傾きを小さくして画面からはみ出さないようにする
            var t = extra || ('translate(' + (shown * o) + 'px, ' + (-shown * o) + 'px) rotate(' + (shown * deg) + 'deg) scale(' + (1 - shown * 0.02) + ')');
            card.style.transform = t;
            card.style.zIndex = String(count - pos);
            card.style.opacity = pos > 2 ? '0' : '1';
            card.classList.toggle('is-front', pos === 0);
            card.classList.toggle('is-peek', pos === 1 || pos === 2);
            // 後ろのカードは、リンクにフォーカスが移らないようにする
            if (pos === 0) { card.removeAttribute('inert'); card.removeAttribute('aria-hidden'); }
            else { card.setAttribute('inert', ''); card.setAttribute('aria-hidden', 'true'); }
        }

        function render() {
            cards.forEach(function (c, i) { place(c, posOf(i)); });
            counter.textContent = pad2(current + 1) + ' / ' + pad2(count);
            Array.prototype.forEach.call(dots.children, function (d, i) {
                d.setAttribute('aria-selected', String(i === current));
            });
        }

        // いちばん前のカードを、左右どちらかに飛ばしてから後ろへ回す
        function flyOut(card, dir, after) {
            if (reduceMotion) { after(); return; }
            busy = true;
            card.style.transition = 'transform 0.32s ease-in, opacity 0.32s ease-in';
            card.style.transform = 'translate(' + (dir * 115) + '%, 20px) rotate(' + (dir * 14) + 'deg)';
            card.style.opacity = '0';
            setTimeout(function () {
                card.style.transition = 'none';
                after();
                // 後ろに回ったあと、次の描画から元の動きにもどす
                requestAnimationFrame(function () { requestAnimationFrame(function () {
                    card.style.transition = '';
                    busy = false;
                }); });
            }, 320);
        }

        function next(dir) {
            if (busy || count < 2) return;
            var front = cards[current];
            flyOut(front, dir || -1, function () {
                current = (current + 1) % count;
                render();
            });
            if (reduceMotion) return;
            // 2枚目以降は、すぐに前へ詰める
            cards.forEach(function (c, i) { if (i !== current) place(c, Math.max(0, posOf(i) - 1)); });
        }

        function prev() {
            if (busy || count < 2) return;
            current = (current - 1 + count) % count;
            var incoming = cards[current];
            if (reduceMotion) { render(); return; }
            busy = true;
            // いちばん後ろのカードを、左の外側から前へ入れる
            incoming.style.transition = 'none';
            incoming.style.zIndex = String(count + 1);
            incoming.style.opacity = '0';
            incoming.style.transform = 'translate(-115%, 20px) rotate(-14deg)';
            requestAnimationFrame(function () { requestAnimationFrame(function () {
                incoming.style.transition = '';
                render();
                setTimeout(function () { busy = false; }, 420);
            }); });
        }

        function goTo(i) {
            if (i === current || busy) return;
            if (i === (current + 1) % count) { next(-1); return; }
            if (i === (current - 1 + count) % count) { prev(); return; }
            current = i;
            render();
        }

        prevBtn.addEventListener('click', function () { prev(); });
        nextBtn.addEventListener('click', function () { next(-1); });
        root.addEventListener('keydown', function (e) {
            if (e.target !== root) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); next(-1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        });

        /* ---- クリック・スワイプ ---- */
        var drag = null;
        var moved = false;

        stage.addEventListener('pointerdown', function (e) {
            if (busy || e.button !== 0) return;
            var card = e.target.closest('.business-card');
            if (!card || !card.classList.contains('is-front')) return;
            if (e.target.closest('a, button')) return; // リンク（詳細を見る）はそのまま使えるようにする
            drag = { card: card, x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, horizontal: null };
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
                drag.card.style.transition = 'none';
            }
            if (!drag.horizontal) return;
            moved = true;
            drag.dx = dx;
            drag.card.style.transform = 'translate(' + dx + 'px, 0) rotate(' + (dx / 25) + 'deg)';
        });

        function endDrag(e) {
            if (!drag || (e && e.pointerId !== drag.id)) return;
            var d = drag;
            drag = null;
            if (!d.horizontal) return;
            d.card.style.transition = '';
            if (Math.abs(d.dx) > Math.min(110, stage.clientWidth * 0.22)) {
                next(d.dx < 0 ? -1 : 1);
            } else {
                place(d.card, 0); // もとの位置にもどす
            }
        }
        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);

        // クリック：いちばん前のカード、または後ろに見えているカードの端 → 次のプロダクトへ
        // （後ろのカードは inert なので、クリックは stage が受け取る）
        stage.addEventListener('click', function (e) {
            if (moved) { moved = false; e.preventDefault(); return; } // スワイプのあとのクリックは無視
            if (e.target.closest('a, button')) return;                 // 「詳細を見る」などのリンクはそのまま
            var card = e.target.closest('.business-card');
            if (card && !card.classList.contains('is-front')) return;
            next(-1);
        });

        /* ---- タグとプロダクト名の位置を、すべてのカードでそろえる ----
         * 1) タグは1行に収める（入らないときは、文字を少しだけ小さくする）
         * 2) それでも高さがちがうときは、タグの下の余白で調整して、プロダクト名の位置をそろえる */
        var tags = cards.map(function (c) { return c.querySelector('.business-tag'); });
        var names = cards.map(function (c) { return c.querySelector('.business-name'); });

        function alignHeads() {
            var MIN_PX = 10;
            var sizes = [];
            // ① それぞれのタグが1行に収まる文字の大きさを調べる
            tags.forEach(function (t) {
                if (!t) return;
                t.style.fontSize = '';
                t.style.whiteSpace = 'nowrap';
                t.style.marginBottom = '';
                var body = t.parentNode;
                var cs = window.getComputedStyle(body);
                var avail = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
                var size = parseFloat(window.getComputedStyle(t).fontSize);
                // scrollWidth：枠に収まりきらない部分も含めた、文字全体の幅
                while (Math.max(t.offsetWidth, t.scrollWidth) > avail + 0.5 && size > MIN_PX) {
                    size -= 0.5;
                    t.style.fontSize = size + 'px';
                }
                t._avail = avail;
                sizes.push(size);
            });
            // ② すべてのタグを、いちばん小さい大きさにそろえる（カードごとに文字の大きさが変わらないように）
            var common = Math.min.apply(null, sizes);
            tags.forEach(function (t) {
                if (!t) return;
                t.style.fontSize = common + 'px';
                if (Math.max(t.offsetWidth, t.scrollWidth) > t._avail + 0.5) t.style.whiteSpace = 'normal'; // とても長いときだけ折り返す
            });
            // カードの上端からプロダクト名までの距離を、いちばん大きいものに合わせる
            var tops = names.map(function (n) {
                if (!n) return 0;
                var body = n.parentNode;
                return n.offsetParent === body ? n.offsetTop : n.offsetTop - body.offsetTop;
            });
            var maxTop = Math.max.apply(null, tops);
            tags.forEach(function (t, i) {
                if (!t || tops[i] >= maxTop) return;
                var mb = parseFloat(window.getComputedStyle(t).marginBottom);
                t.style.marginBottom = (mb + maxTop - tops[i]) + 'px';
            });
        }

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (!busy) render();
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(alignHeads, 120);
        });
        // Webフォントの読み込みが終わると文字の幅が変わるので、もう一度そろえる
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alignHeads(); });
        if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { alignHeads(); });

        render();
        if (count < 2) root.classList.add('is-single');

        return {
            el: root,
            align: alignHeads,
            indexOf: function (id) { for (var i = 0; i < count; i++) { if (cards[i].id === id) return i; } return -1; },
            goTo: function (i) { if (i >= 0) { current = i; render(); } }
        };
    }

    // R-SERIES のメニューが空のとき、理由を表示する（中身が空のまま開いて見えなくなるのを防ぐ）
    function renderNavMessage(text) {
        var mobile = document.getElementById('mobileSubMenu');
        var desktop = document.getElementById('dropdownMenu');
        var style = 'font-size:0.8rem; color:var(--text-sub); padding:0.6rem 1rem; text-align:center;';
        if (mobile && !mobile.children.length) mobile.append(h('span', { style: style, text: text }));
        if (desktop && !desktop.children.length) desktop.append(h('span', { style: style, text: text }));
    }

    function renderNav(products) {
        var desktop = document.getElementById('dropdownMenu');
        var mobile = document.getElementById('mobileSubMenu');
        if (!desktop || !mobile) return;
        desktop.replaceChildren();
        mobile.replaceChildren();
        if (!products.length) { renderNavMessage('プロダクトを準備中です。'); return; }

        products.forEach(function (p) {
            desktop.append(
                h('a', { href: '#' + p.slug, class: 'dropdown-item' },
                    h('span', { class: 'title-en', text: p.nameEn }),
                    h('span', { class: 'title-ja', text: p.subtitle })));
                        mobile.append(
                h('a', { href: '#' + p.slug, class: 'mobile-link mobile-sub-item' },
                    h('span', { class: 'title-en', text: p.nameEn }),
                    h('span', { class: 'title-ja', text: p.subtitle })));
        });
    }

    function renderProducts(products) {
        var list = document.getElementById('productList');
        if (!list) return;
        list.replaceChildren();

        if (!products.length) {
            list.append(h('p', { class: 'empty-note', text: 'プロダクトを準備中です。' }));
        }
        deck = null;
        if (products.length) {
            deck = createDeck(products);
            list.append(deck.el);
            deck.align(); // 画面に入れてから、位置をそろえる
        }

        renderNav(products);
        handleScrollAnimation();
    }

    function showProductError() {
        renderNavMessage('読み込めませんでした。再読み込みしてください。');
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

        // スマホのアコーディオン：開閉と、矢印・aria の更新をまとめる
        function setAccordion(open) {
            mobileSubMenu.classList.toggle('is-open', open);
            mobileAccordionBtn.setAttribute('aria-expanded', String(open));
            mobileAccordionIcon.textContent = open ? '▲' : '▼';
            if (!open) return;
            // 画面より長いときも、最後の項目まで見える位置までメニューをスクロールする
            window.requestAnimationFrame(function () {
                var last = mobileSubMenu.lastElementChild;
                if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }

        function closeMenus() {
            navDropdown.classList.remove('active');
            dropdownBtn.setAttribute('aria-expanded', 'false');
            mobileNav.classList.remove('is-open');
            setAccordion(false);
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
        mobileAccordionBtn.setAttribute('aria-expanded', 'false');
        menuBtn.addEventListener('click', function () {
            var open = mobileNav.classList.toggle('is-open');
            if (!open) setAccordion(false); // メニューを閉じたら、アコーディオンも閉じる
        });
        mobileAccordionBtn.addEventListener('click', function () {
            setAccordion(!mobileSubMenu.classList.contains('is-open'));
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
                var id = href.slice(1);
                var index = deck ? deck.indexOf(id) : -1;
                if (index >= 0) {
                    // R-SERIES のメニューから：そのプロダクトのカードを前に出して、スライダーまでスクロール
                    deck.goTo(index);
                    deck.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    var target = document.getElementById(id);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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
