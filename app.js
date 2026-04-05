// ============================================================
// ParcelGo - Frontend JS (XAMPP / PHP version)
// All API calls go to /delivery app/api/*.php
// ============================================================

// Auto-detect base path (works inside XAMPP htdocs)
const FOLDER = window.location.pathname.split('/').slice(0, -1).join('/');
const API    = FOLDER + '/api';

// ── AUTH STATE ───────────────────────────────────────────
const Auth = {
  token: localStorage.getItem('pg_token'),
  user:  JSON.parse(localStorage.getItem('pg_user') || 'null'),
  save(token, user) {
    this.token = token; this.user = user;
    localStorage.setItem('pg_token', token);
    localStorage.setItem('pg_user', JSON.stringify(user));
  },
  clear() {
    this.token = null; this.user = null;
    localStorage.removeItem('pg_token');
    localStorage.removeItem('pg_user');
  },
  isLoggedIn() { return !!this.token; }
};

// ── HTTP HELPER ──────────────────────────────────────────
async function http(method, endpoint, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.token) headers['Authorization'] = 'Bearer ' + Auth.token;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  let url = API + '/' + endpoint;
  if (method === 'GET' && body) {
    url += '?' + new URLSearchParams(body).toString();
    delete options.body;
  }

  const res  = await fetch(url, options);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data;
}

// ── PAGE NAVIGATION ──────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll(`[data-page="${id}"]`).forEach(l => l.classList.add('active'));
  window.scrollTo(0, 0);
}

// ── TOAST ────────────────────────────────────────────────
function toast(msg, icon = '✅') {
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── MODAL ────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ── ALERT HELPERS ────────────────────────────────────────
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${type} show`;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'alert';
}

// ── AUTH MODAL ───────────────────────────────────────────
let otpMobile = '', otpPurpose = 'login';

function showAuthModal(purpose = 'login') {
  otpPurpose = purpose;
  document.getElementById('auth-step-1').style.display = 'block';
  document.getElementById('auth-step-2').style.display = 'none';
  document.getElementById('auth-name-group').style.display = purpose === 'register' ? 'block' : 'none';
  document.getElementById('auth-modal-title').textContent = purpose === 'register' ? '👋 Create Account' : '🔐 Login';
  document.getElementById('auth-modal-sub').textContent   =
    purpose === 'register' ? 'Enter your details to get started' : 'Enter your mobile number to continue';
  clearAlert('auth-alert');
  openModal('auth-modal');
}

async function sendOTP() {
  const mobile = document.getElementById('auth-mobile').value.trim();
  const name   = document.getElementById('auth-name').value.trim();
  clearAlert('auth-alert');

  if (!/^\+?[0-9]{10,15}$/.test(mobile))
    return showAlert('auth-alert', 'Enter a valid mobile number (10-15 digits)');

  const btn = document.getElementById('btn-send-otp');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Sending OTP...';

  try {
    otpMobile = mobile;
    await http('POST', 'send_otp.php', { mobile, name, purpose: otpPurpose });
    document.getElementById('auth-step-1').style.display = 'none';
    document.getElementById('auth-step-2').style.display = 'block';
    document.getElementById('otp-mobile-display').textContent = mobile;
    document.querySelectorAll('.otp-input')[0]?.focus();
    toast('OTP sent! Check otp_log.txt in your project folder 📄', '📱');
  } catch (err) {
    showAlert('auth-alert', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Send OTP →';
  }
}

async function verifyOTP() {
  const otp = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
  clearAlert('auth-alert');

  if (otp.length !== 6) return showAlert('auth-alert', 'Enter all 6 digits of the OTP');

  const btn = document.getElementById('btn-verify-otp');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Verifying...';

  try {
    const data = await http('POST', 'verify_otp.php', { mobile: otpMobile, otp, purpose: otpPurpose });
    Auth.save(data.token, data.user);
    closeModal('auth-modal');
    updateNav();
    toast(`Welcome, ${data.user.name}! 🎉`);
  } catch (err) {
    showAlert('auth-alert', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Verify & Login';
  }
}

function logout() {
  Auth.clear();
  updateNav();
  showPage('home');
  toast('Logged out. See you soon! 👋', '👋');
}

function updateNav() {
  const loggedIn = Auth.isLoggedIn();
  document.getElementById('nav-login-btn').style.display  = loggedIn ? 'none' : 'inline-block';
  document.getElementById('nav-logout-btn').style.display = loggedIn ? 'inline-block' : 'none';
  document.getElementById('nav-user-name').textContent    = loggedIn ? `Hi, ${Auth.user.name} 👋` : '';
}

// ── OTP INPUT — auto jump between boxes ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.otp-input').forEach((input, i, all) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && i < all.length - 1) all[i + 1].focus();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && i > 0) all[i - 1].focus();
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      [...pasted].forEach((ch, j) => { if (all[j]) all[j].value = ch; });
      if (all[pasted.length - 1]) all[pasted.length - 1].focus();
    });
  });

  updateNav();
  showPage('home');
  setTimeout(animateCounters, 400);
});

// ── VEHICLE AUTO-SELECT ──────────────────────────────────
const V_EMOJI = { bike:'🛵', car:'🚗', van:'🚐', truck:'🚛' };

function autoSelectVehicle() {
  const w = parseFloat(document.getElementById('weight')?.value) || 0;
  const s = document.getElementById('size')?.value || '';

  let rec = 'bike';
  if (s === 'bulk' || w > 200) rec = 'truck';
  else if (s === 'large' || w > 25) rec = 'van';
  else if (s === 'medium' || w > 5) rec = 'car';

  document.querySelectorAll('.vehicle-btn').forEach(b => {
    b.classList.remove('selected', 'recommended');
    if (b.dataset.v === rec) b.classList.add('recommended');
  });

  const badge = document.getElementById('rec-badge');
  if (badge) badge.style.display = 'inline-block';
  updatePriceBox(w, rec);
}

function selectVehicle(btn, type) {
  document.querySelectorAll('.vehicle-btn').forEach(b => b.classList.remove('selected', 'recommended'));
  btn.classList.add('selected');
}

function updatePriceBox(w, v) {
  const base  = { bike:30, car:60, van:120, truck:250 };
  const perkg = { bike:5,  car:8,  van:12,  truck:20  };
  const cost  = Math.round((base[v] || 60) + (w * (perkg[v] || 8)));
  const old   = Math.round(cost * 2.5);
  const el    = document.getElementById('price-estimate');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="cost-row">
      <span class="cost-label">Traditional Courier</span>
      <span class="cost-value old">₹${old}</span>
    </div>
    <div class="cost-row">
      <span class="cost-label">ParcelGo Price</span>
      <span class="cost-value new">₹${cost}</span>
    </div>
    <div class="eco-save">🌿 You save ₹${old - cost} · Eco-friendly delivery</div>`;
}

