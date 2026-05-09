import {
  ensureMockDatabase,
  getSession,
  setSession,
  getCategories,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  calculateFinancialOverview
} from "./storage.js";

const money = new Intl.NumberFormat("en-US");

const ui = {
  roleSelect: document.getElementById("roleSelect"),
  roleNote: document.getElementById("roleNote"),
  totalRevenue: document.getElementById("totalRevenue"),
  totalOrders: document.getElementById("totalOrders"),
  bestSeller: document.getElementById("bestSeller"),
  shippingSummary: document.getElementById("shippingSummary"),
  productForm: document.getElementById("productForm"),
  productId: document.getElementById("productId"),
  productName: document.getElementById("productName"),
  productPrice: document.getElementById("productPrice"),
  productCategory: document.getElementById("productCategory"),
  productStock: document.getElementById("productStock"),
  productImage: document.getElementById("productImage"),
  productDescription: document.getElementById("productDescription"),
  formTitle: document.getElementById("formTitle"),
  clearEditBtn: document.getElementById("clearEditBtn"),
  productsBody: document.getElementById("productsBody"),
  ordersBody: document.getElementById("ordersBody"),
  syncHint: document.getElementById("syncHint")
};

function formatLE(value) {
  return `${money.format(Math.round(Number(value) || 0))} L.E`;
}

function toast(message) {
  const holder = document.getElementById("toastWrap");
  if (!holder) {
    return;
  }
  const item = document.createElement("div");
  item.className = "admin-toast";
  item.textContent = message;
  holder.appendChild(item);
  setTimeout(() => {
    item.classList.add("hide");
    setTimeout(() => item.remove(), 250);
  }, 2200);
}

function renderCategories() {
  const categories = getCategories();
  ui.productCategory.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function renderFinancialOverview() {
  const financial = calculateFinancialOverview();
  ui.totalRevenue.textContent = formatLE(financial.totalRevenue);
  ui.totalOrders.textContent = String(financial.totalOrders);
  ui.bestSeller.textContent = financial.bestSellingProduct === "-"
    ? "-"
    : `${financial.bestSellingProduct} (${financial.bestSellingQty})`;
  ui.shippingSummary.textContent = `Delivered: ${financial.deliveredCount} | Shipped: ${financial.shippedCount} | Pending: ${financial.pendingCount}`;
}

function renderProductsTable() {
  const products = getProducts();

  ui.productsBody.innerHTML = products.map((product) => {
    return `
      <tr>
        <td><img class="thumb" src="${product.image}" alt="${product.name}" /></td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>${formatLE(product.price)}</td>
        <td>${product.stock ?? 0}</td>
        <td class="action-col">
          <button type="button" data-edit-id="${product.id}">Edit</button>
          <button type="button" data-delete-id="${product.id}" class="danger">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderOrdersTable() {
  const orders = getOrders();
  ui.ordersBody.innerHTML = orders.map((order) => {
    const orderTotal = (order.items || []).reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.qty) || 0);
    }, 0);

    const options = ["Pending", "Shipped", "Delivered"]
      .map((status) => {
        const selected = status === order.status ? "selected" : "";
        return `<option value="${status}" ${selected}>${status}</option>`;
      })
      .join("");

    return `
      <tr>
        <td>${order.id}</td>
        <td>${order.customer}</td>
        <td>${formatLE(orderTotal)}</td>
        <td>${order.createdAt}</td>
        <td>
          <select data-order-id="${order.id}">
            ${options}
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

function clearForm() {
  ui.productId.value = "";
  ui.productForm.reset();
  renderCategories();
  ui.formTitle.textContent = "Add New Product";
}

function hydrateForm(productId) {
  const product = getProducts().find((item) => item.id === productId);
  if (!product) {
    return;
  }

  ui.productId.value = product.id;
  ui.productName.value = product.name;
  ui.productPrice.value = product.price;
  ui.productCategory.value = product.category;
  ui.productStock.value = product.stock ?? 0;
  ui.productImage.value = product.image;
  ui.productDescription.value = product.description;
  ui.formTitle.textContent = "Edit Product";
}

function applyRole() {
  const session = getSession();
  ui.roleSelect.value = session.role;
  ui.roleNote.textContent = session.role === "admin"
    ? "Admin mode enabled. Product and order changes are active."
    : "Customer mode selected. Admin tools remain visible for demo only.";
}

function bindEvents() {
  ui.roleSelect.addEventListener("change", () => {
    const role = ui.roleSelect.value;
    setSession({ role, isLoggedIn: true });
    applyRole();
    toast(`Role switched to ${role}`);
  });

  ui.productForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      name: ui.productName.value,
      price: ui.productPrice.value,
      category: ui.productCategory.value,
      stock: ui.productStock.value,
      image: ui.productImage.value,
      description: ui.productDescription.value
    };

    if (!payload.name.trim()) {
      toast("Product name is required");
      return;
    }

    if (!payload.image.trim()) {
      toast("Image URL is required");
      return;
    }

    const currentId = ui.productId.value.trim();
    if (currentId) {
      updateProduct(currentId, payload);
      toast("Product updated");
    } else {
      addProduct(payload);
      toast("Product added");
    }

    clearForm();
    renderProductsTable();
    ui.syncHint.textContent = "Changes saved to localStorage and available in the storefront.";
  });

  ui.clearEditBtn.addEventListener("click", () => {
    clearForm();
  });

  ui.productsBody.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-edit-id]");
    if (editBtn) {
      hydrateForm(editBtn.dataset.editId);
      return;
    }

    const deleteBtn = event.target.closest("[data-delete-id]");
    if (!deleteBtn) {
      return;
    }

    const removed = deleteProduct(deleteBtn.dataset.deleteId);
    if (removed) {
      renderProductsTable();
      toast("Product deleted");
    }
  });

  ui.ordersBody.addEventListener("change", (event) => {
    const select = event.target.closest("select[data-order-id]");
    if (!select) {
      return;
    }

    updateOrderStatus(select.dataset.orderId, select.value);
    renderOrdersTable();
    renderFinancialOverview();
    toast(`Order ${select.dataset.orderId} marked as ${select.value}`);
  });
}

function init() {
  ensureMockDatabase();
  applyRole();
  renderCategories();
  renderFinancialOverview();
  renderProductsTable();
  renderOrdersTable();
  bindEvents();
}

init();
