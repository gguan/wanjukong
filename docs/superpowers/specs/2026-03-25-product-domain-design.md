# Product Domain Redesign

Date: 2026-03-25

## Context

The current product domain mixes two different concepts:

- `Product` as the shared storefront entity
- `ProductVariant` as the sellable edition

After variants were introduced, several commercial fields remained on both models. That creates conflicting sources of truth for price, stock, availability, and preorder behavior.

This redesign adopts the confirmed business rules:

- Variants under the same product share the same sale mode and preorder schedule
- Each variant has independent stock
- Variants do not have independent publish status
- Variants with zero stock stay visible on the product page but cannot be purchased
- Product-level `SOLD_OUT` is derived automatically when all variants have zero stock
- `PREORDER` is derived automatically only while the current time is inside the preorder window
- After preorder ends, operations manually switch the product to `IN_STOCK`
- `COMING_SOON` is removed as a stored field

## Goals

- Establish a single source of truth for shared product sale rules
- Keep variant responsibilities focused on edition-specific differences
- Remove duplicated commercial fields that can drift out of sync
- Make storefront state derived from deterministic rules instead of partially manual flags
- Simplify admin behavior and reduce invalid states

## Non-Goals

- No separate materialized read model for storefront listing
- No variant-level publish workflow
- No automatic transition from preorder to in-stock after preorder ends

## Domain Model

### Product

`Product` owns all shared information:

- identity and display: `name`, `slug`, `description`, `brandId`, `categoryId`, `scale`
- storefront visibility: `status`
- shared selling mode: `saleType`
- shared preorder schedule: `preorderStartAt`, `preorderEndAt`
- shared shipping estimate: `estimatedShipAt`
- shared media: primary cover image and image gallery

`Product.status` remains the visibility switch:

- `DRAFT`: hidden
- `ACTIVE`: visible
- `INACTIVE`: hidden

`Product.saleType` becomes the only persisted selling-mode field:

- `IN_STOCK`
- `PREORDER`

### ProductVariant

`ProductVariant` owns edition-specific data only:

- `name`
- `sku`
- `priceCents`
- `stock`
- `subtitle`
- `specSummary`
- `specifications`
- `weightGrams`
- `coverImageUrl`
- `isDefault`
- `sortOrder`

Variants do not own independent availability or publish status.

## Fields To Remove

### Remove from `Product`

- `price`
- `stock`
- `availability`

### Remove from `ProductVariant`

- `availabilityType`
- `status`
- `estimatedShipAt`

## Derived Storefront State

Storefront availability must be computed, not manually stored.

### Product visibility

- If `product.status != ACTIVE`, the product is hidden from public listing and detail APIs

### Variant purchasability

A variant is purchasable only if:

1. the product is visible
2. the product is currently in a purchasable sale phase
3. the variant has enough stock for the requested quantity

### Product display availability

`displayAvailability` is derived using product-level rules plus aggregate variant stock:

1. If all variants have `stock = 0`, the product displays as `SOLD_OUT`
2. Else if `saleType = PREORDER` and current time is within the preorder window, display `PREORDER`
3. Else if `saleType = IN_STOCK`, display `IN_STOCK`
4. Else the product is visible but not purchasable yet

Window boundaries:

- preorder is active only while current time is within `[preorderStartAt, preorderEndAt]`
- if preorder dates are incomplete or outside the window, the product is not automatically purchasable as preorder

### Special cases

- Before preorder starts: visible but not purchasable
- After preorder ends and `saleType` is still `PREORDER`: visible but not purchasable
- Variant stock `0`: still shown in selector, but disabled

## API Design

### Public product list/detail

Public APIs should stop exposing database fields as storefront truth when those fields are no longer persisted.

Recommended response additions:

- `displayAvailability`
- `isPurchasable`
- per-variant `isPurchasable`
- per-variant `isSoldOut`

Recommended response behavior:

- include all variants for active products
- do not filter variants by variant status, because variant status is removed
- preserve disabled variants in the payload so the frontend can render them

### Order creation

`createBuyNow` must validate using product-level sale rules and variant-level stock:

