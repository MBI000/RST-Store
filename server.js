const express = require("express");
const cors = require("cors");
const https = require("https");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FAKE_STORE_API_BASE = process.env.FAKE_STORE_API_BASE || "https://fakestoreapi.com";
const USD_TO_EGP = Number(process.env.USD_TO_EGP || 50);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 600000);

const CATEGORY_QUERY_MAP = {
  "Physical Therapy": ["rehabilitation tools", "physiotherapy equipment"],
  Nursing: ["nursing kits", "medical supplies", "scrubs"],
  Engineering: ["engineering tools", "electronics kits"],
  "Computers & AI": ["laptops", "AI books", "programming books", "keyboards"],
  "Business Administration": ["business books", "office supplies"],
  "Applied Health Sciences Technology": ["lab equipment", "diagnostic tools"],
  Pharmacy: ["pharmacy books", "medical reference", "lab tools"]
};

const FALLBACK_DATASET = {
  "Physical Therapy": [
    {
      id: "pt-f-1",
      name: "TheraBand Resistance Set",
      price: 845,
      image: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1000&q=80",
      description: "Progressive resistance bands ideal for rehab training and mobility routines.",
      category: "Physical Therapy"
    },
    {
      id: "pt-f-2",
      name: "Portable TENS Massager",
      price: 1299,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1000&q=80",
      description: "Compact electrotherapy massager for pain relief and muscle activation.",
      category: "Physical Therapy"
    },
    {
      id: "pt-f-3",
      name: "Balance Board Trainer",
      price: 980,
      image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1000&q=80",
      description: "Core stability and proprioception board for physiotherapy sessions.",
      category: "Physical Therapy"
    }
  ],
  Nursing: [
    {
      id: "n-f-1",
      name: "Clinical Nursing Starter Kit",
      price: 1140,
      image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1000&q=80",
      description: "Complete set with penlight, scissors, stethoscope accessories, and organizer.",
      category: "Nursing"
    },
    {
      id: "n-f-2",
      name: "Medical Scrub Set",
      price: 760,
      image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1000&q=80",
      description: "Comfortable scrub top and pants suitable for long training shifts.",
      category: "Nursing"
    },
    {
      id: "n-f-3",
      name: "Pocket Drug Guide 2026",
      price: 540,
      image: "https://images.unsplash.com/photo-1516549655669-df38e9ebf7ed?auto=format&fit=crop&w=1000&q=80",
      description: "Quick bedside reference for medications, dosages, and nursing notes.",
      category: "Nursing"
    }
  ],
  Engineering: [
    {
      id: "e-f-1",
      name: "Electronics Prototyping Kit",
      price: 1680,
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
      description: "Breadboard, jumper wires, sensors, and MCU essentials for lab projects.",
      category: "Engineering"
    },
    {
      id: "e-f-2",
      name: "Precision Engineering Caliper",
      price: 615,
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80",
      description: "Digital caliper with high accuracy for mechanical measurements.",
      category: "Engineering"
    },
    {
      id: "e-f-3",
      name: "Technical Drawing Instrument Set",
      price: 430,
      image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1000&q=80",
      description: "Drafting toolkit with compasses, templates, and precision pencils.",
      category: "Engineering"
    }
  ],
  "Computers & AI": [
    {
      id: "cai-f-1",
      name: "Mechanical Keyboard - TKL",
      price: 2290,
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80",
      description: "Fast tactile switches and compact layout for coding productivity.",
      category: "Computers & AI"
    },
    {
      id: "cai-f-2",
      name: "Machine Learning Handbook",
      price: 895,
      image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=80",
      description: "Applied ML concepts with practical Python workflows.",
      category: "Computers & AI"
    },
    {
      id: "cai-f-3",
      name: "Developer Laptop Stand",
      price: 560,
      image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1000&q=80",
      description: "Ergonomic aluminum stand for laptops up to 16 inches.",
      category: "Computers & AI"
    }
  ],
  "Business Administration": [
    {
      id: "ba-f-1",
      name: "Strategic Management Casebook",
      price: 790,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80",
      description: "Real-world case studies and management frameworks.",
      category: "Business Administration"
    },
    {
      id: "ba-f-2",
      name: "Executive Desk Organizer",
      price: 450,
      image: "https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&w=1000&q=80",
      description: "Minimal workspace organizer for documents and accessories.",
      category: "Business Administration"
    },
    {
      id: "ba-f-3",
      name: "Presentation Clicker Remote",
      price: 685,
      image: "https://images.unsplash.com/photo-1515168833906-d2a3b82b302a?auto=format&fit=crop&w=1000&q=80",
      description: "Wireless presenter remote with laser pointer and timer.",
      category: "Business Administration"
    }
  ],
  "Applied Health Sciences Technology": [
    {
      id: "ahst-f-1",
      name: "Basic Lab Microscope",
      price: 3190,
      image: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1000&q=80",
      description: "High-clarity student microscope for foundational lab analysis.",
      category: "Applied Health Sciences Technology"
    },
    {
      id: "ahst-f-2",
      name: "Diagnostic Toolkit",
      price: 1125,
      image: "https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?auto=format&fit=crop&w=1000&q=80",
      description: "Starter kit for health-tech diagnostics and measurements.",
      category: "Applied Health Sciences Technology"
    },
    {
      id: "ahst-f-3",
      name: "Lab Safety PPE Bundle",
      price: 520,
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
      description: "Safety goggles, gloves, and disposable lab coats.",
      category: "Applied Health Sciences Technology"
    }
  ],
  Pharmacy: [
    {
      id: "p-f-1",
      name: "Pharmacology Review Atlas",
      price: 930,
      image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1000&q=80",
      description: "Clinical drug classes and mechanisms in a visual reference format.",
      category: "Pharmacy"
    },
    {
      id: "p-f-2",
      name: "Compounding Measuring Set",
      price: 670,
      image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1000&q=80",
      description: "Precision beakers and measuring tools for pharmacy lab work.",
      category: "Pharmacy"
    },
    {
      id: "p-f-3",
      name: "Clinical Drug Interaction Guide",
      price: 820,
      image: "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=1000&q=80",
      description: "Comprehensive interactions handbook for student pharmacists.",
      category: "Pharmacy"
    }
  ]
};

