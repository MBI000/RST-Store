const LS_KEYS = {
  products: "rst-products-db",
  orders: "rst-orders-db",
  session: "rst-session"
};

const CATEGORY_LIST = [
  "Physical Therapy",
  "Nursing",
  "Engineering",
  "Computers & AI",
  "Business Administration",
  "Applied Health Sciences Technology",
  "Pharmacy"
];

const DEFAULT_PRODUCTS = [
  {
    id: "adm-cs-1",
    name: "AI Prompt Engineering Notebook",
    price: 690,
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    description: "Guided notebook with prompt templates and model testing grids.",
    category: "Computers & AI",
    stock: 22,
    createdAt: Date.now()
  },
  {
    id: "adm-eng-1",
    name: "Engineering Sensor Starter Pack",
    price: 1490,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    description: "Core sensor modules and wiring for semester projects.",
    category: "Engineering",
    stock: 14,
    createdAt: Date.now()
  },
  {
    id: "adm-ph-1",
    name: "Clinical Drug Interaction Cards",
    price: 530,
    image: "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=800&q=80",
    description: "Pocket-size revision cards for common interaction checks.",
    category: "Pharmacy",
    stock: 40,
    createdAt: Date.now()
  }
];

const DEFAULT_ORDERS = [
  {
    id: "ord-1001",
    customer: "Mahmoud Basem",
    status: "Delivered",
    createdAt: "2026-05-01",
    items: [
      { productId: "adm-cs-1", name: "AI Prompt Engineering Notebook", price: 690, qty: 2 },
      { productId: "adm-eng-1", name: "Engineering Sensor Starter Pack", price: 1490, qty: 1 }
    ]
  },
  {
    id: "ord-1002",
    customer: "Nada Emad",
    status: "Shipped",
    createdAt: "2026-05-03",
    items: [
      { productId: "adm-ph-1", name: "Clinical Drug Interaction Cards", price: 530, qty: 3 }
    ]
  },
  {
    id: "ord-1003",
    customer: "Omar Ali",
    status: "Pending",
    createdAt: "2026-05-07",
    items: [
      { productId: "adm-cs-1", name: "AI Prompt Engineering Notebook", price: 690, qty: 1 }
    ]
  }
];

function safeReadJSON(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallbackValue;
    }
    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ensureMockDatabase() {
  if (!localStorage.getItem(LS_KEYS.products)) {
    writeJSON(LS_KEYS.products, DEFAULT_PRODUCTS);
  }
  if (!localStorage.getItem(LS_KEYS.orders)) {
    writeJSON(LS_KEYS.orders, DEFAULT_ORDERS);
  }
  if (!localStorage.getItem(LS_KEYS.session)) {
    writeJSON(LS_KEYS.session, { role: "customer", isLoggedIn: false });
  }
}

export function getCategories() {
  return CATEGORY_LIST.slice();
}

export function getSession() {
  ensureMockDatabase();
  return safeReadJSON(LS_KEYS.session, { role: "customer", isLoggedIn: false });
}

export function setSession(nextSession) {
  const current = getSession();
  const merged = { ...current, ...nextSession };
  writeJSON(LS_KEYS.session, merged);
  return merged;
}

export function getProducts() {
  ensureMockDatabase();
  return safeReadJSON(LS_KEYS.products, []).slice();
}

export function saveProducts(products) {
  writeJSON(LS_KEYS.products, products);
  return products;
}

export function addProduct(productInput) {
  const products = getProducts();
  const next = {
    id: uid("prd"),
    name: String(productInput.name || "").trim(),
    price: Number(productInput.price) || 0,
    image: String(productInput.image || "").trim(),
    description: String(productInput.description || "").trim(),
    category: String(productInput.category || "General").trim(),
    stock: Number(productInput.stock) || 0,
    createdAt: Date.now()
  };
  products.unshift(next);
  saveProducts(products);
  return next;
}

export function updateProduct(productId, patch) {
  const products = getProducts();
  const index = products.findIndex((item) => item.id === productId);
  if (index === -1) {
    return null;
  }

  const current = products[index];
  const updated = {
    ...current,
    ...patch,
    price: patch.price !== undefined ? Number(patch.price) || 0 : current.price,
    stock: patch.stock !== undefined ? Number(patch.stock) || 0 : current.stock
  };

  products[index] = updated;
  saveProducts(products);
  return updated;
}

export function deleteProduct(productId) {
  const products = getProducts();
  const filtered = products.filter((item) => item.id !== productId);
  saveProducts(filtered);
  return filtered.length !== products.length;
}

export function getOrders() {
  ensureMockDatabase();
  return safeReadJSON(LS_KEYS.orders, []).slice();
}

export function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) {
    return null;
  }

  orders[index] = { ...orders[index], status };
  writeJSON(LS_KEYS.orders, orders);
  return orders[index];
}

export function calculateFinancialOverview() {
  const orders = getOrders();

  const totalRevenue = orders.reduce((orderSum, order) => {
    const orderTotal = (order.items || []).reduce((lineSum, item) => {
      return lineSum + (Number(item.price) || 0) * (Number(item.qty) || 0);
    }, 0);
    return orderSum + orderTotal;
  }, 0);

  const quantityByProduct = orders.reduce((acc, order) => {
    for (const item of order.items || []) {
      const current = acc[item.name] || 0;
      acc[item.name] = current + (Number(item.qty) || 0);
    }
    return acc;
  }, {});

  let bestSellingProduct = "-";
  let bestSellingQty = 0;
  for (const [name, qty] of Object.entries(quantityByProduct)) {
    if (qty > bestSellingQty) {
      bestSellingProduct = name;
      bestSellingQty = qty;
    }
  }

  const deliveredCount = orders.filter((order) => order.status === "Delivered").length;
  const shippedCount = orders.filter((order) => order.status === "Shipped").length;
  const pendingCount = orders.filter((order) => order.status === "Pending").length;

  return {
    totalRevenue,
    totalOrders: orders.length,
    bestSellingProduct,
    bestSellingQty,
    deliveredCount,
    shippedCount,
    pendingCount
  };
}