// ── SEND PARCEL ──────────────────────────────────────────
async function submitParcel(e) {
  e.preventDefault();
  if (!Auth.isLoggedIn()) { showAuthModal('login'); return; }

  const pickup = document.getElementById('pickup').value.trim();
  const drop   = document.getElementById('drop').value.trim();
  const weight = document.getElementById('weight').value;
  const size   = document.getElementById('size').value;
  const ptype  = document.getElementById('ptype').value;
  const desc   = document.getElementById('description')?.value || '';

  clearAlert('parcel-alert');
  if (!pickup || !drop || !weight || !size)
    return showAlert('parcel-alert', 'Please fill Pickup, Drop, Weight and Size fields.');

  const btn = document.getElementById('btn-send-parcel');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Booking...';

  try {
    const data = await http('POST', 'create_parcel.php',
      { pickup_address: pickup, drop_address: drop, weight, size, parcel_type: ptype, description: desc },
      true
    );
    showAlert('parcel-alert',
      `✅ Parcel booked! Tracking ID: ${data.parcel.tracking_id} | Delivery OTP: ${data.parcel.delivery_otp}`,
      'success'
    );
    toast(`Booked: ${data.parcel.tracking_id}`, '📦');
    setTimeout(() => {
      document.getElementById('track-input').value = data.parcel.tracking_id;
      showPage('track');
      trackParcel();
    }, 2500);
  } catch (err) {
    showAlert('parcel-alert', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Find Travelers on This Route';
  }
}

// ── POST TRIP ────────────────────────────────────────────
async function submitTrip(e) {
  e.preventDefault();
  if (!Auth.isLoggedIn()) { showAuthModal('login'); return; }

  const body = {
    from_address:       document.getElementById('trip-from').value.trim(),
    to_address:         document.getElementById('trip-to').value.trim(),
    vehicle_type:       document.getElementById('trip-vehicle').value,
    vehicle_number:     document.getElementById('trip-vehicle-no').value.trim(),
    available_capacity: document.getElementById('trip-capacity').value,
    departure_time:     document.getElementById('trip-time').value,
    max_parcels:        document.getElementById('trip-max-parcels').value,
  };

  clearAlert('trip-alert');
  if (!body.from_address || !body.to_address || !body.vehicle_type || !body.departure_time)
    return showAlert('trip-alert', 'Please fill all required fields.');

  const btn = document.getElementById('btn-post-trip');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Posting...';

  try {
    await http('POST', 'post_trip.php', body, true);
    showAlert('trip-alert', '✅ Trip posted! Parcel senders will be matched to your route.', 'success');
    toast('Trip posted! 🚗');
    document.getElementById('trip-form').reset();
  } catch (err) {
    showAlert('trip-alert', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Post My Trip';
  }
}

// ── TRACK PARCEL ─────────────────────────────────────────
async function trackParcel() {
  const tid = document.getElementById('track-input').value.trim().toUpperCase();
  if (!tid) return toast('Enter a tracking ID first', '⚠️');

  const btn = document.getElementById('btn-track');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Tracking...';

  try {
    const data = await http('GET', 'track_parcel.php', { id: tid });
    renderTracking(data.parcel, data.events);
  } catch (err) {
    document.getElementById('tracking-result').innerHTML =
      `<div class="alert error show" style="margin-top:16px">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Track';
  }
}

// ── RENDER TRACKING ──────────────────────────────────────
const STEPS = ['booked','matched','picked_up','in_transit','out_for_delivery','delivered'];
const STEP_LABEL = { booked:'Parcel Booked', matched:'Traveler Matched',
  picked_up:'Picked Up', in_transit:'In Transit',
  out_for_delivery:'Out for Delivery', delivered:'Delivered ✅' };
const STEP_ICON = { booked:'📦', matched:'🤝', picked_up:'✅',
  in_transit:'🚗', out_for_delivery:'🏃', delivered:'🎉' };

function renderTracking(parcel, events) {
  const lastEvent  = events.length ? events[events.length - 1].event_type : 'booked';
  const currentIdx = STEPS.indexOf(lastEvent);

  const stepsHtml = STEPS.map((s, i) => {
    const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
    const ev  = events.find(e => e.event_type === s);
    const time = ev ? new Date(ev.created_at).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}) : '';
    return `<div class="t-step">
      <div class="t-dot ${cls}"></div>
      <div>
        <div class="t-step-title ${cls}">${STEP_ICON[s]} ${STEP_LABEL[s]}</div>
        <div class="t-step-sub">${ev ? `${time} · ${ev.description}` : 'Pending'}</div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('tracking-result').innerHTML = `
    <div class="card" style="margin-top:20px;max-width:600px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:3px">TRACKING ID</div>
          <div style="font-size:20px;font-weight:700;font-family:monospace;letter-spacing:2px">${parcel.tracking_id}</div>
        </div>
        <span style="padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;
          background:var(--primary-pale);color:var(--primary);text-transform:uppercase">
          ${parcel.status.replace(/_/g,' ')}
        </span>
      </div>
      <div class="grid-2" style="margin-bottom:16px;gap:12px">
        <div style="background:var(--bg);border-radius:10px;padding:12px">
          <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:3px">FROM</div>
          <div style="font-size:13px;font-weight:500">${parcel.pickup_address}</div>
        </div>
        <div style="background:var(--bg);border-radius:10px;padding:12px">
          <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:3px">TO</div>
          <div style="font-size:13px;font-weight:500">${parcel.drop_address}</div>
        </div>
      </div>
      <div class="tracking-timeline">${stepsHtml}</div>
      ${parcel.traveler_name ? `
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
          <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:8px">TRAVELER</div>
          <div style="display:flex;align-items:center;gap:10px;background:var(--bg);border-radius:10px;padding:10px">
            <div style="font-size:22px">👨‍💼</div>
            <div>
              <div style="font-weight:700">${parcel.traveler_name}</div>
              <div style="color:var(--accent);font-size:12px">★ ${parcel.traveler_rating}</div>
            </div>
            <div style="margin-left:auto;font-size:10px;color:var(--secondary);font-weight:700">✅ VERIFIED</div>
          </div>
        </div>` : ''}
    </div>`;
}

// ── COUNTER ANIMATION ────────────────────────────────────
function animateCounters() {
  [['stat-deliveries',12847,''],['stat-savings',40,'%'],['stat-travelers',3291,'']].forEach(([id,target,suf]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let n = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      n = Math.min(n + step, target);
      el.textContent = Math.floor(n).toLocaleString() + suf;
      if (n >= target) clearInterval(timer);
    }, 16);
  });
  const r = document.getElementById('stat-rating');
  if (r) r.textContent = '4.8★';
}
