// DONE: Import-Export to JSON
// DONE: AGOL feature service sync
// TODO: Add tree count, remarks, lat-lon on the plot card
// TODO: Add stem map view with tree labels and tap to edit
// TODO: Add GPS location update
<template>
  <div id="app-inner" :class="{ 'dark-mode': store.isDarkMode.value }">
    <template v-if="store.currentView.value === 'plots'">
      <!-- Plots List View -->
      <header class="p-4 border-b-2 flex justify-between items-center" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--header-bg)' }">
        <div>
          <h1 class="text-md font-bold">Project Plots ({{ filteredPlots.length }})</h1>
          <div class="flex gap-2">
            <div class="flex">
              <input
                v-model="statusQuery"
                type="text"
                placeholder="Visit Status..."
                class="text-sm bg-transparent border-b border-[var(--border-color)] focus:border-[var(--accent)] outline-none w-full max-w-[200px] mt-1"
              />
              <button 
                v-if="statusQuery" 
                @click="statusQuery = ''" 
                class="ml-1 px-1 text-sm opacity-50 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
            <div class="flex gap-2">
              <input
                v-model="plotIdQuery"
                type="text"
                placeholder="Filter plot ID..."
                class="text-sm bg-transparent border-b border-[var(--border-color)] focus:border-[var(--accent)] outline-none w-full max-w-[200px] mt-1"
              />
              <button 
                v-if="plotIdQuery" 
                @click="plotIdQuery = ''" 
                class="ml-1 px-1 text-sm opacity-50 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        <div class="relative ml-4 gap-2 flex items-center">
          <button v-show="store.hasSyncErrors.value" class="menu-item text-xl" @click="store.goToSyncErrors()">
            <span class="menu-icon"><icon-fa-exclamation-triangle /></span>
          </button>
          <button @click="store.toggleDarkMode()" class="menu-item text-xl">
            <icon-fa-sun-o v-if="store.isDarkMode.value" class="menu-icon" />
            <icon-fa-moon-o v-else class="menu-icon" />
          </button>
          <button @click.stop="toggleMenu" class="p-2 rounded menu-item text-xl font-bold" :style="{ color: 'var(--text-primary)' }">
            <icon-fa7-solid-ellipsis-v />
          </button>
          <div v-if="isMenuOpen" class="kebab-menu" @click.stop>
            <button @click="store.toggleDarkMode()" class="menu-item">
              <icon-fa-sun-o v-if="store.isDarkMode.value" class="menu-icon" />
              <icon-fa-moon-o v-else class="menu-icon" />
              <span>{{ store.isDarkMode.value ? 'Light mode' : 'Dark mode' }}</span>
            </button>

            <button class="menu-item" @click="store.goToSettings()">
              <span class="menu-icon"><icon-fa-cog /></span>
              <span>Settings</span>
            </button>

            <button class="menu-item" @click="store.goToSync()">
              <span class="menu-icon"><icon-material-symbols-cloud-sync/></span>
              <span>Sync & Login</span>
            </button>

            <button class="menu-item" @click="store.goToLookups()">
              <span class="menu-icon"><icon-fa-wrench /></span>
              <span>Edit Lookups</span>
            </button>

            <button class="menu-item" @click="store.goToSyncErrors()">
              <span class="menu-icon"><icon-fa-exclamation-triangle /></span>
              <span>Sync Errors</span>
            </button>

            <button class="menu-item">
              <span class="menu-icon"><icon-fa-info-circle /></span>
              <span>About</span>
            </button>
            <span class="menu-item">DB Version: {{ dbVersion }}</span>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="plots.length === 0" class="flex items-center justify-center h-full text-center">
          <div>
            <p class="text-xl font-bold mb-2">No plots found</p>
            <div v-show="store.allowAddPlots.value">
              <p class="opacity-70 mb-4">Add a new project plot to get started</p>
              <button @click="addNewPlot" class="px-6 py-3 rounded bg-blue-600 text-white font-bold hover:bg-blue-700">
                ＋ Add Plot
              </button>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div
            v-for="plot in filteredPlots"
            :key="`${plot.plotid}`"
            class="plot-card"
            :style="{ backgroundColor: 'var(--cell-bg)', borderColor: 'var(--border-color)' }"
            @click.stop="store.goToPlotDetail(plot)"
            >
            <div class="w-full">
              <div class="flex justify-between">
                <div class="flex flex-col">
                  <div class="text-xs font-bold opacity-60 tracking-wide">Plot</div>
                  <span class="text-md font-bold">{{ plot.plotid }}</span>
                </div>
                <div class="flex flex-col">
                  <div class="text-xs font-bold opacity-60 tracking-wide">Coordinates</div>
                  <span class="text-md font-bold">{{ plot.coords }}</span>
                </div>
                <div class="flex flex-col items-center">
                  <div class="text-xs font-bold opacity-60 tracking-wide">Trees</div>
                  <span class="text-md font-bold">{{ plot.latestTreeCount }}</span>
                </div>
              </div>
            </div>
            <div class="flex w-full justify-between gap-2">
              <div class="flex gap-2 overflow-x-auto p-1 no-scrollbar">
                <button 
                  v-for="visit in plot.visits"
                  :key="visit.guid"
                  @click.stop="selectVisit(plot, visit)"
                  class="visit-chip">
                  V{{ visit.visit_number }}
                  {{ new Date(visit.measurement_date|| 0).toLocaleDateString()}}
                </button>
                <button 
                  v-show="store.allowAddVisits.value" 
                  @click.stop="addNewVisit(plot)"
                  class="visit-chip !bg-green-600/10 !text-green-600 !border-green-600/30 border-dashed">
                  ＋ Visit
                </button>
              </div>
              <div class="flex flex-col items-center">
                <button class="p-1 text-sm hover:opacity-100 cursor-pointer" @click.stop="waypointToPlot(plot)" title="Google Maps Location"><icon-fa-map-marker /></button>
                <button class="p-1 text-sm hover:opacity-100 cursor-pointer" @click.stop="navigateToPlot(plot)" title="Google Maps Navigation"><icon-fa-car /></button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="store.allowAddPlots.value" class="flex justify-center pt-4">
          <button @click="addNewPlot" class="nav-btn text-green-600 font-black text-2xl">
            ＋ Add Plot
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="store.currentView.value === 'plot_detail'">
      <!-- Plot Details View -->
      <PlotDetails />
    </template>

    <template v-else-if="store.currentView.value === 'trees'">
      <!-- Trees View -->
      <Trees />
    </template>

    <template v-else-if="store.currentView.value === 'settings'">
      <!-- Settings View -->
      <Settings />
    </template>

    <template v-else-if="store.currentView.value === 'sync'">
      <!-- Sync View -->
      <Sync />
    </template>

    <template v-else-if="store.currentView.value === 'lookups'">
      <!-- Lookups View -->
      <Lookups />
    </template>

    <template v-else-if="store.currentView.value === 'sync_errors'">
      <!-- Sync Errors View -->
      <SyncErrors />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted , onBeforeUnmount, computed, watch } from 'vue';
