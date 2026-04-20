<script setup lang="ts">
useSeoMeta({
  title: 'FAQ — OVER REALM',
  description: 'Frequently asked questions about ordering, shipping and products at OVER REALM.',
})

interface FaqItem {
  q: string
  a: string
}

interface FaqGroup {
  title: string
  items: FaqItem[]
}

// TODO: Replace with your real copy — every `a` is a placeholder.
const groups: FaqGroup[] = [
  {
    title: 'Orders & Payment',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept PayPal for all orders. PayPal supports payment by credit card, debit card, or PayPal balance.',
      },
      {
        q: 'Is my payment secure?',
        a: 'All payments are processed through PayPal\'s secure gateway. We never see or store your card details.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'Orders in UNPAID status can be cancelled from your account. Paid orders can be modified within 24 hours — contact support with your order number.',
      },
      {
        q: 'How do I track my order?',
        a: 'Once your order ships, you will receive a tracking number by email. You can also view order status in your account dashboard.',
      },
    ],
  },
  {
    title: 'Shipping',
    items: [
      {
        q: 'Do you ship internationally?',
        a: 'Yes. We ship internationally, and available shipping options, rates, and delivery estimates vary by destination and product type. See our Shipping page for details.',
      },
      {
        q: 'How long does delivery take?',
        a: 'Typical transit times range from 5 to 16 business days for most major regions, with longer timelines for remote destinations or customs delays. The product page and shipping policy show the current estimate.',
      },
      {
        q: 'What about customs duties?',
        a: 'Any import duties or taxes are the buyer\'s responsibility and not included in the item price.',
      },
    ],
  },
  {
    title: 'Pre-Orders',
    items: [
      {
        q: 'What is a pre-order?',
        a: 'Pre-orders let you reserve a figure before it\'s manufactured and shipped. You pay a deposit up front, and the balance before the item ships. Estimated ship dates are shown on each product page.',
      },
      {
        q: 'Can I cancel a pre-order?',
        a: 'You can usually cancel a pre-order within 24 hours for a full refund. After that, a reasonable non-refundable reservation fee may apply once allocation or production has been committed. See our Shipping page for full details.',
      },
      {
        q: 'When do I pay the balance?',
        a: 'We\'ll email you when the item arrives at our warehouse. Once the balance is paid, we ship within 3–5 business days.',
      },
      {
        q: 'What if the release date is delayed?',
        a: 'Manufacturer delays happen. We pass on the new estimated date as soon as we receive it. If the delay is significant, we\'ll reach out directly.',
      },
    ],
  },
  {
    title: 'Products',
    items: [
      {
        q: 'What does 1/6, 1/4, 1/12 scale mean?',
        a: 'Scale refers to the figure\'s size relative to a real human. 1/6 scale figures are approximately 30cm tall, 1/4 scale are around 45cm, and 1/12 scale are approximately 15cm.',
      },
      {
        q: 'Are the figures authentic?',
        a: 'Every item is sourced directly from the manufacturer or an authorized distributor. All figures are brand new in original factory-sealed packaging.',
      },
      {
        q: 'Do you sell used or opened figures?',
        a: 'No. All figures sold are brand new and unopened.',
      },
      {
        q: 'Are your products toys for children?',
        a: 'Most products are collectible display items intended for older teens or adults unless the product page clearly states otherwise. Always check the item listing and our Returns page for age guidance and safety warnings.',
      },
    ],
  },
  {
    title: 'Returns',
    items: [
      {
        q: 'What is your return policy?',
        a: 'Most unused items may be returned within 14 days of delivery. Damaged, incorrect, or incomplete orders can be reported within 30 days, and manufacturing defects are covered by our limited warranty. See our Returns page for the full policy.',
      },
      {
        q: 'What if my figure arrives damaged?',
        a: 'Email us at support@overrealm.shop within 30 days of delivery with photos of the parcel, packaging, and issue. We will review the claim and offer an appropriate remedy if it is approved.',
      },
    ],
  },
]

// Expand-state by `${groupIndex}-${itemIndex}` key.
const open = reactive<Record<string, boolean>>({})

function toggle(gi: number, ii: number) {
  const key = `${gi}-${ii}`
  open[key] = !open[key]
}

function isOpen(gi: number, ii: number) {
  return !!open[`${gi}-${ii}`]
}
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Help</p>
      <h1 class="info-title">Frequently asked.</h1>
      <p class="info-lede">
        Straight answers to the most common questions. Can't find what you're looking for?
        <NuxtLink to="/contact" class="lede-link">Get in touch →</NuxtLink>
      </p>
    </header>

    <div class="faq-layout">
      <nav class="faq-nav">
        <p class="nav-label">Categories</p>
        <ul class="nav-list">
          <li v-for="(g, gi) in groups" :key="g.title">
            <a :href="`#group-${gi}`">{{ g.title }}</a>
          </li>
        </ul>
      </nav>

      <div class="faq-body">
        <section
          v-for="(group, gi) in groups"
          :id="`group-${gi}`"
          :key="group.title"
          class="faq-group"
        >
          <h2 class="group-title">{{ group.title }}</h2>
          <div class="faq-list">
            <div
              v-for="(item, ii) in group.items"
              :key="item.q"
              class="faq-item"
              :class="{ 'faq-item--open': isOpen(gi, ii) }"
            >
              <button
                type="button"
                class="faq-q"
                :aria-expanded="isOpen(gi, ii)"
                @click="toggle(gi, ii)"
              >
                <span>{{ item.q }}</span>
                <span class="faq-chevron" aria-hidden="true">+</span>
              </button>
              <div v-show="isOpen(gi, ii)" class="faq-a">
                <p>{{ item.a }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.info {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 8vw;
}

.info-hero {
  margin-bottom: 64px;
  max-width: 780px;
}

.info-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 20px;
}

.info-title {
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 28px;
  color: #0a0a0a;
}

.info-lede {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #444;
  margin: 0;
}

.lede-link {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
  margin-left: 4px;
}

.faq-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 72px;
  align-items: start;
}

/* ─── Sidebar nav ──────────────────────────────────── */
.faq-nav {
  position: sticky;
  top: 100px;
}

.nav-label {
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #999;
  margin: 0 0 16px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-list a {
  font-size: 0.9rem;
  color: #555;
  text-decoration: none;
  transition: color 0.15s;
}

.nav-list a:hover {
  color: #0a0a0a;
}

/* ─── FAQ groups ──────────────────────────────────── */
.faq-body {
  min-width: 0;
}

.faq-group {
  margin-bottom: 64px;
  scroll-margin-top: 80px;
}

.group-title {
  font-size: 0.8rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #888;
  font-weight: 500;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.faq-list {
  /* no extra chrome */
}

.faq-item {
  border-bottom: 1px solid #eee;
}

.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 24px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  color: #0a0a0a;
  text-align: left;
  transition: color 0.15s;
}

.faq-q:hover {
  color: #555;
}

.faq-chevron {
  font-size: 1.3rem;
  font-weight: 300;
  color: #999;
  transition: transform 0.2s;
  flex-shrink: 0;
  margin-left: 16px;
}

.faq-item--open .faq-chevron {
  transform: rotate(45deg);
  color: #0a0a0a;
}

.faq-a {
  padding: 0 0 24px;
  max-width: 640px;
}

.faq-a p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #555;
}

/* ─── Responsive ──────────────────────────────────── */
@media (max-width: 900px) {
  .faq-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .faq-nav {
    position: static;
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .faq-group {
    margin-bottom: 48px;
  }
}
</style>
