"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  HeartPulse,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";

type Category = "all" | "supplements" | "cycle" | "nutrition" | "movement";

const categories: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "supplements", label: "Supplements" },
  { id: "cycle", label: "Cycle care" },
  { id: "nutrition", label: "Nutrition" },
  { id: "movement", label: "Movement" },
];

const products = [
  {
    id: "inositol",
    name: "Myo-inositol support",
    category: "supplements",
    price: 899,
    rating: 4.8,
    tag: "PCOS popular",
    description: "Commonly used wellness support for insulin sensitivity and cycle regularity.",
    color: "from-rose-100 to-white",
  },
  {
    id: "omega",
    name: "Omega-3 capsules",
    category: "supplements",
    price: 649,
    rating: 4.7,
    tag: "Heart health",
    description: "Daily fatty-acid support for inflammation-aware wellness routines.",
    color: "from-sky-100 to-white",
  },
  {
    id: "tea",
    name: "Spearmint tea blend",
    category: "nutrition",
    price: 329,
    rating: 4.6,
    tag: "Hormone care",
    description: "A calming caffeine-free tea option for evening routines.",
    color: "from-teal-100 to-white",
  },
  {
    id: "seeds",
    name: "Seed cycling pack",
    category: "nutrition",
    price: 499,
    rating: 4.5,
    tag: "Daily habit",
    description: "Flax, pumpkin, sesame, and sunflower seeds portioned for simple tracking.",
    color: "from-amber-100 to-white",
  },
  {
    id: "heat-patch",
    name: "Period heat patches",
    category: "cycle",
    price: 279,
    rating: 4.8,
    tag: "Cramp relief",
    description: "Portable warmth for period cramps and lower-back discomfort.",
    color: "from-pink-100 to-white",
  },
  {
    id: "cup",
    name: "Soft menstrual cup",
    category: "cycle",
    price: 599,
    rating: 4.4,
    tag: "Reusable",
    description: "Medical-grade silicone cup for comfortable, lower-waste cycle care.",
    color: "from-violet-100 to-white",
  },
  {
    id: "mat",
    name: "Grip yoga mat",
    category: "movement",
    price: 1199,
    rating: 4.7,
    tag: "Low impact",
    description: "Supportive mat for yoga, mobility, breathing, and gentle strength sessions.",
    color: "from-emerald-100 to-white",
  },
  {
    id: "bands",
    name: "Resistance band set",
    category: "movement",
    price: 449,
    rating: 4.6,
    tag: "Strength",
    description: "Light strength training support for home PCOS-friendly movement.",
    color: "from-orange-100 to-white",
  },
] as const;

type ProductId = (typeof products)[number]["id"];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function StorePage() {
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<ProductId, number>>({} as Record<ProductId, number>);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.tag.toLowerCase().includes(query.toLowerCase());

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const cartItems = products
    .map((product) => ({ product, quantity: cart[product.id] ?? 0 }))
    .filter((item) => item.quantity > 0);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  function updateCart(productId: ProductId, change: number) {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + change);
      return { ...current, [productId]: nextQuantity };
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 text-[#172033]">
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Curated wellness store
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
            Products chosen for PCOS routines, not random shelves.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Browse cycle care, movement tools, nutrition basics, and wellness supplements with clear context. Use this as a gentle shortlist, then check what fits your body and medical plan.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "PCOS-aware picks",
              "Simple daily routines",
              "Doctor-first guidance",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-[#fffaf6] px-3 py-3 text-sm font-semibold text-slate-700">
                <Check className="h-4 w-4 text-[#35a99a]" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-100 bg-[#172033] p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-200">Your bag</p>
              <h2 className="mt-2 font-serif text-3xl">{itemCount} item{itemCount === 1 ? "" : "s"}</h2>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-rose-200">
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {cartItems.length ? (
              cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 p-3">
                  <div>
                    <p className="text-sm font-bold">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-300">
                      {quantity} x {formatPrice(product.price)}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatPrice(product.price * quantity)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                Your bag is empty. Add products to build a simple wellness routine.
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-300">Subtotal</p>
              <p className="text-2xl font-bold">{formatPrice(subtotal)}</p>
            </div>
            <button
              type="button"
              disabled={!cartItems.length}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e64b6a] px-5 text-sm font-bold text-white transition hover:bg-[#d83f5e] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-slate-400"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tea, cycle, yoga..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-[#fffaf6] pl-10 pr-4 text-sm outline-none transition focus:border-[#e64b6a] focus:bg-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`h-10 shrink-0 rounded-lg px-4 text-sm font-bold transition ${
                  category === item.id
                    ? "bg-[#172033] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:text-[#172033]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filteredProducts.map((product) => {
          const quantity = cart[product.id] ?? 0;

          return (
            <article key={product.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className={`relative h-36 bg-gradient-to-br ${product.color} p-5`}>
                <span className="inline-flex rounded-lg bg-white/80 px-3 py-1 text-xs font-bold text-[#172033] shadow-sm">
                  {product.tag}
                </span>
                <HeartPulse className="absolute bottom-4 right-4 h-10 w-10 text-[#e64b6a]/70" aria-hidden="true" />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#172033]">{product.name}</h3>
                    <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                      {product.rating}
                    </div>
                  </div>
                  <p className="shrink-0 font-bold text-[#172033]">{formatPrice(product.price)}</p>
                </div>

                <p className="mt-3 min-h-16 text-sm leading-6 text-slate-500">{product.description}</p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  {quantity > 0 ? (
                    <div className="flex h-11 items-center rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateCart(product.id, -1)}
                        className="grid h-11 w-11 place-items-center text-slate-600 hover:text-[#172033]"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCart(product.id, 1)}
                        className="grid h-11 w-11 place-items-center text-slate-600 hover:text-[#172033]"
                        aria-label={`Add another ${product.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateCart(product.id, 1)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-bold text-white transition hover:bg-[#24314c]"
                    >
                      Add
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-xl border border-rose-100 bg-rose-50 p-5">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
          <p className="text-sm leading-6 text-rose-800">
            Supplements and wellness products can interact with medications or health conditions. Aria can help you organize questions, but always confirm new supplements or treatment changes with a qualified clinician.
          </p>
        </div>
      </section>
    </div>
  );
}