import { useAppStore } from './stores/appStore';
import { db, IPlot, IPlotVisit, ITree, ITreeMeasurement, renewDatabase } from './db';
import Trees from './views/Trees.vue';
import Settings from './views/Settings.vue';
import Sync from './views/Sync.vue';
import PlotDetails from './views/PlotDetails.vue';
import Lookups from './views/Lookups.vue';
import SyncErrors from './views/SyncErrors.vue';
import { isConciseBody, isConditionalExpression } from 'typescript';

const store = useAppStore();
const dbVersion = ref(0);
const isMenuOpen = ref(false);


interface IPlotWithVisits extends IPlot {
  visits: IPlotVisit[];
  latestTreeCount: number;
  coords: string;
}
const plots = ref<IPlotWithVisits[]>([]);
const statusQuery = ref('');
const plotIdQuery = ref('');

watch(
  () => store.currentView.value,
  (newView) => {
    if (newView === 'plots') {
      loadPlots();
    }
  }
);

const filteredPlots = computed(() => {
  let result = plots.value;

  const sQuery = statusQuery.value.trim().toLowerCase();
  if (sQuery) {
    result = result.filter(plot => 
      plot.visits && plot.visits.some(visit => visit.status && visit.status.toLowerCase().includes(sQuery))
    );
  }

  const pQuery = plotIdQuery.value.trim().toLowerCase();
  if (pQuery) {
    result = result.filter(plot => plot.plotid.toLowerCase().includes(pQuery));
  }

  return result;
});

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const selectVisit = async (plot: IPlot, visit: IPlotVisit) => {
  closeMenu();
  const latestVisit = await db.plotVisits.get(visit.guid);
  if (!latestVisit) return;
  const [trees, measurements] = await Promise.all([
    db.plotTrees.where('plot_guid').equals(plot.guid).toArray(),
    db.treeMeasurements.where('visit_guid').equals(latestVisit.guid).toArray(),
  ]);
  // console.log('N Trees:', trees.length, 'Plot GUID:', plot.guid, 'Visit GUID:', latestVisit.guid);
  store.goToTrees(plot, latestVisit, trees, measurements);
};