const cache = new Map();

app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

function getCacheKey(params) {
  return JSON.stringify(params);
}

function readCache(key) {
  const item = cache.get(key);
  if (!item) {
    return null;
  }
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function writeCache(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

function normalizePrice(price) {
  if (typeof price !== "number") {
    return null;
  }
  return Math.round(price * USD_TO_EGP);
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Fake Store API error: ${res.statusCode} ${body}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error("Invalid Fake Store API response."));
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function fetchFakeStoreCatalog() {
  const response = await requestJson(`${FAKE_STORE_API_BASE}/products`);
  if (!Array.isArray(response)) {
    throw new Error("Unexpected Fake Store API shape.");
  }
  return response;
}

function buildSearchTokens(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (token.endsWith("s") && token.length > 3) {
        return [token, token.slice(0, -1)];
      }
      return [token, `${token}s`];
    });
}

function itemMatchesKeywords(item, keywords) {
  const haystack = `${item.title || ""} ${item.description || ""} ${item.category || ""}`.toLowerCase();

  return keywords.some((keyword) => {
    const normalized = keyword.toLowerCase();
    if (haystack.includes(normalized)) {
      return true;
    }

    const tokens = buildSearchTokens(normalized);
    return tokens.some((token) => haystack.includes(token));
  });
}

function mapFakeStoreItemToProduct(item, categoryLabel) {
  const mappedCategory = categoryLabel || "General";

  return {
    id: `fs-${mappedCategory}-${item.id}`,
    name: item.title || "Untitled Product",
    price: normalizePrice(item.price) || 0,
    image: item.image || "",
    description: item.description || "No description available.",
    category: mappedCategory
  };
}

