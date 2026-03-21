/**
 * ProBuilder PWA - Centralized Logic
 * Handles Service Worker registration, Update notifications, and Install prompts.
 */

(function() {
    let newWorker;
    
    // 1. REGISTER SERVICE WORKER
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Using relative path 'sw.js' ensures it works in subdirectories like /Calc/
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registered:', reg.scope);
                    
                    // Check for updates
                    reg.addEventListener('updatefound', () => {
                        newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content is available, show the update toast
                                showUpdateToast();
                            }
                        });
                    });
                })
                .catch(err => console.error('[PWA] Service Worker registration failed:', err));
        });

        // Handle the refreshing after a service worker update
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }

    // 2. INJECT UI COMPONENTS (Banner & Toast)
    function injectUI() {
        // Only inject if not already present
        if (document.getElementById('pwa-install-banner')) return;

        const bannerHtml = `
            <div id="pwa-install-banner" style="display: none; position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: white; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 16px rgba(0,0,0,0.1); z-index: 1000; align-items: center; justify-content: space-between; gap: 12px; font-family: 'Segoe UI', system-ui, sans-serif;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px; line-height: 1;">🔨</span>
                    <span id="pwa-banner-text" style="font-size: 14px; font-weight: 500; color: #1a202c;">Legg til ProBuilder på hjemmeskjermen</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="pwa-install-btn" style="background: #2b6cb0; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">Legg til</button>
                    <button id="pwa-dismiss-btn" style="background: transparent; color: #718096; border: none; font-size: 24px; line-height: 1; padding: 4px 8px; cursor: pointer;">&times;</button>
                </div>
            </div>
        `;

        const toastHtml = `
            <div id="pwa-update-toast" style="display: none; position: fixed; top: 64px; right: 16px; padding: 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; align-items: center; gap: 16px; font-family: 'Segoe UI', system-ui, sans-serif;">
                <span id="pwa-update-text" style="font-size: 14px; font-weight: 600; color: #1a202c;">🔄 Ny versjon tilgjengelig!</span>
                <button id="pwa-update-btn" style="background: #dd6b20; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;">Oppdater</button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', bannerHtml + toastHtml);
        
        // Internationalization for the banner
        const currentLang = localStorage.getItem('pb_lang') || 'no';
        const labels = {
            no: { banner: 'Legg til ProBuilder på hjemmeskjermen', btn: 'Legg til', update: '🔄 Ny versjon tilgjengelig!', updateBtn: 'Oppdater' },
            en: { banner: 'Add ProBuilder to your home screen', btn: 'Add', update: '🔄 New version available!', updateBtn: 'Update' },
            lt: { banner: 'Pridėti ProBuilder į pagrindinį ekraną', btn: 'Pridėti', update: '🔄 Pasirodė nauja versija!', updateBtn: 'Atnaujinti' },
            pl: { banner: 'Dodaj ProBuilder do ekranu głównego', btn: 'Dodaj', update: '🔄 Dostępna nowa wersja!', updateBtn: 'Aktualizuj' }
        };
        
        const l = labels[currentLang] || labels.no;
        document.getElementById('pwa-banner-text').textContent = l.banner;
        document.getElementById('pwa-install-btn').textContent = l.btn;
        document.getElementById('pwa-update-text').textContent = l.update;
        document.getElementById('pwa-update-btn').textContent = l.updateBtn;

        // Setup Event Listeners
        document.getElementById('pwa-install-btn').addEventListener('click', handleInstallClick);
        document.getElementById('pwa-dismiss-btn').addEventListener('click', dismissInstallBanner);
        document.getElementById('pwa-update-btn').addEventListener('click', skipWaitingAndRefresh);
    }

    // 3. INSTALL PROMPT LOGIC
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // Show our custom banner if not dismissed
        if (localStorage.getItem('pb_install_dismissed') !== '1') {
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.style.display = 'flex';
        }
    });

    async function handleInstallClick() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`[PWA] User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
    }

    function dismissInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        localStorage.setItem('pb_install_dismissed', '1');
    }

    // 4. UPDATE LOGIC
    function showUpdateToast() {
        const toast = document.getElementById('pwa-update-toast');
        if (toast) toast.style.display = 'flex';
    }

    function skipWaitingAndRefresh() {
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
        const toast = document.getElementById('pwa-update-toast');
        if (toast) toast.style.display = 'none';
    }

    // Initialize UI on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI);
    } else {
        injectUI();
    }
})();