const addNewVisit = async (plot: IPlotWithVisits) => {
  const newVisit: IPlotVisit = {
    guid: crypto.randomUUID(),
    plot_guid: plot.guid,
    measurement_date: Date.now(),
    // visit_number: plot.visits.length + 1,
    visit_number: plot.visits.length === 0 ? 1 : Math.max(...plot.visits.map(v => v.visit_number)) + 1,
    status: 'Planned'
  };

  await db.plotVisits.add(newVisit);
  await loadPlots();
  
  const updatedPlot = plots.value.find(p => p.guid === plot.guid);
  const visit = updatedPlot?.visits.find(v => v.guid === newVisit.guid);
  if (updatedPlot && visit) {
    await selectVisit(updatedPlot, visit);
  }
};

const addNewPlot = () => {
  // Simple dialog to add a new plot (can be enhanced with a modal)
  const plotid = prompt('Enter plot id (e.g., 28XJPQ21):');
  if (!plotid?.trim()) return;

  const newPlot: IPlot = {
    guid: crypto.randomUUID(),
    plotid: plotid.trim(),
    // FIXME: Default point to current GPS
    Shape: 'POINT (0 0)'
  };

  db.plots.add(newPlot).then(() => {
    loadPlots();
  });
};

const loadPlots = async () => {
  const allPlots = await db.plots.orderBy('plotid').toArray();
  plots.value = await Promise.all(
    allPlots.map(async (plot) => {
      const visits = await db.plotVisits
        .where('plot_guid')
        .equals(plot.guid)
        .sortBy('visit_number');

      let latestTreeCount = 0;
      if (visits.length > 0) {
        // FIXME: Get tree count from the last completed visit
        const latestVisit = visits[0];
        latestTreeCount = await db.treeMeasurements
          .where('visit_guid')
          .equals(latestVisit.guid)
          .count();
      }

      let coords = 'No coordinates';
      const gpsPoint = await db.plotGpsPoints.where('plot_guid').equals(plot.guid).last();
      if (gpsPoint) {
        coords = `${gpsPoint.latitude.toFixed(5)}, ${gpsPoint.longitude.toFixed(5)}`;
      } else if (plot.planned_latitude && plot.planned_longitude) {
        coords = `${plot.planned_latitude.toFixed(5)}, ${plot.planned_longitude.toFixed(5)}`;
      }

      return { ...plot, visits, latestTreeCount, coords } as IPlotWithVisits;
    })
  );
};