async function fetchProductsFromFakeStore({ category, search }) {
  const queries = search
    ? [search]
    : category && CATEGORY_QUERY_MAP[category]
      ? CATEGORY_QUERY_MAP[category]
      : [];

  if (!queries.length) {
    throw new Error("No valid category or search query provided.");
  }

  const catalog = await fetchFakeStoreCatalog();

  const filtered = catalog.filter((item) => itemMatchesKeywords(item, queries));
  const products = filtered.map((item) => mapFakeStoreItemToProduct(item, category || "General"));

  const deduplicated = [];
  const seenIds = new Set();

  for (const item of products) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduplicated.push(item);
    }
  }

  return deduplicated.slice(0, 24);
}

function fallbackProducts({ category, search }) {
  if (search) {
    const merged = Object.values(FALLBACK_DATASET).flat();
    const q = search.toLowerCase().trim();
    const searchTokens = q
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((token) => {
        if (token.endsWith("s") && token.length > 3) {
          return [token, token.slice(0, -1)];
        }
        return [token, `${token}s`];
      });

    return merged.filter((item) => {
      const haystack = `${item.name} ${item.description} ${item.category}`.toLowerCase();

      if (haystack.includes(q)) {
        return true;
      }

      return (
        searchTokens.some((token) => haystack.includes(token))
      );
    });
  }

  if (category && FALLBACK_DATASET[category]) {
    return FALLBACK_DATASET[category];
  }

  return Object.values(FALLBACK_DATASET)
    .flat()
    .slice(0, 21);
}

app.get("/api/categories", (req, res) => {
  res.json({
    categories: Object.keys(CATEGORY_QUERY_MAP),
    mappings: CATEGORY_QUERY_MAP
  });
});

app.get("/api/featured", async (req, res) => {
  const cacheKey = getCacheKey({ endpoint: "featured" });
  const cached = readCache(cacheKey);

  if (cached) {
    res.json({
      source: cached.source,
      products: cached.products
    });
    return;
  }

  const featured = [];
  let usedFakeStore = false;
  let usedFallback = false;

  for (const category of Object.keys(CATEGORY_QUERY_MAP)) {
    try {
      const products = await fetchProductsFromFakeStore({ category });
      if (products.length) {
        usedFakeStore = true;
        featured.push(products[0]);
      }
    } catch (err) {
      const fallback = FALLBACK_DATASET[category] || [];
      if (fallback.length) {
        usedFallback = true;
        featured.push(fallback[0]);
      }
    }
  }

  const payload = {
    source: usedFakeStore && usedFallback ? "mixed" : usedFakeStore ? "fakestore" : "fallback",
    products: featured
  };

  writeCache(cacheKey, payload);
  res.json(payload);
});

app.get("/api/products", async (req, res) => {
  const category = req.query.category ? String(req.query.category).trim() : "";
  const search = req.query.search ? String(req.query.search).trim() : "";

  if (!search && !category) {
    res.status(400).json({
      error: "Provide either category or search query.",
      validCategories: Object.keys(CATEGORY_QUERY_MAP)
    });
    return;
  }

  if (!search && category && !CATEGORY_QUERY_MAP[category]) {
    res.status(400).json({
      error: "Unsupported category.",
      validCategories: Object.keys(CATEGORY_QUERY_MAP)
    });
    return;
  }

  const cacheKey = getCacheKey({ endpoint: "products", category, search });
  const cached = readCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const products = await fetchProductsFromFakeStore({ category, search });
    const payload = {
      source: "fakestore",
      query: search || null,
      category: category || null,
      products
    };

    writeCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    const products = fallbackProducts({ category, search });
    const payload = {
      source: "fallback",
      query: search || null,
      category: category || null,
      warning: "Fake Store API unavailable. Fallback dataset used.",
      products
    };

    writeCache(cacheKey, payload);
    res.json(payload);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`RST Store running on http://localhost:${PORT}`);
});
