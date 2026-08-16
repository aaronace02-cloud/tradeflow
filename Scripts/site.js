/*
 * Standalone site bootstrap.
 *
 * This replaces Duda's per-device desktop.js / mobile.js / tablet.js bootstrap files.
 * It keeps only the pieces that Scripts/runtime.js and the runtime module chunks
 * (Scripts/*.js) actually read at runtime -- confirmed by grepping those files for
 * each identifier below -- so the retained interactive behaviour (sticky header,
 * hamburger drawer, entrance animations, photo gallery, form widget, anchor
 * scrolling, Mapbox map, etc.) keeps working without a Duda account behind it.
 *
 * Removed vs. the original: SiteAlias/HomeUrl and other pointers into Duda's own
 * editor/CDN infrastructure, the Duda "AJAX site navigation" wiring, the personalization
 * tracking cookie script, and anything that only mattered inside Duda's WYSIWYG editor.
 */

window.customWidgetsFunctions = {};
window.customWidgetsStrings = {};
window.collections = {};
window.currentLanguage = "ENGLISH";
window.isSitePreview = false;

// Some runtime chunks check window.editorParent / window.previewParent to detect
// whether they are running inside Duda's WYSIWYG editor iframe. Kept as inert empty
// objects (never true) so those checks no-op instead of throwing on standalone pages.
window.isMultiScreen = false;
window.editorParent = {};
window.previewParent = {};

window.Parameters = window.Parameters || {
    SystemID: 'STANDALONE',
    SiteType: 'STANDALONE',
    IsSiteMultilingual: false,
    InitialPostAlias: '',
    InitialPostPageUuid: '',
    InitialDynamicItem: '',
    DynamicPageInfo: {
        isDynamicPage: false,
        base64JsonRowData: 'null',
    },
    CurrentPageUrl: '',
    AllowAjax: false,
    AfterAjaxCommand: null,
    HomeLinkText: 'Back To Home',
    UseGalleryModule: false,
    RemoveDID: true,
    WidgetStyleID: null,
    IsHeaderFixed: false,
    IsHeaderSkinny: false,
    IsBfs: true,
    StorePageAlias: 'null',
    StorePagesUrls: 'e30=',
    IsNewStore: 'false',
    StorePath: '',
    StoreId: 'null',
    StoreVersion: 0,
    StoreCleanUrl: true,
    StoreDisableScrolling: true,
    IsStoreSuspended: false,
    HasCustomDomain: true,
    SimpleSite: false,
    showCookieNotification: false,
    cookiesNotificationMarkup: 'null',
    translatedPageUrl: '',
    isFastMigrationSite: false,
    sidebarPosition: 'NA',
    currentLanguage: 'en',
    currentLocale: 'en',
    NavItems: '{}',
    errors: {
        general: 'There was an error connecting to the page.<br/> Make sure you are not offline.',
        password: 'Incorrect name/password combination',
        tryAgain: 'Try again'
    },
    mapConsent: {
        message: 'This content is served by a third party, {0}. If enabled, {0} may collect information about your activity.',
        enable: 'Enable'
    },
    NavigationAreaParams: {
        ShowBackToHomeOnInnerPages: true,
        NavbarSize: -1,
        BlockContainerSelector: '.dmBody',
        NavbarSelector: '#dmNav:has(a)',
        SubNavbarSelector: '#subnav_main'
    },
    hasCustomCode: false,
    disableTracking: false,
    isRuntimeServer: true,
    isInEditor: false,
    isInPreview: false,
    hasNativeStore: false,
    defaultLang: 'en',
    isFlexSite: false
};

(function () {
    if (!window.location.search) {
        return;
    }
    const cleanParams = window.location.search.substring(1);
    const queryParams = cleanParams.split('&');

    const expires = 'expires=' + new Date().getTime() + 24 * 60 * 60 * 1000;
    const domain = 'domain=' + window.location.hostname;
    const path = "path=/";

    queryParams.forEach((param) => {
        const [key, value = ''] = param.split('=');
        if (key.startsWith('utm_')) {
            const cookieName = "_dm_rt_" + key.substring(4);
            const cookie = cookieName + "=" + value;
            const joined = [cookie, expires, domain, path].join(";");
            document.cookie = joined;
        }
    });
}());

