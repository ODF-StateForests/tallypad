<template>
  <div id="app-inner" :class="{ 'dark-mode': store.isDarkMode.value }">
    <header class="p-2 border-b-2 flex items-center" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--header-bg)' }">
      <div @click="store.goToPreviousView()" class="m-0 pr-4 cursor-pointer text-md">
        <icon-fa-arrow-left />
      </div>
      <div class="flex flex-col items-center">
        <h1 class="text-md font-bold">Settings</h1>
      </div>
      <div class="w-6"></div> <!-- Spacer -->
    </header>

    <div class=" overflow-y-auto">
      <div :class="{ 'max-w-1/2': !store.isMobile.value, 'max-w-100': store.isMobile.value}">
        <div class="flex-1 p-6 space-y-6">
          <section class="space-y-4">
            <div class="flex flex-col gap-2">
              <label class="text-xs opacity-60">User Name<span v-show="store.esriToken.value !== null"> (From AGOL)</span></label>
              <input 
                v-model="store.userName.value" 
                placeholder="Enter name..." 
                class="p-3 bg-[var(--cell-bg)] border border-[var(--border-color)] rounded-md focus:border-[var(--accent)] outline-none"
                :disabled="store.esriToken.value !== null"
              />
            </div>
          </section>

          <section class="space-y-4">
            <h2 class="text-lg font-bold">Database</h2>
            <button @click="exportDB()" class="w-full py-2 border rounded-md font-bold cursor-pointer bg-[var(--cell-bg)] border-[var(--border-color)] hover:bg-[var(--btn-bg)]">
              Export Plot Data
            </button>
            <button @click="importDB()" class="w-full py-2 border rounded-md font-bold cursor-pointer bg-[var(--cell-bg)] border-[var(--border-color)] hover:bg-[var(--btn-bg)]">
              Import Plot Data
            </button>
            <hr class="border-red-500">
            <button @click="wipeDB()" class="w-full py-2 border border-red-500 text-red-500 rounded-md font-bold cursor-pointer hover:bg-red-500/10">
              Wipe Local Database
            </button>
          </section>

          <section class="p-6 space-y-4 border-t border-[var(--border-color)]">
            <h2 class="text-lg font-bold">Permissions & UI</h2>
            <div class="space-y-3">
              <label class="flex items-center gap-3 cursor-pointer p-3 bg-[var(--cell-bg)] rounded-md border border-[var(--border-color)]">
                <input 
                  type="checkbox" 
                  :checked="store.allowAddPlots.value" 
                  class="h-5 w-5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  @change="store.toggleAllowAddPlots()"
                />
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Allow Adding Plots</span>
                  <span class="text-xs opacity-60">Enable the "Add Plot" button on the main dashboard.</span>
                </div>
              </label>

              <label class="flex items-center gap-3 cursor-pointer p-3 bg-[var(--cell-bg)] rounded-md border border-[var(--border-color)]">
                <input 
                  type="checkbox" 
                  :checked="store.allowAddVisits.value" 
                  class="h-5 w-5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  @change="store.toggleAllowAddVisits()"
                />
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Allow Adding Visits</span>
                  <span class="text-xs opacity-60">Enable the "Add Visit" button on plot cards and details.</span>
                </div>
              </label>

              <label class="flex items-center gap-3 cursor-pointer p-3 bg-[var(--cell-bg)] rounded-md border border-[var(--border-color)]">
                <input 
                  type="checkbox" 
                  :checked="store.allowDropVisits.value" 
                  class="h-5 w-5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  @change="store.toggleAllowDropVisits()"
                />
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Allow Deleting Visits</span>
                  <span class="text-xs opacity-60">Enable the "Delete Visit" button in plot details.</span>
                </div>
              </label>
            </div>
          </section>
        </div>

        <!-- Export Dialog Modal -->
        <div v-if="showExportDialog" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg w-full max-w-md p-6 flex flex-col max-h-[80vh]">
            <h3 class="text-lg font-bold mb-4">Select Plots to Export</h3>
            
            <div class="flex items-center gap-2 pb-2 mb-3 border-b border-[var(--border-color)]">
              <input 
                type="checkbox" 
                id="selectAll" 
                :checked="isAllSelected" 
                @change="toggleSelectAll"
                class="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <label for="selectAll" class="font-semibold cursor-pointer select-none">Select All</label>
            </div>

            <div class="flex-1 overflow-y-auto space-y-2 pr-1">
              <div v-for="plot in availablePlots" :key="plot.guid" class="flex items-center gap-2 py-1">
                <input 
                  type="checkbox" 
                  :id="plot.guid" 
                  :value="plot.guid"
                  v-model="selectedPlots"
                  class="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                />
                <label :for="plot.guid" class="cursor-pointer select-none">{{ plot.plotid }}</label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button @click="showExportDialog = false" class="flex-1 py-2 border border-[var(--border-color)] rounded-md font-bold hover:bg-[var(--btn-bg)] transition-colors cursor-pointer">
                Cancel
              </button>
              <button @click="confirmExport" :disabled="selectedPlots.length === 0" class="flex-1 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                Export ({{ selectedPlots.length }})
              </button>
            </div>
          </div>
        </div>

        <!-- Import Dialog Modal -->
        <div v-if="showImportDialog" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg w-full max-w-md p-6 flex flex-col">
            <h3 class="text-lg font-bold mb-2">Import Database</h3>
            <p class="text-sm opacity-80 mb-6">Choose how you want to import the JSON file.</p>
            
            <div class="space-y-3">
              <button @click="triggerImport('update')" class="w-full py-3 bg-[var(--btn-bg)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border-color)] rounded-md font-bold transition-all text-left px-4 flex flex-col cursor-pointer">
                <span class="text-base font-bold">Update (Merge)</span>
                <span class="text-xs opacity-75 font-normal mt-1">Updates existing plots and adds new ones without wiping current data.</span>
              </button>
              
              <button @click="triggerImport('replace')" class="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded-md font-bold transition-all text-left px-4 flex flex-col cursor-pointer">
                <span class="text-base font-bold">Replace (Wipe & Clean Import)</span>
                <span class="text-xs opacity-75 font-normal mt-1">Wipes the entire database first, then does a clean import of the file contents.</span>
              </button>
            </div>

            <div class="flex gap-3 mt-6">
              <button @click="showImportDialog = false" class="w-full py-2 border border-[var(--border-color)] rounded-md font-bold hover:bg-[var(--btn-bg)] transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useAppStore } from '../stores/appStore';
  import { renewDatabase, exportDatabase, importDatabase, db } from '../db';

  const store = useAppStore();

  const showExportDialog = ref(false);
  const showImportDialog = ref(false);
  const availablePlots = ref<{ guid: string; plotid: string }[]>([]);
  const selectedPlots = ref<string[]>([]);

  const isAllSelected = computed(() => {
    return availablePlots.value.length > 0 && selectedPlots.value.length === availablePlots.value.length;
  });

  const toggleSelectAll = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      selectedPlots.value = availablePlots.value.map(p => p.guid);
    } else {
      selectedPlots.value = [];
    }
  };

  const exportDB = async () => {
    availablePlots.value = await db.plots.orderBy('plotid').toArray();
    selectedPlots.value = availablePlots.value.map(p => p.guid);
    showExportDialog.value = true;
  };

  const confirmExport = async () => {
    showExportDialog.value = false;
    await exportDatabase(selectedPlots.value);
  };

  const importDB = () => {
    showImportDialog.value = true;
  };

  const triggerImport = (mode: 'replace' | 'update') => {
    showImportDialog.value = false;
    if (mode === 'replace') {
      if (!confirm('Importing will replace all existing data. Are you sure you want to import?')) {
        return;
      }
      if (!confirm('Click OK to confirm database replacement (this will clear all tables first).')) {
        return;
      }
    }
    importDatabase(mode);
  };

  const wipeDB = async () => {
    if (confirm('This will erase any unsaved, unsynced data. Are you sure you want to wipe the database?')) {
      if (confirm('Click OK to wipe the database.')) {
        renewDatabase();
        alert('Database wiped successfully!');
      } else {
        alert('Database wipe canceled.');
      }
    }
  };
</script>
