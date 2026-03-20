/* ============================================
   Pierce's Website — Authentication
   js/auth.js

   Handles:
   - SHA-256 password hashing (crypto.subtle + JS fallback)
   - Session-based auth state (sessionStorage)
   - Password gate form on index.html
   - requireAuth() for sub-pages
   ============================================ */

// The SHA-256 hash of the family password
// To change: https://emn178.github.io/online-tools/sha256.html
const PASSWORD_HASH = '9b04069beb4cfe5dec5927b9b35ce32707b7dfe1ba356cebd79fec4b14c97157';


/**
 * Hash a string using SHA-256 → returns hex string.
 * Uses crypto.subtle when available (HTTPS/localhost),
 * falls back to a pure JS implementation for file:// protocol.
 */
async function hashPassword(password) {
    // Try native crypto.subtle first (requires secure context)
    if (window.crypto && window.crypto.subtle) {
        try {
            var encoder = new TextEncoder();
            var data = encoder.encode(password);
            var hashBuffer = await crypto.subtle.digest('SHA-256', data);
            var hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        } catch (e) {
            // crypto.subtle failed (likely file:// protocol) — fall through
        }
    }

    // Fallback: pure JS SHA-256
    function sha256(str) {
        function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
        var k = [
            0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
            0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
            0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
            0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
            0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
            0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
            0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
            0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
        ];
        var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,
            h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
        var bytes = new TextEncoder().encode(str);
        var bitLen = bytes.length * 8;
        var padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
        padded.set(bytes);
        padded[bytes.length] = 0x80;
        var view = new DataView(padded.buffer);
        view.setUint32(padded.length - 4, bitLen, false);
        for (var offset = 0; offset < padded.length; offset += 64) {
            var w = new Uint32Array(64);
            for (var i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
            for (var i = 16; i < 64; i++) {
                var s0 = rightRotate(w[i-15],7) ^ rightRotate(w[i-15],18) ^ (w[i-15]>>>3);
                var s1 = rightRotate(w[i-2],17) ^ rightRotate(w[i-2],19) ^ (w[i-2]>>>10);
                w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
            }
            var a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
            for (var i = 0; i < 64; i++) {
                var S1 = rightRotate(e,6) ^ rightRotate(e,11) ^ rightRotate(e,25);
                var ch = (e & f) ^ (~e & g);
                var t1 = (h + S1 + ch + k[i] + w[i]) | 0;
                var S0 = rightRotate(a,2) ^ rightRotate(a,13) ^ rightRotate(a,22);
                var maj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (S0 + maj) | 0;
                h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
            }
            h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0;
            h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
        }
        return [h0,h1,h2,h3,h4,h5,h6,h7].map(function(v) { return (v>>>0).toString(16).padStart(8,'0'); }).join('');
    }
    return sha256(password);
}


/**
 * Check if user is already authenticated.
 */
function isAuthenticated() {
    return sessionStorage.getItem('pierce_authenticated') === 'true';
}


/**
 * Initialize the password gate form on index.html.
 * Call this after DOM is ready on the password page.
 */
function initPasswordGate() {
    var gateForm = document.getElementById('gate-form');
    var gatePassword = document.getElementById('gate-password');
    var gateError = document.getElementById('gate-error');
    var togglePw = document.getElementById('toggle-pw');
    var eyeOpen = document.getElementById('eye-open');
    var eyeClosed = document.getElementById('eye-closed');

    // Already authenticated — skip straight to home
    if (isAuthenticated()) {
        window.location.href = '/pages/home.html';
        return;
    }

    // Handle form submission
    if (gateForm) {
        gateForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            var password = gatePassword.value.trim();
            if (!password) return;

            try {
                var hash = await hashPassword(password);

                if (hash === PASSWORD_HASH) {
                    // Correct — save auth and redirect
                    sessionStorage.setItem('pierce_authenticated', 'true');

                    // Fade out the gate card
                    var card = document.querySelector('.gate-card');
                    if (card) {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(-10px) scale(0.98)';
                        card.style.transition = 'all 0.4s ease-out';
                    }

                    setTimeout(function() {
                        window.location.href = '/pages/home.html';
                    }, 400);
                } else {
                    // Wrong password
                    gateError.textContent = "That's not quite right — try again!";
                    gateError.classList.remove('shake');
                    void gateError.offsetWidth; // reflow to restart animation
                    gateError.classList.add('shake');
                    gatePassword.value = '';
                    gatePassword.focus();
                }
            } catch (err) {
                gateError.textContent = "Something went wrong — please try again.";
            }
        });
    }

    // Toggle password visibility
    if (togglePw) {
        togglePw.addEventListener('click', function() {
            var isPassword = gatePassword.type === 'password';
            gatePassword.type = isPassword ? 'text' : 'password';
            eyeOpen.style.display = isPassword ? 'none' : 'block';
            eyeClosed.style.display = isPassword ? 'block' : 'none';
        });
    }

    // Clear error on typing
    if (gatePassword) {
        gatePassword.addEventListener('input', function() {
            if (gateError) gateError.textContent = '';
        });
    }
}


/**
 * Auth check for sub-pages (home.html, timeline.html, etc.).
 * Redirects to the login page if not authenticated.
 * Call at the top of any page inside /pages/.
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}
