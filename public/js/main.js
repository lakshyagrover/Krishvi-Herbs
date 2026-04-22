/* ═══════════════════════════════════════════════
   KRISHVI HERBS — Main JavaScript
   ═══════════════════════════════════════════════ */

// ─── Cart (localStorage) ─────────────────────────
const CART_KEY = 'krishvi_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(item) {
  const cart = getCart();
  const cartKey = item.variant ? `${item.id}-${item.variant}` : item.id;
  const existing = cart.find(i => (i.variant ? `${i.id}-${i.variant}` : i.id) === cartKey);
  if (existing) {
    existing.quantity += (item.quantity || 1);
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity || 1,
      variant: item.variant || '',
      productId: item.productId || item.id
    });
  }
  saveCart(cart);
  updateCartBadge();
  showToast(`${item.name} added to cart!`, 'success');
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  const badges = document.querySelectorAll('#cartBadge');
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

// ─── Toast Notifications ─────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Custom Confirmation Modal ───────────────────
function showConfirm(options = {}) {
  return new Promise((resolve) => {
    const title = options.title || 'Are you sure?';
    const message = options.message || 'This action cannot be undone.';
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';
    const type = options.type || 'danger'; // 'danger' or 'primary'

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-icon" style="background: ${type === 'danger' ? '#fce4ec' : '#e8f5e0'}; color: ${type === 'danger' ? '#e74c3c' : '#27ae60'}">
          <i class="fas ${type === 'danger' ? 'fa-exclamation-triangle' : 'fa-question-circle'}"></i>
        </div>
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modalCancel">${cancelText}</button>
          <button class="btn ${type === 'danger' ? 'btn-primary' : 'btn-primary'}" style="${type === 'danger' ? 'background: #e74c3c' : ''}" id="modalConfirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);

    const cleanup = (result) => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        resolve(result);
      }, 300);
    };

    modal.querySelector('#modalConfirm').onclick = () => cleanup(true);
    modal.querySelector('#modalCancel').onclick = () => cleanup(false);
    modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
  });
}

// ─── Navbar ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Update cart badge on load
  updateCartBadge();

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // User dropdown
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }

  // Add to cart buttons (product cards)
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      addToCart({
        id: this.dataset.id,
        name: this.dataset.name,
        price: parseFloat(this.dataset.price),
        image: this.dataset.image,
        quantity: 1
      });

      // Button animation
      this.innerHTML = '<i class="fas fa-check"></i> Added';
      this.style.background = '#27ae60';
      setTimeout(() => {
        this.innerHTML = '<i class="fas fa-plus"></i> Add';
        this.style.background = '';
      }, 1500);
    });
  });
});
