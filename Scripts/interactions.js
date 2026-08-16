/*
 * Vanilla-JS recreation of interactive behaviour that, on inspection, turned out
 * to depend on Duda's runtime.js / rt-widgets.js / numbered chunk bundles under
 * Scripts/ -- and those files are never actually <script src>'d by ANY page in
 * the original export (verified: grepping every exported page, every device
 * variant, for a reference to runtime.js or any chunk file returns zero
 * matches). So none of this ever executed live either; it was dead
 * weight in the export. What's recreated here, using the CSS classes/attributes
 * the exported stylesheet already expects:
 *
 *   1. Hamburger drawer open/close (the "Mobile menu" / tablet nav drawer).
 *   2. The "entrance" reveal for elements carrying data-anim-extended /
 *      data-anim-desktop -- without this, headings and paragraphs across every
 *      page stay permanently invisible (visibility:hidden, no !important
 *      override, in the exported stylesheet), not just "unanimated".
 *   3. The FAQ accordion (data-auto="runtime-accordion-widget" on faq-s/): it's
 *      a server-side-rendered React widget whose client-side hydration never
 *      runs (same root cause as #1/#2). Without JS every answer panel sits in
 *      normal flow directly under its question with no collapse applied, and
 *      the next question's opaque background simply paints over it -- so
 *      answers are present in the DOM but invisible and inaccessible.
 *
 * Sticky header needed no JS: `.hasStickyHeader .dmHeaderContainer{position:
 * fixed!important}` in Style/site.css already does it with plain CSS.
 */
(function () {
    'use strict';

    function initHamburgerDrawer(hamburgerId, drawerId, overlayId) {
        var hamburger = document.getElementById(hamburgerId);
        var drawer = document.getElementById(drawerId);
        var overlay = document.getElementById(overlayId);
        var container = document.getElementById('dm-outer-wrapper');
        if (!hamburger || !drawer || !overlay || !container) {
            return;
        }

        // Enables the transform transition defined for .layout-drawer.layout-drawer_animate
        // in Style/site.css (the base .layout-drawer rule ships with transition:none).
        drawer.classList.add('layout-drawer_animate');

        function isOpen() {
            return drawer.hasAttribute('open');
        }

        function openDrawer() {
            drawer.setAttribute('open', '');
            container.classList.add('layout-drawer_open');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.removeAttribute('open');
            container.classList.remove('layout-drawer_open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }

        hamburger.addEventListener('click', function () {
            if (isOpen()) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        overlay.addEventListener('click', closeDrawer);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) {
                closeDrawer();
            }
        });

        // Same-page anchor links inside the drawer (e.g. submenu items linking to
        // /services-and-prices/#GriefLossCounselling) still navigate; close the
        // drawer first so it doesn't stay open on the destination page's back-forward
        // cache restore. Regular page links don't need this (full navigation), but
        // it's harmless either way.
        drawer.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                closeDrawer();
            }
        });
    }

    function initEntranceAnimations() {
        var targets = document.querySelectorAll('[data-anim-extended], [data-anim-desktop]:not([data-anim-desktop="none"])');
        if (!targets.length) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            // No IntersectionObserver support: just reveal everything rather than
            // leave content permanently hidden.
            targets.forEach(reveal);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    reveal(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

        targets.forEach(function (el) {
            el.style.transition = 'opacity .6s ease-out, transform .6s ease-out';
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            observer.observe(el);
        });
    }

    function reveal(el) {
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.opacity = '1';
        el.style.transform = 'none';
    }

    function initFaqAccordions() {
        var items = document.querySelectorAll('[data-grab="accordion-item-container"]');
        items.forEach(function (item) {
            var titleWrapper = item.querySelector('[data-grab="accordion-item-title-wrapper"]');
            var desc = item.querySelector('[data-grab="accordion-item-desc"]');
            var arrow = item.querySelector('[data-grab="accordion-item-arrow"]');
            // The SSR markup wraps accordion-item-desc in a collapsible container
            // (titleWrapper's next sibling) that ships with height:0 but
            // overflow:visible -- so the answer text overflows past its own 0-height
            // box and gets visually painted over by the next question's opaque
            // background, instead of the layout reserving space for it. Toggle
            // *this* wrapper's height (with overflow:hidden while collapsed) so the
            // flex column actually reflows around the open panel.
            var collapsible = titleWrapper ? titleWrapper.nextElementSibling : null;
            if (!titleWrapper || !desc || !collapsible) {
                return;
            }

            collapsible.style.overflow = 'hidden';
            collapsible.style.height = '0px';
            collapsible.style.transition = 'height .25s ease-out';

            // The exported font-family for this SSR'd widget's answer text is
            // "Jost, \"Jost Fallback\"" with no generic fallback at the end, and
            // (verified: reproduces identically in the untouched original export)
            // that specific Jost weight/style never finishes loading here -- the
            // browser is left with nothing renderable, so the answer text paints
            // invisible even once the panel is expanded. Add a safe generic
            // fallback so the content is always legible.
            var descTextEl = desc.querySelector('[data-grab="accordion-item-desc-text"]') || desc;
            [descTextEl].concat(Array.from(descTextEl.querySelectorAll('*'))).forEach(function (el) {
                el.style.setProperty('font-family', 'Jost, "Jost Fallback", sans-serif', 'important');
            });
            titleWrapper.setAttribute('role', 'button');
            titleWrapper.setAttribute('aria-expanded', 'false');
            if (arrow) {
                arrow.style.transition = 'transform .2s ease-out';
            }

            function toggle() {
                var isOpen = collapsible.style.height !== '0px';
                if (isOpen) {
                    collapsible.style.height = '0px';
                } else {
                    collapsible.style.height = desc.scrollHeight + 'px';
                }
                titleWrapper.setAttribute('aria-expanded', String(!isOpen));
                if (arrow) {
                    arrow.style.transform = isOpen ? 'none' : 'rotate(180deg)';
                }
            }

            titleWrapper.addEventListener('click', toggle);
            titleWrapper.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        });
    }

    function init() {
        // Desktop export's own hamburger (used at tablet width, 768-1024px).
        initHamburgerDrawer('layout-drawer-hamburger', 'hamburger-drawer', 'layout-drawer-overlay');
        // Grafted-in mobile export's hamburger (used below 768px) -- see the
        // "Mobile-specific header/drawer" block in Style/site.css for why this
        // is a second, separate set of elements rather than a shared one.
        initHamburgerDrawer('mobile-layout-drawer-hamburger', 'mobile-hamburger-drawer', 'mobile-layout-drawer-overlay');
        initEntranceAnimations();
        initFaqAccordions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
