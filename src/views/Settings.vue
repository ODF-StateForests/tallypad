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


          <section class="p-6 space-y-4 border-t border-[var(--border-color)]">
            <h2 class="text-lg font-bold">Permissions & UI</h2>
            <div class="space-y-3">
              <div class="flex flex-col gap-2 p-3 bg-[var(--cell-bg)] rounded-md border border-[var(--border-color)]">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">Max Wake Lock Duration (minutes)</span>
                  <span class="text-xs opacity-60">Automatically release screen lock after this duration to prevent battery drain.</span>
                </div>
                <input 
                  type="number" 
                  v-model.number="store.maxWakeLockTime.value" 
                  placeholder="Enter minutes..." 
                  min="1"
                  class="p-3 bg-[var(--cell-bg)] border border-[var(--border-color)] rounded-md focus:border-[var(--accent)] outline-none text-sm"
                />
              </div>

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

      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useAppStore } from '../stores/appStore';

  const store = useAppStore();
</script>
