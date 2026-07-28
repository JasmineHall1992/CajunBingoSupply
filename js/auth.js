// Cajun Bingo Supply — auth/data layer backed by Supabase.
// Every method here is async now (Supabase has no synchronous API) —
// every call site must use `await CBS.whatever()` or `.then(...)`.
// Requires js/supabase-client.js to be loaded first (defines `supabase`).

const CBS = (() => {

  // ---- session / profile helpers ----

  async function currentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error || !profile) return null;
    return { id: session.user.id, email: profile.email, name: profile.name, status: profile.status, role: profile.role, avatarUrl: profile.avatar_url };
  }

  async function register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: { name: name.trim() } }
    });
    if (error) return { ok: false, error: error.message };
    if (data.user && !data.session) {
      // Shouldn't normally happen (email confirmation is disabled project-side),
      // but guard against it rather than assume.
      return { ok: false, error: 'Check your email to confirm your address, then sign in.' };
    }
    // Signed up successfully — but not approved yet. Sign back out immediately;
    // an account existing pre-approval must not grant any access.
    await supabase.auth.signOut();
    return { ok: true, pending: true };
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });
    if (error) return { ok: false, error: 'Incorrect email or password.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single();

    if (!profile || profile.status === 'pending') {
      await supabase.auth.signOut();
      return { ok: false, error: 'Your account is still awaiting admin approval.', status: 'pending' };
    }
    if (profile.status === 'rejected') {
      await supabase.auth.signOut();
      return { ok: false, error: 'This signup request was not approved.', status: 'rejected' };
    }
    return { ok: true };
  }

  async function loginGoogle() {
    // Redirects the browser to Google, then back to this same page.
    // Approval-status handling happens in the page's own onAuthStateChange
    // listener (see pages/login.html) since this call doesn't return normally.
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function logoutRedirect() {
    await logout();
    const inPages = window.location.pathname.includes('/pages/');
    window.location.href = inPages ? 'login.html' : 'pages/login.html';
  }

  // ---- cart ----

  async function getCartItems(knownUser) {
    const user = knownUser || await currentUser();
    if (!user) return [];
    const { data } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, added_at, products(id, name, form_label, price_display, img_class, flyer_path)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: true });
    return data || [];
  }

  async function getCartCount() {
    const items = await getCartItems();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  async function addToCart(productId, qty = 1) {
    const user = await currentUser();
    if (!user || user.status !== 'approved') return { ok: false, needsLogin: true };

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + qty })
        .eq('id', existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity: qty });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function updateCartQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
      return { ok: !error, error: error ? error.message : null };
    }
    const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
    return { ok: !error, error: error ? error.message : null };
  }

  async function removeFromCart(cartItemId) {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    return { ok: !error, error: error ? error.message : null };
  }

  async function clearCart() {
    const user = await currentUser();
    if (!user) return { ok: false };
    const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
    return { ok: !error, error: error ? error.message : null };
  }

  // ---- favorites ----

  async function getUserFavorites(knownUser) {
    const user = knownUser || await currentUser();
    if (!user) return [];
    const { data } = await supabase
      .from('favorites')
      .select('product_id, saved_at, products(id, name, form_label, price_display, img_class, flyer_path)')
      .eq('user_id', user.id);
    return data || [];
  }

  async function toggleFavorite(product) {
    const user = await currentUser();
    if (!user || user.status !== 'approved') return { ok: false, needsLogin: true };

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      return { ok: true, saved: false };
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: product.id });
      return { ok: true, saved: true };
    }
  }

  async function uploadAvatar(file) {
    const user = await currentUser();
    if (!user) return { ok: false, error: 'Not signed in.' };

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust so the browser doesn't keep showing a stale cached image
    // after re-uploading to the same path.
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);
    if (updateError) return { ok: false, error: updateError.message };

    return { ok: true, avatarUrl };
  }

  // Avatar can be a real uploaded photo (avatar_url = storage URL), a fun
  // preset (avatar_url = "preset:<emoji>|<color>"), or blank (avatar_url = null).
  function parseAvatar(avatarUrl) {
    if (!avatarUrl) return { type: 'blank' };
    if (avatarUrl.startsWith('preset:')) {
      const [emoji, color] = avatarUrl.slice(7).split('|');
      return { type: 'preset', emoji, color };
    }
    return { type: 'image', url: avatarUrl };
  }

  async function removeAvatar() {
    const user = await currentUser();
    if (!user) return { ok: false, error: 'Not signed in.' };
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, avatarUrl: null };
  }

  async function setAvatarPreset(emoji, color) {
    const user = await currentUser();
    if (!user) return { ok: false, error: 'Not signed in.' };
    const avatarUrl = `preset:${emoji}|${color}`;
    const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, avatarUrl };
  }

  async function isFavorited(productId) {
    const user = await currentUser();
    if (!user) return false;
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    return !!data;
  }

  // ---- admin-only ----

  async function getActivityLog() {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, profiles(name, email)')
      .order('ts', { ascending: false });
    if (error) return [];
    return data;
  }

  async function getPendingSignups() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    return data || [];
  }

  async function getAllUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  }

  async function reviewSignup(profileId, decision, reason) {
    const admin = await currentUser();
    const { error } = await supabase
      .from('profiles')
      .update({
        status: decision, // 'approved' | 'rejected'
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin ? admin.id : null,
        rejection_reason: decision === 'rejected' ? (reason || null) : null
      })
      .eq('id', profileId);
    return { ok: !error, error: error ? error.message : null };
  }

  // ---- nav helper ----

  async function updateNav() {
    const link = document.getElementById('nav-auth-link');
    if (!link) return;
    const logoutLink = document.getElementById('nav-logout-link');
    const cartLink = document.getElementById('nav-cart-link');
    const user = await currentUser();
    if (!user || user.status !== 'approved') return;
    if (logoutLink) logoutLink.style.display = '';
    if (cartLink) {
      cartLink.style.display = 'inline-flex';
      const count = await getCartCount();
      const countEl = document.getElementById('nav-cart-count');
      if (countEl) {
        countEl.textContent = count;
        countEl.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    }
    const firstName = (user.name || 'Account').split(' ')[0];
    const inPages = window.location.pathname.includes('/pages/');
    link.href = inPages ? 'account.html' : 'pages/account.html';
    link.style.color = '#FFD700';
    link.style.fontWeight = '700';

    if (user.avatarUrl) {
      link.innerHTML = '';
      link.classList.add('nav-user-link');
      const avatar = parseAvatar(user.avatarUrl);
      if (avatar.type === 'image') {
        const img = document.createElement('img');
        img.src = avatar.url;
        img.alt = firstName;
        img.className = 'nav-avatar';
        link.appendChild(img);
      } else if (avatar.type === 'preset') {
        const span = document.createElement('span');
        span.className = 'nav-avatar nav-avatar-preset';
        span.style.background = avatar.color;
        span.textContent = avatar.emoji;
        link.appendChild(span);
      }
      link.appendChild(document.createTextNode(firstName));
    } else {
      link.textContent = firstName;
    }
  }

  document.addEventListener('DOMContentLoaded', updateNav);

  return {
    register, login, loginGoogle, logout, logoutRedirect, currentUser, uploadAvatar, removeAvatar, setAvatarPreset, parseAvatar, updateNav,
    getUserFavorites, toggleFavorite, isFavorited,
    getCartItems, getCartCount, addToCart, updateCartQuantity, removeFromCart, clearCart,
    getActivityLog, getPendingSignups, getAllUsers, reviewSignup
  };
})();

// Mobile hamburger menu toggle — plain global function (not part of CBS)
// since it's just a UI show/hide, not an auth/data operation.
function toggleMobileNav() {
  const nav = document.querySelector('header nav');
  if (!nav) return;
  const isOpen = nav.classList.toggle('mobile-open');
  const btn = nav.querySelector('.nav-hamburger');
  if (btn) btn.innerHTML = isOpen ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
  if (window.lucide) lucide.createIcons();
}