(function () {
    const cookieName = '_dm_entry_referrer';
    const referrer = document.referrer;
    if (!referrer) {
        return;
    }
    let referrerOrigin;
    try {
        referrerOrigin = new URL(referrer).origin;
    } catch (e) {
        return;
    }
    if (!referrerOrigin || referrerOrigin === 'null' || referrerOrigin === window.location.origin) {
        return;
    }
    try {
        const existing = document.cookie
            .split('; ')
            .find((candidate) => candidate.indexOf(cookieName + '=') === 0);
        if (existing && decodeURIComponent(existing.slice(cookieName.length + 1))) {
            return;
        }
        const secure = window.location.protocol === 'https:' ? ';Secure' : '';
        document.cookie = cookieName + '=' + encodeURIComponent(referrerOrigin)
            + ';path=/;SameSite=Lax' + secure;
    } catch (e) {
        return;
    }
}());

if (!window.requestIdleCallback) {
    window.requestIdleCallback = function (fn) {
        setTimeout(fn, 0);
    };
}

/* usage: window.getDeferred(<name>).resolve() or window.getDeferred(<name>).promise.then(...) */
function Def() {
    this.promise = new Promise((function (a, b) {
        this.resolve = a, this.reject = b;
    }).bind(this));
}

const defs = {};
window.getDeferred = function (a) {
    return null == defs[a] && (defs[a] = new Def), defs[a];
};
window.waitForDeferred = function (b, a, c) {
    let d = window?.getDeferred?.(b);
    d
        ? d.promise.then(a)
        : c && ["complete", "interactive"].includes(document.readyState)
            ? setTimeout(a, 1)
            : c
                ? document.addEventListener("DOMContentLoaded", a)
                : console.error(`Deferred  does not exist`);
};

if (!window.dmAPI) {
    window.dmAPI = {
        registerExternalRuntimeComponent: function () {
        },
        getCurrentDeviceType: function () {
            return window.matchMedia('(max-width:767px)').matches
                ? 'mobile'
                : (window.matchMedia('(max-width:1024px)').matches ? 'tablet' : 'desktop');
        },
        runOnReady: (ns, fn) => {
            const safeFn = dmAPI.toSafeFn(fn);
            ns = ns || 'global_' + Math.random().toString(36).slice(2, 11);
            const eventName = 'afterAjax.' + ns;

            if (document.readyState === 'complete') {
                $.DM.events.off(eventName).on(eventName, safeFn);
                setTimeout(function () {
                    safeFn({
                        isAjax: false,
                    });
                }, 0);
            } else {
                window?.waitForDeferred?.('dmAjax', () => {
                    $.DM.events.off(eventName).on(eventName, safeFn);
                    safeFn({
                        isAjax: false,
                    });
                });
            }
        },
        toSafeFn: (fn) => {
            if (fn?.safe) {
                return fn;
            }
            const safeFn = function (...args) {
                try {
                    return fn?.apply(null, args);
                } catch (e) {
                    console.log('function failed ' + e.message);
                }
            };
            safeFn.safe = true;
            return safeFn;
        }
    };
}

// There is no Duda AJAX page-navigation system on this standalone site, so nothing
// would ever resolve the 'dmAjax' deferred that dmAPI.runOnReady()'s slow path waits
// on (Duda's runtime used it to mean "initial page content is in the DOM"). Resolve
// it ourselves once the DOM is parsed so widget init callbacks queued behind
// runOnReady()/waitForDeferred('dmAjax', ...) still fire on a plain page load.
(function () {
    function resolveDmAjax() {
        window.getDeferred('dmAjax').resolve();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolveDmAjax);
    } else {
        resolveDmAjax();
    }
}());

window.SystemID = 'STANDALONE';