const handleBackButton = (event: Event) => {
  if (store.currentView.value === 'plots') {
    event.preventDefault();
    if (isMenuOpen.value) {
      isMenuOpen.value = false;
    }
    return
  };
  store.goToPreviousView();
  window.history.pushState(null, '', window.location.href);
  event.preventDefault();
};

onMounted(() => {
  
  // Push an initial state into the history stack so back button can be intercepted
  window.history.pushState(null, '', window.location.href);

  // Intercept the browser's back button
  window.addEventListener('popstate', handleBackButton);

  dbVersion.value = db.verno;
  loadPlots();
  
  // Second phase of and ESRI login, initiated in Setup.vue->login
  // If the app is loading following a login redirect then this processes the token
  // Handle Esri OAuth redirect (Code Grant)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    // verifier is a random sequence generated and saved in Setup.vue->login
    const verifier = localStorage.getItem('esri_code_verifier');
    const REDIRECT_URI = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/';
    
    fetch('https://www.arcgis.com/sharing/rest/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        f: 'json',
        client_id: import.meta.env.VITE_ESRI_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier || ''
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.access_token) {
        const expiration = Date.now() + (data.expires_in * 1000);
        console.log('Token Expiration: ', expiration)
        store.setEsriAuth(data.access_token, data.username, expiration, data.refresh_token);
        store.goToSync();
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
        localStorage.removeItem('esri_code_verifier');
      } else {
        console.error('Esri Token Exchange Failed:', data);
      }
    });
  }

  // Check if we need to refresh token on startup
  if (store.esriRefreshToken.value && (!store.esriToken.value || store.isTokenExpired.value)) {
    store.refreshEsriToken().then(result => {
      if (result === 'PERMANENT_FAILURE') {
        console.warn("Refresh token is expired or invalid. Logging out.");
        store.logoutEsri();
      } else if (!result) {
        console.warn("Network error during token refresh. Retaining offline session.");
      }
    });
  } else if (store.esriToken.value && store.isTokenExpired.value && !store.esriRefreshToken.value) {
    // Has access token but it is expired and no refresh token is available
    store.logoutEsri();
  }

  document.addEventListener('click', closeMenu);

  store.checkDeviceType();
  window.addEventListener('resize', store.checkDeviceType);

});

onUnmounted(() => {
  window.removeEventListener('resize', store.checkDeviceType);
});

onBeforeUnmount(() => {
  window.addEventListener('popstate', handleBackButton);
  document.removeEventListener('click', closeMenu);
});

const getPlotCoords = async (plot: IPlotWithVisits): Promise<[number, number]> => {
  const pnt = await db.plotGpsPoints.where('plot_guid').equals(plot.guid).last();
  return [
    pnt?.latitude || 44.930423,
    pnt?.longitude || -123.007152
  ];
};

const navigateToPlot = async (plot: IPlotWithVisits) => {
  // Generate a Google maps navigation URL to the plot lat, lon and open in a new tab
  const [ lat, lon ] = await getPlotCoords(plot);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  window.open(url, '_blank');
}

const waypointToPlot = async (plot: IPlotWithVisits) => {
  // Generate a Google maps waypoint for the plot lat, lon and open in a new tab
  const [ lat, lon ] = await getPlotCoords(plot);
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  window.open(url, '_blank');
}

</script>

<style scoped>
#app-inner {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: manipulation;
}

.plot-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 2px solid;
  border-radius: 12px;
  padding: 12px;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.plot-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--accent);
}

.plot-action-btn {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--accent);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.plot-action-btn:hover {
  background-color: #1d4ed8;
  transform: scale(1.1);
}

.plot-action-btn:active {
  transform: scale(0.95);
}

.nav-btn {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background-color: var(--accent);
  color: white;
}

.visit-chip {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  font-weight: bold;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.visit-chip:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

</style>
