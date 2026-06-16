(function() {
    let siteKeyPromise = null;

    function cargarClaveSitio() {
        if (!siteKeyPromise) {
            siteKeyPromise = fetch('/api/recaptcha/site-key', {
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.siteKey) {
                        throw new Error('El servidor no entrego RECAPTCHA_SITE_KEY');
                    }
                    return data.siteKey;
                })
                .catch(error => {
                    console.error('No se pudo cargar la clave publica de reCAPTCHA:', error);
                    return '';
                });
        }

        return siteKeyPromise;
    }

    async function renderizarRecaptcha() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderizarRecaptcha, { once: true });
            return;
        }

        if (typeof grecaptcha === 'undefined' || typeof grecaptcha.render !== 'function') {
            return;
        }

        const siteKey = await cargarClaveSitio();
        if (!siteKey) return;

        document.querySelectorAll('.g-recaptcha').forEach(elemento => {
            if (elemento.dataset.widgetId) return;

            const widgetId = grecaptcha.render(elemento, {
                sitekey: siteKey
            });

            elemento.dataset.widgetId = String(widgetId);
        });
    }

    window.renderRecaptcha = renderizarRecaptcha;
    window.recaptchaHelper = {
        getToken() {
            const widget = document.querySelector('.g-recaptcha[data-widget-id]');
            if (!widget || typeof grecaptcha === 'undefined') return '';

            const token = grecaptcha.getResponse(Number(widget.dataset.widgetId));
            return typeof token === 'string' ? token.trim() : '';
        },
        reset() {
            document.querySelectorAll('.g-recaptcha[data-widget-id]').forEach(widget => {
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset(Number(widget.dataset.widgetId));
                }
            });
        }
    };

    cargarClaveSitio();
})();
