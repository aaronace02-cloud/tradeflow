/*
 * Standalone contact form: client-side validation only. There is intentionally
 * NO submission endpoint wired up here -- the original Duda form posted to
 * Duda's own backend (action="/_dm/s/rt/widgets/dmform.submit.jsp", plus
 * encrypted dmformsendto/dmformsubmitparams hidden fields tied to the Duda
 * account), which no longer exists for a standalone site and has been removed.
 *
 * Fields, exactly as in the original Duda form (see contact/index.html):
 *   - fullName        (text,  required)
 *   - email           (email, required)
 *   - phone           (tel,   required)
 *   - message         (textarea, optional -- matches the original: it was
 *                       never marked required in the Duda export)
 *   - appointmentType (select, optional) one of: "Grief and Loss",
 *       "Personal Growth", "Breathwork Coaching", "Walk & Talk",
 *       "Client Summary Report", "Free 15 minute consult"
 *
 * To connect a real backend later: replace the TODO block below with a
 * fetch() POST (or a form action) to whatever endpoint/service is chosen,
 * then show #1988210224 (.dmform-success) on success or #1212819979
 * (.dmform-error) on failure -- both already exist in the markup, matching
 * the original Duda success/error UI.
 */
(function () {
    'use strict';

    function initContactForm() {
        var form = document.getElementById('contact-form');
        if (!form) {
            return;
        }

        var successEl = document.getElementById('1988210224');
        var errorEl = document.getElementById('1212819979');

        function setFieldError(field, message) {
            field.setAttribute('aria-invalid', message ? 'true' : 'false');
            var errId = field.id + '-error';
            var errEl = document.getElementById(errId);
            if (message) {
                if (!errEl) {
                    errEl = document.createElement('div');
                    errEl.id = errId;
                    errEl.className = 'contact-field-error';
                    errEl.style.color = '#c0392b';
                    errEl.style.fontSize = '13px';
                    errEl.style.marginTop = '4px';
                    field.insertAdjacentElement('afterend', errEl);
                }
                errEl.textContent = message;
                field.setAttribute('aria-describedby', errId);
            } else if (errEl) {
                errEl.remove();
                field.removeAttribute('aria-describedby');
            }
        }

        function validate() {
            var valid = true;
            var fullName = document.getElementById('contact-full-name');
            var email = document.getElementById('contact-email');
            var phone = document.getElementById('contact-phone');

            if (!fullName.value.trim()) {
                setFieldError(fullName, 'Please enter your full name.');
                valid = false;
            } else {
                setFieldError(fullName, null);
            }

            if (!email.value.trim()) {
                setFieldError(email, 'Please enter your email address.');
                valid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                setFieldError(email, 'Please enter a valid email address.');
                valid = false;
            } else {
                setFieldError(email, null);
            }

            if (!phone.value.trim()) {
                setFieldError(phone, 'Please enter your phone number.');
                valid = false;
            } else {
                setFieldError(phone, null);
            }

            return valid;
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (successEl) successEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';

            if (!validate()) {
                return;
            }

            // TODO(backend): send the FormData somewhere once a backend/service is
            // chosen, e.g.:
            //   fetch('/api/contact', { method: 'POST', body: new FormData(form) })
            //     .then(function (res) { if (!res.ok) throw new Error('bad response'); })
            //     .then(function () { successEl.style.display = ''; form.reset(); })
            //     .catch(function () { errorEl.style.display = ''; });
            //
            // No backend exists yet, so there is nothing to actually submit to.
            // Logging the validated payload keeps the form testable during
            // development without pretending a submission succeeded.
            console.log('[contact-form] validated, ready for backend:', Object.fromEntries(new FormData(form)));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContactForm);
    } else {
        initContactForm();
    }
}());