1. load product and variant
2. require `product.status = ACTIVE`
3. compute whether the product is currently purchasable:
   - `saleType = IN_STOCK`, or
   - `saleType = PREORDER` and current time is within the preorder window
4. reject if the selected variant has insufficient stock
5. create order using variant price
6. decrement only variant stock

### Concurrency protection

Stock deduction must use a guarded write to avoid overselling:

- use conditional update semantics such as `updateMany` with `stock >= quantity`
- fail the order if no rows were updated

Do not rely on read-then-decrement without a guarded condition.

## Admin Design

### Product form

Keep only shared fields on the product editor:

- name
- slug
- brand
- category
- scale
- description
- status
- saleType
- preorderStartAt
- preorderEndAt
- estimatedShipAt
- shared images

Remove from the product editor:

- product-level price
- product-level stock
- product-level availability

### Variant manager

Keep only edition-specific fields:

- name
- sku
- priceCents
- stock
- subtitle
- specSummary
- specifications
- coverImageUrl
- isDefault
- sortOrder

Remove from variant editor:

- variant status
- variant availability
- variant estimated ship date

### Product creation

The backend should create the initial default variant in the same transaction as product creation.

Do not rely on the admin frontend to:

1. create the product
2. then make a second API call to create the default variant

That flow can leave invalid products behind if the second request fails.

## Image Model

`ProductImage` remains the source of truth for the gallery.

`Product.imageUrl` may remain temporarily as a synchronized primary-image cache, but it must not be edited independently in the admin form.

Rules:

- primary image is controlled only through `ProductImage`
- `Product.imageUrl` is updated only by image-management logic
- old single-image upload paths should be removed or converted to the gallery flow

## Database Constraints

Add database-level guarantees for invariants currently enforced only in application code:

- at most one default variant per product
- at most one primary image per product

Recommended approach:

- partial unique index on default variant flag by `productId`
- partial unique index on primary image flag by `productId`

## Migration Plan

### Phase 1: behavioral migration

- switch service logic to derived storefront state
- stop using `Product.availability` in public API and frontend
- stop using `ProductVariant.availabilityType` and `ProductVariant.status`
- remove obsolete admin form inputs
- move default-variant creation into backend transaction
- update order validation to product-level sale rules plus variant stock

This phase should preserve compatibility where needed while removing old writes.

### Phase 2: schema cleanup

- migrate any needed data from old fields
- drop unused columns:
  - `Product.price`
  - `Product.stock`
  - `Product.availability`
  - `ProductVariant.availabilityType`
  - `ProductVariant.status`
  - `ProductVariant.estimatedShipAt`
- add database constraints for default variant and primary image uniqueness

## Frontend Behavior

### Product card

- price should come from the default variant, or the lowest-priced variant if no explicit default is available
- availability badge should come from derived `displayAvailability`

### Product detail

- render all variants
- disable variants whose stock is `0`
- keep sold-out variants visible
- use product-level derived sale state for purchase button availability

### Checkout

- selection must fail fast for a sold-out variant
- unit price always comes from the selected variant
- sale-phase messaging comes from the product-level derived state

## Testing Strategy

Add tests for:

- product visible, in stock, at least one variant with stock
- product visible, preorder window active
- product visible, preorder window not yet started
- product visible, preorder window ended but sale type still preorder
- all variants sold out causing derived `SOLD_OUT`
- a single variant sold out while others remain purchasable
- concurrent orders against the same variant stock
- backend transactional creation of product plus default variant

## Open Questions Resolved

- Sale mode is shared at product level
- Stock is independent per variant
- Variants do not have independent publish status
- Zero-stock variants remain visible but disabled
- `SOLD_OUT` is derived from aggregate variant stock
- `COMING_SOON` is removed as a stored field
- Preorder becomes active automatically only while inside the preorder window
- Transition from preorder to in-stock after preorder ends is manual

## Recommended Implementation Order

1. Refactor domain rules in services and serializers
2. Update admin UI to match the new ownership boundaries
3. Update storefront UI to consume derived availability
4. Move product creation and default variant creation into one backend transaction
5. Add guarded stock decrement in orders
6. Remove obsolete columns in a cleanup migration
