import {
  ensureMockDatabase,
  getProducts,
  getCategories,
  getSession,
  setSession,
  getOrders
} from "./storage.js";

const money = new Intl.NumberFormat("en-US");

// Category-specific image URLs for reliable product images
const CATEGORY_IMAGE_MAP = {
  "Physical Therapy": "https://images.unsplash.com/photo-1576091160550-112173f7f869?auto=format&fit=crop&w=600&q=80",
  "Nursing": "https://images.unsplash.com/photo-1576091160550-112173f7f869?auto=format&fit=crop&w=600&q=80",
  "Engineering": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
  "Computers & AI": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
  "Business Administration": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
  "Applied Health Sciences Technology": "https://images.unsplash.com/photo-1576091160550-112173f7f869?auto=format&fit=crop&w=600&q=80",
  "Pharmacy": "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80"
};

function getProductImageUrl(product) {
  // If product already has a good image from Unsplash/external source, use it
  if (product.image && (product.image.includes("unsplash") || product.image.includes("picsum") || product.image.includes("images."))) {
    return product.image;
  }
  
  // Get category-specific image
  const category = product.category || "General";
  const categoryImage = CATEGORY_IMAGE_MAP[category] || "https://images.unsplash.com/photo-1523206489230-c012066fba03?auto=format&fit=crop&w=600&q=80";
  
  // Add unique seed based on product for variety
  const seed = product.id ? product.id.charCodeAt(0) : 0;
  return categoryImage + (categoryImage.includes("?") ? "&" : "?") + `utm_source=rst_${seed}`;
}

// State
const state = {
  allProducts: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem("rst-cart") || "[]"),
  selectedFilters: {
    categories: [],
    priceRanges: []
  },
  sortBy: "featured",
  selectedProduct: null
};

// Elements
const elements = {
  searchInput: document.getElementById("searchInput"),
  searchForm: document.getElementById("searchForm"),
  categoryFilters: document.getElementById("categoryFilters"),
  priceFilters: document.querySelectorAll(".price-filter"),
  clearFilters: document.getElementById("clearFilters"),
  sortBy: document.getElementById("sortBy"),
  resultsCount: document.getElementById("resultsCount"),
  productsGrid: document.getElementById("productsGrid"),
  cartCount: document.getElementById("cartCount"),
  cartToggle: document.getElementById("cartToggle"),
  cartDrawer: document.getElementById("cartDrawer"),
  closeCart: document.getElementById("closeCart"),
  cartItems: document.getElementById("cartItems"),
  cartTotalPrice: document.getElementById("cartTotalPrice"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  productModal: document.getElementById("productModal"),
  closeModal: document.getElementById("closeModal"),
  modalImage: document.getElementById("modalImage"),
  modalName: document.getElementById("modalName"),
  modalCategory: document.getElementById("modalCategory"),
  modalDescription: document.getElementById("modalDescription"),
  modalPrice: document.getElementById("modalPrice"),
  modalStock: document.getElementById("modalStock"),
  modalAddToCart: document.getElementById("modalAddToCart"),
  accountBtn: document.getElementById("accountBtn"),
  accountModal: document.getElementById("accountModal"),
  closeAccount: document.getElementById("closeAccount"),
  ordersList: document.getElementById("ordersList"),
  categoryNav: document.getElementById("categoryNav"),
  toastContainer: document.getElementById("toastContainer")
};

function formatLE(value) {
  return `${money.format(Math.round(Number(value) || 0))} L.E`;
}

function toast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function populateCategories() {
  const categories = getCategories();
  
  // Populate filters
  elements.categoryFilters.innerHTML = categories
    .map(category => `
      <label>
        <input 
          type="checkbox" 
          class="category-filter" 
          value="${category}"
          data-category="${category}"
        />
        ${category}
      </label>
    `)
    .join("");

  // Populate category nav
  elements.categoryNav.innerHTML = categories
    .map(category => `
      <button type="button" class="category-btn" data-category="${category}">
        ${category}
      </button>
    `)
    .join("");

  // Add event listeners
  document.querySelectorAll(".category-filter").forEach(checkbox => {
    checkbox.addEventListener("change", applyFilters);
  });

  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      const checkbox = document.querySelector(`[data-category="${category}"]`);
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        applyFilters();
      }
    });
  });
}

