<script setup lang="ts">
definePageMeta({ middleware: 'account-auth' });

const { logout } = useStorefrontAuth();
const { getProfile, updateProfile } = useAccount();

const profile = ref<{
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
} | null>(null);

const loading = ref(true);
const editing = ref(false);
const saving = ref(false);
const error = ref('');
const editName = ref('');
const editPhone = ref('');

onMounted(async () => {
  try {
    profile.value = await getProfile();
  } catch {
    error.value = 'Failed to load profile.';
  } finally {
    loading.value = false;
  }
});

function startEdit() {
  editName.value = profile.value?.name || '';
  editPhone.value = profile.value?.phone || '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  error.value = '';
}

async function saveProfile() {
  saving.value = true;
  error.value = '';
  try {
    await updateProfile({
      name: editName.value || undefined,
      phone: editPhone.value || undefined,
    });
    profile.value = await getProfile();
    editing.value = false;
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to update profile.';
  } finally {
    saving.value = false;
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
        <NuxtLink to="/account" class="nav-item active">Profile</NuxtLink>
        <NuxtLink to="/account/addresses" class="nav-item">Addresses</NuxtLink>
        <NuxtLink to="/account/orders" class="nav-item">Orders</NuxtLink>
        <button class="nav-item nav-logout" @click="handleLogout">Logout</button>
      </nav>

      <div class="account-main">
        <div v-if="loading" class="loading-state">Loading profile...</div>

        <div v-else-if="profile" class="profile-card">
          <div class="card-header">
            <h2 class="card-title">Profile Information</h2>
            <button v-if="!editing" class="edit-btn" @click="startEdit">Edit</button>
          </div>

          <template v-if="!editing">
            <div class="profile-rows">
              <div class="profile-row">
                <span class="row-label">Email</span>
                <span class="row-value">
                  {{ profile.email }}
                  <span v-if="profile.emailVerifiedAt" class="verified-badge">Verified</span>
                  <span v-else class="unverified-badge">Not verified</span>
                </span>
              </div>
              <div class="profile-row">
                <span class="row-label">Name</span>
                <span class="row-value">{{ profile.name || '---' }}</span>
              </div>
              <div class="profile-row">
                <span class="row-label">Phone</span>
                <span class="row-value">{{ profile.phone || '---' }}</span>
              </div>
              <div class="profile-row">
                <span class="row-label">Member since</span>
                <span class="row-value">{{ new Date(profile.createdAt).toLocaleDateString() }}</span>
              </div>
            </div>
          </template>

          <template v-else>
            <form class="edit-form" @submit.prevent="saveProfile">
              <div class="profile-row">
                <span class="row-label">Email</span>
                <span class="row-value">{{ profile.email }}</span>
              </div>
              <div class="field">
                <label class="field-label">Name</label>
                <input v-model="editName" type="text" class="field-input" placeholder="Your name" />
              </div>
              <div class="field">
                <label class="field-label">Phone</label>
                <input v-model="editPhone" type="tel" class="field-input" placeholder="+1 555 000 0000" />
              </div>
              <p v-if="error" class="form-error">{{ error }}</p>
              <div class="edit-actions">
                <button type="submit" class="save-btn" :disabled="saving">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button type="button" class="cancel-btn" @click="cancelEdit">Cancel</button>
              </div>
            </form>
          </template>
        </div>

        <p v-if="error && !editing" class="form-error">{{ error }}</p>
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

.profile-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: #111;
}

.edit-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 0.82rem;
  color: #555;
  cursor: pointer;
  font-family: inherit;
}

.edit-btn:hover {
  border-color: #111;
  color: #111;
}

.profile-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.profile-row:last-child {
  border-bottom: none;
}

.row-label {
  font-size: 0.85rem;
  color: #888;
}

.row-value {
  font-size: 0.9rem;
  color: #111;
  display: flex;
  align-items: center;
  gap: 8px;
}

.verified-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 4px;
  font-weight: 500;
}

.unverified-badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-weight: 500;
}

.edit-form {
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

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.edit-actions {
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
}
</style>
