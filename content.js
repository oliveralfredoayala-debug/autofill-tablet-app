(function () {
    // --- LISTENERS ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'FILL_1LOOK' || request.action === 'FILL_FORM') {
            fill1LookForm(request.user, request.sendWelcome)
                .then(() => sendResponse({ status: 'done' }))
                .catch(err => sendResponse({ status: 'error', message: err.message }));
            return true; // async response
        } else if (request.action === 'FILL_ESTIMATOR') {
            fillEstimatorForm(request.user)
                .then(() => sendResponse({ status: 'done' }))
                .catch(err => sendResponse({ status: 'error', message: err.message }));
            return true; // async response
        }
    });

    // --- 1LOOK FORM LOGIC ---
    async function fill1LookForm(u, sendWelcome = true) {
        console.log("Filling 1Look form for:", u);

        await findAndFillInput(["first name", "firstname", "first", "given name"], u.firstName);
        await findAndFillInput(["last name", "lastname", "last", "family name"], u.lastName);
        await findAndFillInput(["email", "e-mail", "mail", "correo"], u.email, true);
        await findAndFillInput(["mobile phone", "phone number", "phone", "mobile", "cell", "teléfono", "celular", "tel"], u.phone);

        const targetRole = u.role1Look || u.role;
        if (targetRole) await fill1LookRole(targetRole);
        if (u.managerEmail && u.managerEmail !== "N/A") await fillManager(u.managerEmail);

        if (typeof sendWelcome !== 'undefined') await toggleWelcomeEmail(sendWelcome);
    }

    // --- ESTIMATOR (ONE CLICK CONTRACTOR) FORM LOGIC ---
    async function fillEstimatorForm(u) {
        console.log("Filling Estimator form for:", u);

        await findAndFillInput(["first name", "firstname", "first"], u.firstName);
        await findAndFillInput(["last name", "lastname", "last"], u.lastName);
        await findAndFillInput(["email", "e-mail", "mail"], u.email, true);
        await findAndFillInput(["phone number", "phone", "mobile", "cell"], u.phone);

        const targetRole = u.estimatorRole || u.role || "Salesrep";
        await fillEstimatorRole(targetRole);
    }

    // --- UNIVERSAL INPUT FINDER & FILLER ---
    async function findAndFillInput(keywords, val, isEmail = false) {
        if (!val) return false;
        if (!Array.isArray(keywords)) keywords = [keywords];
        console.log("Searching for input matching keywords:", keywords, "val:", val);

        const allInputs = Array.from(document.querySelectorAll('input'));
        if (allInputs.length === 0) return false;

        let inputs = allInputs.filter(e => e.type !== 'hidden' && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
        if (inputs.length === 0) inputs = allInputs;

        let input = null;

        if (isEmail) {
            input = inputs.find(e => 
                e.type === "email" || 
                (e.name || "").toLowerCase().includes("email") || 
                (e.placeholder || "").toLowerCase().includes("email") ||
                (e.id || "").toLowerCase().includes("email")
            );
        }

        const isPhone = keywords.some(k => k.includes("phone") || k.includes("mobile") || k.includes("cell") || k.includes("tel"));
        if (!input && isPhone) {
            input = inputs.find(e => 
                e.type === "tel" || 
                (e.name || "").toLowerCase().includes("phone") || (e.name || "").toLowerCase().includes("mobile") ||
                (e.placeholder || "").toLowerCase().includes("phone") || (e.placeholder || "").toLowerCase().includes("mobile") ||
                (e.id || "").toLowerCase().includes("phone") || (e.id || "").toLowerCase().includes("mobile") ||
                (e.getAttribute('aria-label') || "").toLowerCase().includes("phone") || (e.getAttribute('aria-label') || "").toLowerCase().includes("mobile")
            );
        }

        if (!input) {
            input = inputs.find(e => {
                const ph = (e.placeholder || "").toLowerCase();
                const name = (e.name || "").toLowerCase();
                const id = (e.id || "").toLowerCase();
                const aria = (e.getAttribute('aria-label') || "").toLowerCase();
                return keywords.some(k => ph.includes(k) || name.includes(k) || id.includes(k) || aria.includes(k));
            });
        }

        if (!input) {
            const labels = Array.from(document.querySelectorAll('label, div, span, p, th, td')).filter(e => {
                const txt = (e.innerText || "").trim().toLowerCase();
                return keywords.some(k => txt === k || txt.startsWith(k) || txt.includes(k)) && e.children.length === 0;
            });

            for (const label of labels) {
                if (label.htmlFor) {
                    input = document.getElementById(label.htmlFor);
                    if (input) break;
                }
                if (label.getAttribute('for')) {
                    input = document.getElementById(label.getAttribute('for'));
                    if (input) break;
                }

                const insideInput = label.querySelector('input:not([type="hidden"])');
                if (insideInput) { input = insideInput; break; }

                const parent = label.closest('div, section, td, tr, form, fieldset, .form-group, .field');
                if (parent) {
                    input = parent.querySelector('input:not([type="hidden"])');
                    if (input) break;
                }

                if (label.nextElementSibling) {
                    input = label.nextElementSibling.tagName === 'INPUT' ? label.nextElementSibling : label.nextElementSibling.querySelector('input:not([type="hidden"])');
                    if (input) break;
                }
            }
        }

        if (!input && isPhone) {
            input = inputs.find(e => (e.placeholder || "").includes('_') || (e.value || "").includes('_')) || inputs[3];
        }

        if (input) {
            console.log("Found input element for keywords", keywords, ":", input);
            input.focus();
            input.click();

            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
                nativeSetter.call(input, val);
            } else {
                input.value = val;
            }

            ['focus', 'keydown', 'keypress', 'input', 'change', 'keyup', 'blur'].forEach(evt => 
                input.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }))
            );

            const digitsOnly = val.replace(/\D/g, '');
            if ((!input.value || input.value.trim() === "") && digitsOnly) {
                await sleep(50);
                if (nativeSetter) nativeSetter.call(input, digitsOnly);
                else input.value = digitsOnly;
                ['input', 'change', 'blur'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
            }

            await sleep(100);
            return true;
        } else {
            console.warn("Input not found for keywords:", keywords);
            return false;
        }
    }

    async function fillAdminUnit(val) {
        let el = Array.from(document.querySelectorAll('input')).find(e => e.placeholder?.toLowerCase().includes("administrative"));
        if (!el) {
            const lab = Array.from(document.querySelectorAll('label')).find(l => l.innerText.toLowerCase().includes("administrative"));
            if (lab?.htmlFor) el = document.getElementById(lab.htmlFor);
        }
        if (el) {
            el.click(); await sleep(200);
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(800);
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await sleep(150);
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
    }

    async function fill1LookRole(targetRole) {
        if (!targetRole) return;
        const label = Array.from(document.querySelectorAll('label, span, div')).find(el => ["Role", "Role *"].includes(el.innerText.trim()));
        if (label) {
            let trigger = label.nextElementSibling || label.querySelector('[role="combobox"]') || label.parentElement.querySelector('kendo-dropdownlist') || label.parentElement.querySelector('.ng-select-container');

            if (!trigger) trigger = Array.from(document.querySelectorAll('kendo-dropdownlist, .ng-select-container')).find(e => e.offsetParent);

            if (trigger) {
                console.log("Clicking role trigger:", trigger);
                trigger.click();
                await sleep(500);

                let opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item'));

                if (opts.length === 0) {
                    label.click();
                    await sleep(300);
                    opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item'));
                }

                const match = opts.find(o => o.innerText.trim().toLowerCase() === targetRole.toLowerCase())
                    || opts.find(o => o.innerText.toLowerCase().includes(targetRole.toLowerCase()));

                if (match) {
                    console.log("Found role match:", match);
                    match.scrollIntoView({ block: 'center' });
                    ['mousedown', 'mouseup', 'click'].forEach(evt => {
                        match.dispatchEvent(new MouseEvent(evt, {
                            bubbles: true, cancelable: true, view: window
                        }));
                    });

                    await sleep(100);
                    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                } else {
                    console.warn(`Role '${targetRole}' not found in dropdown options.`);
                }
            }
        }
    }

    async function fillEstimatorRole(targetRole) {
        if (!targetRole) return;
        let el = Array.from(document.querySelectorAll('input')).find(e => e.placeholder?.toLowerCase().includes("select roles"));
        if (!el) {
            const label = Array.from(document.querySelectorAll('label')).find(l => l.innerText.toLowerCase().trim() === "roles");
            if (label) {
                el = document.getElementById(label.htmlFor) || label.querySelector('input') || label.nextElementSibling?.querySelector('input');
            }
        }
        if (el) {
            el.click(); el.focus();
            el.value = targetRole;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(1500);

            const opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item, .item'));
            const match = opts.find(o => o.innerText.trim().toLowerCase() === targetRole.toLowerCase())
                || opts.find(o => o.innerText.toLowerCase().includes(targetRole.toLowerCase()));

            if (match) {
                match.scrollIntoView({ block: 'center' });
                ['mousedown', 'mouseup', 'click'].forEach(evt => {
                    match.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                });
            }
        }
    }

    async function fillManager(val) {
        if (!val) return;
        console.log("Filling Manager:", val);

        let el = Array.from(document.querySelectorAll('input')).find(e => e.placeholder?.toLowerCase().includes("search managers"));

        if (!el) {
            const label = Array.from(document.querySelectorAll('label')).find(l => l.innerText.toLowerCase().trim() === "manager");
            if (label) {
                el = document.getElementById(label.htmlFor) || label.querySelector('input') || label.nextElementSibling?.querySelector('input');
            }
        }

        if (el) {
            el.click();
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(1500);

            const opts = Array.from(document.querySelectorAll('li, div[role="option"], span.ng-option-label, .k-item'));
            const match = opts.find(o => o.innerText.trim().toLowerCase() === val.toLowerCase())
                || opts.find(o => o.innerText.toLowerCase().includes(val.toLowerCase()));

            if (match) {
                console.log("Found manager match:", match);
                match.scrollIntoView({ block: 'center' });
                ['mousedown', 'mouseup', 'click'].forEach(evt => {
                    match.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                });
            }
        }
    }

    async function toggleWelcomeEmail(shouldSend) {
        const label = Array.from(document.querySelectorAll('label, span, div')).find(el => el.innerText.toLowerCase().includes("send welcome email"));
        if (!label) return;

        let input = label.querySelector('input[type="checkbox"]') || document.getElementById(label.htmlFor);
        if (!input && label.previousElementSibling && label.previousElementSibling.type === 'checkbox') input = label.previousElementSibling;

        if (input) {
            if (input.checked !== shouldSend) {
                input.click();
                await sleep(200);
            }
        }
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
})();