function loadProducts() {
  ensureMockDatabase();
  
  // Get from admin + generated
  const adminProducts = getProducts();
  state.allProducts = adminProducts.slice();
}

function filterByPrice(price, range) {
  const [min, max] = range === "2000+"
    ? [2000, Infinity]
    : range.split("-").map(Number);
  
  return price >= min && price <= max;
}

function applyFilters() {
  const selectedCategories = Array.from(
    document.querySelectorAll(".category-filter:checked")
  ).map(cb => cb.value);

  const selectedPrices = Array.from(
    document.querySelectorAll(".price-filter:checked")
  ).map(cb => cb.value);

  state.selectedFilters.categories = selectedCategories;
  state.selectedFilters.priceRanges = selectedPrices;

  let filtered = state.allProducts.slice();

  // Filter by category
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(p => selectedCategories.includes(p.category));
  }

  // Filter by price
  if (selectedPrices.length > 0) {
    filtered = filtered.filter(p => 
      selectedPrices.some(range => filterByPrice(p.price, range))
    );
  }

  state.filteredProducts = filtered;
  sortProducts();
  renderProducts();
}

function sortProducts() {
  const products = state.filteredProducts;

  switch (state.sortBy) {
    case "price-low":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      products.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      break;
    case "featured":
    default:
      // Keep original order
      break;
  }
}

