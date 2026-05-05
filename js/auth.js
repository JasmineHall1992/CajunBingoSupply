const CBS = (() => {
  const USERS_KEY = 'cbs_users';
  const SESSION_KEY = 'cbs_session';
  const FAVS_KEY = 'cbs_favorites';
  const LOG_KEY = 'cbs_activity';

  const _get = k => JSON.parse(localStorage.getItem(k) || 'null');
  const _set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function register(name, email, password) {
    const users = _get(USERS_KEY) || {};
    const key = email.toLowerCase().trim();
    if (users[key]) return { ok: false, error: 'An account with this email already exists.' };
    users[key] = { name: name.trim(), email: key, password, created: Date.now() };
    _set(USERS_KEY, users);
    _set(SESSION_KEY, { name: name.trim(), email: key });
    return { ok: true };
  }

  function login(email, password) {
    const users = _get(USERS_KEY) || {};
    const key = email.toLowerCase().trim();
    const user = users[key];
    if (!user) return { ok: false, error: 'No account found with that email.' };
    if (user.password !== password) return { ok: false, error: 'Incorrect password.' };
    _set(SESSION_KEY, { name: user.name, email: key });
    return { ok: true };
  }

  function loginGoogle(name, email) {
    const users = _get(USERS_KEY) || {};
    const key = email.toLowerCase().trim();
    if (!users[key]) {
      users[key] = { name: name.trim(), email: key, google: true, created: Date.now() };
      _set(USERS_KEY, users);
    }
    _set(SESSION_KEY, { name: users[key].name, email: key, google: true });
    return { ok: true };
  }

  function logout() { localStorage.removeItem(SESSION_KEY); }
  function currentUser() { return _get(SESSION_KEY); }

  function getUserFavorites(email) {
    const all = _get(FAVS_KEY) || {};
    return all[email] || [];
  }

  function toggleFavorite(product) {
    const user = _get(SESSION_KEY);
    if (!user) return { ok: false, needsLogin: true };
    const all = _get(FAVS_KEY) || {};
    if (!all[user.email]) all[user.email] = [];
    const idx = all[user.email].findIndex(f => f.id === product.id);
    let saved;
    if (idx === -1) {
      all[user.email].push({ ...product, savedAt: new Date().toISOString() });
      saved = true;
    } else {
      all[user.email].splice(idx, 1);
      saved = false;
    }
    _set(FAVS_KEY, all);
    _logActivity(user.email, product.id, product.name, saved ? 'saved' : 'removed');
    return { ok: true, saved };
  }

  function isFavorited(productId) {
    const user = _get(SESSION_KEY);
    if (!user) return false;
    return getUserFavorites(user.email).some(f => f.id === productId);
  }

  function _logActivity(email, productId, productName, action) {
    const log = _get(LOG_KEY) || [];
    log.push({ email, productId, productName, action, ts: new Date().toISOString() });
    _set(LOG_KEY, log);
  }

  function getActivityLog() { return _get(LOG_KEY) || []; }

  function updateNav() {
    const user = _get(SESSION_KEY);
    const link = document.getElementById('nav-auth-link');
    if (!link || !user) return;
    const firstName = (user.name || 'Account').split(' ')[0];
    const inPages = window.location.pathname.includes('/pages/');
    link.textContent = firstName;
    link.href = inPages ? 'account.html' : 'pages/account.html';
    link.style.color = '#FFD700';
    link.style.fontWeight = '700';
  }

  document.addEventListener('DOMContentLoaded', updateNav);

  return {
    register, login, loginGoogle, logout, currentUser,
    getUserFavorites, toggleFavorite, isFavorited, getActivityLog
  };
})();
