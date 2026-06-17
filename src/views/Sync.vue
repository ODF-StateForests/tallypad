<template>
  <div id="app-inner" :class="{ 'dark-mode': store.isDarkMode.value }">
    <header class="p-2 border-b-2 flex items-center" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--header-bg)' }">
      <div @click="store.goToPreviousView()" class="m-0 pr-4 cursor-pointer text-md">
        <icon-fa-arrow-left />
      </div>
      <div class="flex flex-col items-center">
        <h1 class="text-md font-bold">Sync & Login</h1>
      </div>
      <div class="w-6"></div> <!-- Spacer -->
    </header>

    <div class=" overflow-y-auto">
      <div :class="{ 'max-w-1/2': !store.isMobile.value, 'max-w-100': store.isMobile.value}">
        <div class="flex-1 p-6 space-y-6">
          <section class="space-y-4">
            <h2 class="text-lg font-bold">ArcGIS Online</h2>
            <div class="flex flex-col gap-2">
              <label class="text-xs opacity-60">Plot Service URL</label>
              <input 
                v-model="store.plotServiceUrl.value" 
                placeholder="Enter URL..." 
                class="p-3 bg-[var(--cell-bg)] border border-[var(--border-color)] rounded-md focus:border-[var(--accent)] outline-none"
              />
            </div>
            
            <div v-if="!store.esriToken.value" class="p-4 rounded-lg bg-[var(--btn-bg)] border border-[var(--border-color)]">
              <p class="text-sm mb-4 opacity-80">Log in using your ESRI ArcGIS Online credentials.</p>
              <button @click="login" class="w-full py-3 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors cursor-pointer">
                Login with ArcGIS
              </button>
            </div>

            <div v-else class="p-4 rounded-lg bg-[var(--btn-bg)] border border-[var(--border-color)]">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-xs opacity-60">Signed in as</p>
                  <p class="font-bold text-lg">{{ store.userName.value }}</p>
                </div>
                <div class="h-10 w-10 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center font-bold">
                  {{ store.userName.value?.charAt(0).toUpperCase() }}
                </div>
              </div>
              <button @click="store.logoutEsri()" class="w-full py-2 border border-red-500 text-red-500 rounded-md font-bold hover:bg-red-500/10 transition-colors cursor-pointer">
                Logout
              </button>
            </div>

            <button v-if="store.esriToken.value" @click="syncWithEsri()" class="w-full py-2 border border-blue-500 text-blue-500 rounded-md font-bold cursor-pointer">
              Sync Plots
            </button>

            <button 
              v-show="syncErrorCount > 0"
              @click="store.goToSyncErrors()"
              class="w-full py-2 mt-2 border border-red-500/30 text-red-500 rounded-md font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              ⚠️ View Sync Errors <span v-if="syncErrorCount > 0" class="px-2 py-0.5 text-xs bg-red-600 text-white rounded-full font-bold">{{ syncErrorCount }}</span>
            </button>
          </section>
        </div>
      </div>

      <!-- Sync Progress Dialog Modal -->
      <div v-if="isSyncing" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg w-full max-w-md p-6 flex flex-col max-h-[85vh]">
          <h3 class="text-lg font-bold mb-2 flex items-center gap-2">
            <span v-if="isSyncRunning" class="animate-spin inline-block text-blue-500">🔄</span>
            <span v-else-if="hasSyncErrors" class="text-red-500">⚠️</span>
            <span v-else class="text-green-500">✅</span>
            {{ syncTitle }}
          </h3>
          <p class="text-sm opacity-80 mb-6">{{ syncSubtitle }}</p>
          
          <div class="flex-1 overflow-y-auto space-y-3 pr-1">
            <div v-for="step in syncSteps" :key="step.key" class="flex items-start justify-between p-3 rounded-md border border-[var(--border-color)] bg-[var(--cell-bg)] border-collapse">
              <div class="flex flex-col">
                <span class="font-bold text-sm capitalize">{{ step.label }}</span>
                <span v-if="syncProgressMap[step.key].message" class="text-xs text-red-500 mt-1">
                  {{ syncProgressMap[step.key].message }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="syncProgressMap[step.key].status === 'pending'" class="text-xs px-2 py-1 bg-gray-500/10 text-gray-500 rounded border border-gray-500/20 font-semibold">Pending</span>
                <span v-else-if="syncProgressMap[step.key].status === 'syncing'" class="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 font-semibold animate-pulse">Syncing...</span>
                <span v-else-if="syncProgressMap[step.key].status === 'completed'" class="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded border border-green-500/20 font-semibold">✓ Done</span>
                <span v-else-if="syncProgressMap[step.key].status === 'failed'" class="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 font-semibold">✗ Failed</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button 
              @click="closeSyncDialog" 
              :disabled="isSyncRunning"
              class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
            >
              {{ isSyncRunning ? 'Syncing...' : 'Close' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useAppStore } from '../stores/appStore';
  import { syncAll, SyncStep, SyncStatus } from '../sync_agol';
  import { db } from '../db';

  const store = useAppStore();

  const isSyncing = ref(false);
  const isSyncRunning = ref(false);
  const syncErrorCount = ref(0);

  const syncProgressMap = ref<Record<SyncStep, { status: SyncStatus; message?: string }>>({
    plots: { status: 'pending' },
    gps_points: { status: 'pending' },
    visits: { status: 'pending' },
    trees: { status: 'pending' },
    measurements: { status: 'pending' },
    lookups: { status: 'pending' },
    edits: { status: 'pending' },
  });

  const syncSteps = [
    { key: 'plots', label: 'plots' },
    { key: 'gps_points', label: 'gps points' },
    { key: 'visits', label: 'visits' },
    { key: 'trees', label: 'trees' },
    { key: 'measurements', label: 'measurements' },
    { key: 'lookups', label: 'lookups' },
    { key: 'edits', label: 'edits' }
  ] as const;

  const hasSyncErrors = computed(() => {
    return Object.values(syncProgressMap.value).some(s => s.status === 'failed');
  });

  const syncTitle = computed(() => {
    if (isSyncRunning.value) return 'Syncing with ESRI ArcGIS';
    if (hasSyncErrors.value) return 'Sync Completed with Errors';
    return 'Sync Completed Successfully';
  });

  const syncSubtitle = computed(() => {
    if (isSyncRunning.value) return 'Please keep Tallypad open while we sync your records.';
    if (hasSyncErrors.value) return 'Some tables failed to sync. Review the details below.';
    return 'All local data is now synchronized with the feature service.';
  });

  const loadSyncErrorCount = async () => {
    if (db.syncErrors) {
      syncErrorCount.value = await db.syncErrors.count();
    }
  };

  const closeSyncDialog = () => {
    isSyncing.value = false;
  };

  onMounted(async () => {
    await loadSyncErrorCount();
  });

  const CLIENT_ID = import.meta.env.VITE_ESRI_CLIENT_ID; 
  const REDIRECT_URI = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/';

  const login = () => {
    const verifier = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
    localStorage.setItem('esri_code_verifier', verifier);
    const authUrl = `https://www.arcgis.com/sharing/rest/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&expiration=20160&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${verifier}&code_challenge_method=plain`;
    window.location.href = authUrl;
  };

  const syncWithEsri = async () => {
    isSyncing.value = true;
    isSyncRunning.value = true;
    
    for (const key of Object.keys(syncProgressMap.value) as SyncStep[]) {
      syncProgressMap.value[key] = { status: 'pending' };
    }

    try {
      await syncAll(store, (progress) => {
        syncProgressMap.value[progress.step] = {
          status: progress.status,
          message: progress.message
        };
      });
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      isSyncRunning.value = false;
      await loadSyncErrorCount();
    }
  };
</script>