function renderProducts() {
  const products = state.filteredProducts;
  
  elements.resultsCount.textContent = products.length === 1
    ? "1 product"
    : `${products.length} products`;

  if (products.length === 0) {
    elements.productsGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; color: #666;">
        <p style="font-size: 16px; margin-bottom: 8px;">No products found</p>
        <p style="font-size: 14px;">Try adjusting your filters</p>
      </div>
    `;
    return;
  }

  elements.productsGrid.innerHTML = products
    .map(product => `
      <div class="product-card">
        <img 
          src="${getProductImageUrl(product)}" 
          alt="${product.name}"
          class="product-image"
          style="cursor: pointer;"
          data-product-id="${product.id}"
        />
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${formatLE(product.price)}</div>
        <div class="product-stock">${(product.stock ?? 0) > 0 ? "In Stock" : "Out of Stock"}</div>
        <div class="product-actions">
          <button 
            type="button"
            class="btn-primary add-to-cart-btn"
            data-product-id="${product.id}"
          >
            Add to Cart
          </button>
          <button 
            type="button"
            class="btn-secondary quick-view-btn"
            data-product-id="${product.id}"
          >
            Details
          </button>
        </div>
      </div>
    `)
    .join("");

  // Attach event listeners
  document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.allProducts.find(p => p.id === btn.dataset.productId);
      if (product) addToCart(product);
    });
  });

  document.querySelectorAll(".quick-view-btn, .product-image").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (e.target.classList.contains("product-image")) {
        const id = e.target.dataset.productId;
        const product = state.allProducts.find(p => p.id === id);
        if (product) openProductModal(product);
      } else {
        const product = state.allProducts.find(p => p.id === btn.dataset.productId);
        if (product) openProductModal(product);
      }
    });
  });
}

function openProductModal(product) {
  state.selectedProduct = product;
  elements.modalImage.src = getProductImageUrl(product);
  elements.modalName.textContent = product.name;
  elements.modalCategory.textContent = product.category;
  elements.modalDescription.textContent = product.description || "No description available.";
  elements.modalPrice.textContent = formatLE(product.price);
  elements.modalStock.textContent = (product.stock ?? 0) > 0 ? "In Stock" : "Out of Stock";
  elements.productModal.style.display = "flex";
}

function closeProductModal() {
  elements.productModal.style.display = "none";
  state.selectedProduct = null;
}

function addToCart(product) {
  const existing = state.cart.find(item => item.id === product.id);
  
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1
    });
  }

  persistCart();
  updateCartUI();
  toast("Added to cart!");
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  persistCart();
  updateCartUI();
  toast("Removed from cart");
}

function updateCartQuantity(productId, newQty) {
  const item = state.cart.find(i => i.id === productId);
  if (item) {
    item.qty = Math.max(1, newQty);
    persistCart();
    updateCartUI();
  }
}

function persistCart() {
  localStorage.setItem("rst-cart", JSON.stringify(state.cart));
}

function updateCartUI() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  elements.cartCount.textContent = totalItems;

  if (state.cart.length === 0) {
    elements.cartItems.innerHTML = '<p class="empty-message">Your cart is empty</p>';
  } else {
    elements.cartItems.innerHTML = state.cart
      .map(item => `
        <div class="cart-item">
          <img src="${getProductImageUrl(item)}" alt="${item.name}" />
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">${formatLE(item.price)}</div>
            <div class="cart-item-qty">
              <button type="button" data-decrease="${item.id}">-</button>
              <span>${item.qty}</span>
              <button type="button" data-increase="${item.id}">+</button>
            </div>
            <span class="cart-item-remove" data-remove="${item.id}">Remove</span>
          </div>
        </div>
      `)
      .join("");

    // Attach events
    document.querySelectorAll("[data-decrease]").forEach(btn => {
      btn.addEventListener("click", () => {
        updateCartQuantity(btn.dataset.decrease, state.cart.find(i => i.id === btn.dataset.decrease).qty - 1);
      });
    });

    document.querySelectorAll("[data-increase]").forEach(btn => {
      btn.addEventListener("click", () => {
        updateCartQuantity(btn.dataset.increase, state.cart.find(i => i.id === btn.dataset.increase).qty + 1);
      });
    });

    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        removeFromCart(btn.dataset.remove);
      });
    });
  }

  elements.cartTotalPrice.textContent = formatLE(totalPrice);
}

function showOrderHistory() {
  const orders = getOrders();
  
  if (orders.length === 0) {
    elements.ordersList.innerHTML = '<p style="color: #666;">No orders yet</p>';
    return;
  }

  elements.ordersList.innerHTML = orders
    .slice(0, 5)
    .map(order => `
      <div class="order-item">
        <strong>${order.id}</strong><br>
        <span>${order.createdAt}</span> - <span class="status">${order.status}</span><br>
        <small>${order.items.length} item(s)</small>
      </div>
    `)
    .join("");
}

function bindEvents() {
  // Search
  elements.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = elements.searchInput.value.toLowerCase().trim();
    
    if (!query) {
      state.filteredProducts = state.allProducts.slice();
      renderProducts();
      return;
    }

    state.filteredProducts = state.allProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );

    sortProducts();
    renderProducts();
    toast(`Found ${state.filteredProducts.length} product(s)`);
  });

  // Sort
  elements.sortBy.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    sortProducts();
    renderProducts();
  });

  // Clear filters
  elements.clearFilters.addEventListener("click", () => {
    document.querySelectorAll(".category-filter, .price-filter").forEach(cb => {
      cb.checked = false;
    });
    elements.searchInput.value = "";
    state.selectedFilters.categories = [];
    state.selectedFilters.priceRanges = [];
    state.filteredProducts = state.allProducts.slice();
    sortProducts();
    renderProducts();
  });

  // Cart
  elements.cartToggle.addEventListener("click", () => {
    elements.cartDrawer.style.display = elements.cartDrawer.style.display === "none" ? "flex" : "none";
  });

  elements.closeCart.addEventListener("click", () => {
    elements.cartDrawer.style.display = "none";
  });

  elements.checkoutBtn.addEventListener("click", () => {
    if (state.cart.length === 0) {
      toast("Cart is empty");
      return;
    }
    toast("Proceeding to checkout...");
    setTimeout(() => {
      elements.cartDrawer.style.display = "none";
    }, 500);
  });

  // Modal
  elements.closeModal.addEventListener("click", closeProductModal);
  elements.productModal.addEventListener("click", (e) => {
    if (e.target === elements.productModal) closeProductModal();
  });

  elements.modalAddToCart.addEventListener("click", () => {
    if (state.selectedProduct) {
      addToCart(state.selectedProduct);
      closeProductModal();
    }
  });

  // Account
  elements.accountBtn.addEventListener("click", () => {
    showOrderHistory();
    elements.accountModal.style.display = "flex";
  });

  elements.closeAccount.addEventListener("click", () => {
    elements.accountModal.style.display = "none";
  });

  elements.accountModal.addEventListener("click", (e) => {
    if (e.target === elements.accountModal) {
      elements.accountModal.style.display = "none";
    }
  });
}

function init() {
  loadProducts();
  populateCategories();
  
  state.filteredProducts = state.allProducts.slice();
  sortProducts();
  renderProducts();
  updateCartUI();
  bindEvents();
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
