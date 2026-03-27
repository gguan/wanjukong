<script setup lang="ts">
import type { CustomerAddress } from '~/composables/useAccount';

definePageMeta({ middleware: 'account-auth' });

const { logout } = useStorefrontAuth();
const { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } = useAccount();

const addresses = ref<CustomerAddress[]>([]);
const loading = ref(true);
const error = ref('');

// Form state
const showForm = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const form = reactive({
  label: '',
  fullName: '',
  phone: '',
  country: 'US',
  stateOrProvince: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  isDefault: false,
});

onMounted(async () => {
  await loadAddresses();
});

async function loadAddresses() {
  loading.value = true;
  try {
    addresses.value = await listAddresses();
  } catch {
    error.value = 'Failed to load addresses.';
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.label = '';
  form.fullName = '';
  form.phone = '';
  form.country = 'US';
  form.stateOrProvince = '';
  form.city = '';
  form.addressLine1 = '';
  form.addressLine2 = '';
  form.postalCode = '';
  form.isDefault = false;
}

function openAddForm() {
  resetForm();
  editingId.value = null;
  showForm.value = true;
}

function openEditForm(addr: CustomerAddress) {
  form.label = addr.label || '';
  form.fullName = addr.fullName;
  form.phone = addr.phone || '';
  form.country = addr.country;
  form.stateOrProvince = addr.stateOrProvince || '';
  form.city = addr.city;
  form.addressLine1 = addr.addressLine1;
  form.addressLine2 = addr.addressLine2 || '';
  form.postalCode = addr.postalCode || '';
  form.isDefault = addr.isDefault;
  editingId.value = addr.id;
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
  error.value = '';
}

async function handleSubmit() {
  error.value = '';
  if (!form.fullName.trim() || !form.country.trim() || !form.city.trim() || !form.addressLine1.trim()) {
    error.value = 'Full name, country, city, and address are required.';
    return;
  }

  saving.value = true;
  try {
    const data = {
      label: form.label || undefined,
      fullName: form.fullName,
      phone: form.phone || undefined,
      country: form.country,
      stateOrProvince: form.stateOrProvince || undefined,
      city: form.city,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2 || undefined,
      postalCode: form.postalCode || undefined,
      isDefault: form.isDefault,
    };

    if (editingId.value) {
      await updateAddress(editingId.value, data);
    } else {
      await createAddress(data);
    }

    showForm.value = false;
    editingId.value = null;
    await loadAddresses();
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to save address.';
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm('Delete this address?')) return;
  try {
    await deleteAddress(id);
    await loadAddresses();
  } catch {
    error.value = 'Failed to delete address.';
  }
}

async function handleSetDefault(id: string) {
  try {
    await setDefaultAddress(id);
    await loadAddresses();
  } catch {
    error.value = 'Failed to set default address.';
  }
}

async function handleLogout() {
  await logout();
  navigateTo('/login');
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">My Account</h1>

    <div class="account-layout">
      <nav class="account-sidebar">
        <NuxtLink to="/account" class="nav-item">Profile</NuxtLink>
        <NuxtLink to="/account/addresses" class="nav-item active">Addresses</NuxtLink>
        <NuxtLink to="/account/orders" class="nav-item">Orders</NuxtLink>
        <button class="nav-item nav-logout" @click="handleLogout">Logout</button>
      </nav>

      <div class="account-main">
        <div class="section-header">
          <h2 class="section-title">Saved Addresses</h2>
          <button v-if="!showForm" class="add-btn" @click="openAddForm">Add Address</button>
        </div>

        <!-- Address Form -->
        <div v-if="showForm" class="address-form-card">
          <h3 class="form-title">{{ editingId ? 'Edit Address' : 'New Address' }}</h3>
          <form class="address-form" @submit.prevent="handleSubmit">
            <div class="field">
              <label class="field-label">Label (e.g. Home, Office)</label>
              <input v-model="form.label" type="text" class="field-input" placeholder="Home" />
            </div>
            <div class="field">
              <label class="field-label">Full name *</label>
              <input v-model="form.fullName" type="text" class="field-input" placeholder="Jane Doe" />
            </div>
            <div class="field">
              <label class="field-label">Phone</label>
              <input v-model="form.phone" type="tel" class="field-input" placeholder="+1 555 000 0000" />
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field-label">Country *</label>
                <select v-model="form.country" class="field-input field-select">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="CN">China</option>
                  <option value="JP">Japan</option>
                  <option value="KR">South Korea</option>
                  <option value="SG">Singapore</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">State / Province</label>
                <input v-model="form.stateOrProvince" type="text" class="field-input" placeholder="CA" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field-label">City *</label>
                <input v-model="form.city" type="text" class="field-input" placeholder="Los Angeles" />
              </div>
              <div class="field">
                <label class="field-label">Postal code</label>
                <input v-model="form.postalCode" type="text" class="field-input" placeholder="90210" />
              </div>
            </div>
            <div class="field">
              <label class="field-label">Address line 1 *</label>
              <input v-model="form.addressLine1" type="text" class="field-input" placeholder="123 Main St" />
            </div>
            <div class="field">
              <label class="field-label">Address line 2</label>
              <input v-model="form.addressLine2" type="text" class="field-input" placeholder="Apt 4B" />
            </div>
            <label class="checkbox-label">
              <input v-model="form.isDefault" type="checkbox" class="checkbox-input" />
              <span>Set as default address</span>
            </label>

            <p v-if="error" class="form-error">{{ error }}</p>

            <div class="form-actions">
              <button type="submit" class="save-btn" :disabled="saving">
                {{ saving ? 'Saving...' : (editingId ? 'Update Address' : 'Save Address') }}
              </button>
              <button type="button" class="cancel-btn" @click="cancelForm">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Address List -->
        <div v-if="loading" class="loading-state">Loading addresses...</div>

        <div v-else-if="addresses.length === 0 && !showForm" class="empty-state">
          <p>No saved addresses yet.</p>
        </div>

        <div v-else-if="!showForm" class="address-list">
          <div v-for="addr in addresses" :key="addr.id" class="address-card">
            <div class="address-header">
              <span class="address-label">{{ addr.label || 'Address' }}</span>
              <span v-if="addr.isDefault" class="default-badge">Default</span>
            </div>
            <div class="address-body">
              <p>{{ addr.fullName }}</p>
              <p>{{ addr.addressLine1 }}</p>
              <p v-if="addr.addressLine2">{{ addr.addressLine2 }}</p>
              <p>{{ addr.city }}<span v-if="addr.stateOrProvince">, {{ addr.stateOrProvince }}</span> {{ addr.postalCode }}</p>
              <p>{{ addr.country }}</p>
              <p v-if="addr.phone" class="address-phone">{{ addr.phone }}</p>
            </div>
            <div class="address-actions">
              <button class="action-btn" @click="openEditForm(addr)">Edit</button>
              <button v-if="!addr.isDefault" class="action-btn" @click="handleSetDefault(addr.id)">Set Default</button>
              <button class="action-btn action-delete" @click="handleDelete(addr.id)">Delete</button>
            </div>
          </div>
        </div>

        <p v-if="error && !showForm" class="form-error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
  align-items: start;
}

.account-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.nav-item {
  display: block;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #555;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.1s;
}

.nav-item:hover {
  background: #f9fafb;
  color: #111;
}

.nav-item.active {
  background: #f3f4f6;
  color: #111;
  font-weight: 600;
}

.nav-logout {
  color: #b91c1c;
  border-top: 1px solid #e5e7eb;
}

.nav-logout:hover {
  background: #fef2f2;
  color: #991b1b;
}

.account-main {
  min-width: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: #111;
}

.add-btn {
  padding: 8px 18px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.add-btn:hover {
  background: #333;
}

/* Address Form */
.address-form-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
}

.form-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 18px;
  color: #111;
}

.address-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
}

.field-input {
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 0.9rem;
  color: #111;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #111;
}

.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #555;
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.save-btn {
  padding: 10px 20px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.save-btn:hover:not(:disabled) {
  background: #333;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 10px 20px;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.88rem;
  color: #555;
  cursor: pointer;
  font-family: inherit;
}

.cancel-btn:hover {
  border-color: #111;
  color: #111;
}

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

/* Address List */
.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.address-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111;
}

.default-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 4px;
  font-weight: 500;
}

.address-body p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #555;
}

.address-phone {
  margin-top: 4px;
  color: #888 !important;
  font-size: 0.82rem !important;
}

.address-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.action-btn {
  background: none;
  border: none;
  font-size: 0.82rem;
  color: #555;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.action-btn:hover {
  color: #111;
}

.action-delete {
  color: #b91c1c;
}

.action-delete:hover {
  color: #991b1b;
}

@media (max-width: 768px) {
  .account-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .account-sidebar {
    flex-direction: row;
    overflow-x: auto;
  }

  .nav-item {
    white-space: nowrap;
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .nav-logout {
    border-top: none;
    border-left: 1px solid #e5e7eb;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
