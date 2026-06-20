// TODO: Add n-trees to header
// TODO: Show cursor when editing string fields on desktop

<template>
  <div id="app-inner" :class="{ 'dark-mode': store.isDarkMode.value }">
    <div v-if="isLocked" class="lock-overlay" @touchmove.prevent>
      <div class="lock-content">
        <!-- <p>Screen Locked</p> -->
        <!-- Swipe/Slide to Unlock gesture -->
        <div 
          class="swipe-area" 
          @touchstart="onTouchStart" 
          @touchmove="onTouchMove" 
          @touchend="onTouchEnd"
        >
          <div class="swipe-track">
            <div class="swipe-thumb" :style="{ transform: `translateX(${swipeX}px)` }">
              <icon-fa-arrow-right class="text-xs" />
            </div>
            <span>Swipe to unlock</span>
          </div>
        </div>
      </div>
    </div>
    <header class="p-2 border-b-2 flex items-center" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--header-bg)' }">
      <div @click="store.goToPreviousView()" class="m-0 pr-4 cursor-pointer text-md">
        <icon-fa-arrow-left />
      </div>
      <div class="">
        <!-- <h1 class="text-xs uppercase opacity-70 font-bold">Forest Inventory</h1> -->
        <div class="text-md font-bold">
          <div>Plot: {{ store.selectedPlot.value?.plotid }}</div>
          <!-- <span class="opacity-40">|</span> -->
          <div class="flex gap-3">
            <span>Visit: {{ store.selectedVisit.value?.visit_number }}</span>
            <span class="opacity-60 font-normal text-sm">
              ({{ store.selectedVisit.value?.measurement_date ? new Date(store.selectedVisit.value?.measurement_date).toLocaleDateString() : 'No visit' }})
            </span>
          </div>
        </div>
      </div>
      <div class="relative ml-auto flex items-center gap-2">
        <!-- <button @click="store.toggleDarkMode()" class="menu-item text-xl">
          <icon-fa-sun-o v-if="store.isDarkMode.value" class="menu-icon" />
          <icon-fa-moon-o v-else class="menu-icon" />
        </button> -->
        <!-- <button @click="toggleFullscreen" class="menu-item text-xl">
          <icon-fa-window-minimize v-if="isFullscreen" class="menu-icon"/>
          <icon-fa-window-maximize v-else class="menu-icon"/>
        </button> -->
        <button v-if="!visitIsActive" @click="store.goToPlotDetail(store.selectedPlot.value!)" class="menu-item text-xl">
          <icon-fa-hand-stop-o class="menu-icon !text-red-500"/>
        </button>
        <button v-if="store.isMobile.value" @click="requestWakeLock" class="menu-item text-xl">
          <icon-fa-lock v-if="!isLocked" class="menu-icon"/>
          <icon-fa-unlock v-else class="menu-icon"/>
        </button>
        <button @click.stop="toggleMenu" class="p-1 rounded menu-icon text-xl font-bold min-w-7" :style="{ color: 'var(--text-primary)' }">
          <icon-fa7-solid-ellipsis-v />
        </button>

        <div v-if="isMenuOpen" class="kebab-menu" @click.stop>
          <button @click="store.goToPlotDetail(store.selectedPlot.value!)" class="menu-item">
            <icon-fa-list-alt class="menu-icon"/>
            <span>Plot Details</span>
          </button>
          <button @click="toggleFullscreen" class="menu-item">
            <icon-fa-window-minimize v-if="isFullscreen" class="menu-icon"/>
            <icon-fa-window-maximize v-else class="menu-icon"/>
            <span>{{ isFullscreen ? 'Exit fullscreen' : 'Fullscreen' }}</span>
          </button>
          <button @click="store.toggleDarkMode()" class="menu-item">
            <icon-fa-sun-o v-if="store.isDarkMode.value" class="menu-icon" />
            <icon-fa-moon-o v-else class="menu-icon" />
            <span>{{ store.isDarkMode.value ? 'Light mode' : 'Dark mode' }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="table-container" ref="tableBox">
      <table>
        <thead>
          <tr>
            <!-- <th v-for="col in columns" :key="col.key">{{ col.label }}</th> -->
            <template v-for="col in columns" :key="col.key">
              <th v-if="col.visible"
                
                :class="{ 'freeze-col': col.freeze }"
                :style="col.freeze ? { left: frozenLeftOffsets[col.key] } : {}">
                {{ col.label }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rIdx) in rows" :key="rIdx" :class="{ 'error-row': row.hasError }">
            <template v-for="(col, cIdx) in columns" :key="col.key">
              <td v-if="col.visible"
                :key="col.key"
                :class="{
                  'min-w-[17rem]': col.key === 'remarks'
                  , '!min-w-10': col.type === 'select'
                  , 'active-cell': activeRow === rIdx && activeCol === cIdx
                  , 'prior-val': row.isPrior
                  , 'freeze-col': col.freeze 
                  , '!p-0': !store.isMobile.value && col.type === 'select' && activeRow === rIdx && activeCol === cIdx && !row.isPrior
                  }"
                :style="[
                  row.isPrior ? { backgroundColor: 'var(--btn-bg)' } : {},
                  col.freeze ? { left: frozenLeftOffsets[col.key] } : {}
                ]"
                @click="setActive(rIdx, cIdx)">
                <template v-if="!store.isMobile.value && col.type === 'select' && activeRow === rIdx && activeCol === cIdx && !row.isPrior">
                  <select
                    ref="activeSelectRef"
                    v-focus
                    v-model="row[col.key]"
                    @mousedown="checkVisitActiveMouseDown"
                    @change="saveRow(row)"
                    class="bg-transparent border-0 outline-none text-inherit font-inherit cursor-pointer select-dropdown w-full h-full"
                  >
                    <option v-if="activeColConfig.allowNull" value=""></option>
                    <option v-for="opt in col.options" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </template>
                <template v-else>
                  <span :style="row.isPrior ? { opacity: 0.65 } : {}">
                    {{ row[col.key] }}
                  </span>
                </template>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Navigation bar -->
    <div class="p-2 flex justify-between items-center border-b-2" :style="{ borderColor: 'var(--border-color)', backgroundColor: 'var(--keypad-bg)' }">
      <div class="flex gap-1">
        <button @click="addRow" class="nav-btn !text-green-600 !text-sm"><icon-fa-plus /></button>
        <button @click="removeRow" class="nav-btn !text-red-600 !text-sm"><icon-fa-minus /></button>
      </div>
      <div v-if="store.isMobile.value" class="flex gap-1">
        <button @click="move('up')" class="nav-btn !text-lg" :style="{backgroundColor: 'var(--keypad-bg)'}"><icon-fa-arrow-up /></button>
        <button @click="move('down')" class="nav-btn !text-lg":style="{backgroundColor: 'var(--keypad-bg)'}"><icon-fa-arrow-down /></button>
        <button @click="move('left')" class="nav-btn !text-lg" :style="{backgroundColor: 'var(--keypad-bg)'}"><icon-fa-arrow-left /></button>
        <button @click="move('right')" class="nav-btn !text-lg" :style="{backgroundColor: 'var(--keypad-bg)'}"><icon-fa-arrow-right /></button>
      </div>
    </div>

    <!-- Entry Pad -->
    <div v-if="store.isMobile.value" class="p-2 h-[33dvh]" :style="{ backgroundColor: 'var(--keypad-bg)' }">
      <div v-if="activeColConfig?.type === 'number'" class="grid grid-cols-4 gap-2 h-full">
        <button v-for="n in [7, 8, 9]" :key="n" @click="pressKey(n)" class="keypad-btn">{{ n }}</button>
        <button @click="pressKey('back')" class="keypad-btn !bg-orange-500 !text-white !text-2xl"><icon-uil-backspace /></button>

        <button v-for="n in [4, 5, 6]" :key="n" @click="pressKey(n)" class="keypad-btn">{{ n }}</button>
        <button @click="move('right')" class="keypad-btn row-span-2 !bg-blue-600 !text-white !text-2xl"><icon-uil-enter /></button>

        <button v-for="n in [1, 2, 3]" :key="n" @click="pressKey(n)" class="keypad-btn">{{ n }}</button>

        <button @click="pressKey('/')" class="keypad-btn col-span-1">/</button>
        <button @click="pressKey(0)" class="keypad-btn col-span-1">0</button>
        <button @click="pressKey('.')" class="keypad-btn">.</button>
        <button @click="undoEdit" class="keypad-btn !bg-gray-500 !text-white !text-lg"><icon-uil-redo /></button>
      </div>

      <div v-else-if="activeColConfig?.type === 'select'" class="grid grid-cols-3 gap-3 overflow-y-auto h-full p-1">
        <button
          v-for="opt in activeColConfig.options"
          :key="opt"
          @click="setVal(opt)"
          class="chip"
          :class="{ 'active-chip': rows[activeRow][activeColConfig.key] === opt }">
          {{ opt }}
        </button>
        <button
          v-if="activeColConfig.allowNull"
          @click="setVal('')"
          class="chip"
          :class="{ 'active-chip': rows[activeRow][activeColConfig.key] === '' }">
          NULL
        </button>
      </div>
      <div v-else-if="activeColConfig?.type === 'string'" class="flex flex-col gap-2 h-full p-1">
        <input
          type="text"
          v-model="rows[activeRow][activeColConfig.key]"
          @mousedown="checkVisitActiveMouseDown"
          @keydown="checkVisitActiveKeyDown"
          @change="saveRow(rows[activeRow])"
          @keyup.enter="move('right')"
          class="w-full flex-1 p-3 border border-gray-300 rounded text-lg text-black bg-white"
          placeholder="Enter text..."
        />
        <button @click="move('right')" class="keypad-btn !bg-blue-600 !text-white min-h-[3.5rem]">
          ENT
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// import IconMaximize from 'virtual:icons/iconoir/maximize'
// import IconMinimize from '~icons/iconoir/minimize'
// import MdiStore24Hour from 'virtual:icons/mdi/store-24-hour'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import { useAppStore } from '../stores/appStore';
import { db, IPlot, ITree, ITreeMeasurement } from '../db';

const vFocus = {
  mounted: (el: HTMLElement) => {
    el.focus();
  }
};

const activeSelectRef = ref<HTMLSelectElement | HTMLSelectElement[] | null>(null);

type Column = {
  label: string;
  key: RowKey;
  type: 'string' | 'number' | 'select';
  visible: boolean;
  freeze?: boolean;
  options?: string[];
  allowNull?: boolean;
};

type RowKey =
  | 'visit_guid'
  | 'plot_guid'
  | 'tree_guid'
  | 'measurement_guid'
  | 'visit_number'
  | 'tree_num'
  | 'az'
  | 'hd'
  | 'sp'
  | 'dbh'
  | 'gp'
  | 'gt'
  | 's'
  | 'fc'
  | 'ht'
  | 'upstd'
  | 'upstht'
  | 'cr'
  | 'cc'
  | 'd1'
  | 's1'
  | 'd2'
  | 's2'
  | 'd3'
  | 's3'
  | 'def1'
  | 'def2'
  | 'def3'
  | 'c'
  | 'age'
  | 'bt'
  | 'fiveyr'
  | 'tenyr'
  | 'ref'
  | 'sd'
  | 'remarks';

interface Row extends Record<RowKey, any> {
  isPrior: boolean;
  isNew: boolean;
  hasError: boolean;
  sortGroup: number;
}

const store = useAppStore();
const isFullscreen = ref(false);
const activeRow = ref(0);
const activeCol = ref(2); // Start at Tree Num or Species
const isMenuOpen = ref(false);
const tableBox = ref<HTMLDivElement | null>(null);
const lastCellValue = ref<any>(null);
const lastCellRef = ref<{ r: number, c: number } | null>(null);
const cellNeedsOverwrite = ref(false);

const visitIsActive = ref(false);

const checkVisitActive = () => {
  if (!visitIsActive.value) {
    alert("Please set the visit status to Active before editing.");
    return false;
  }
  return true;
};

const checkVisitActiveMouseDown = (event: MouseEvent) => {
  if (!visitIsActive.value) {
    event.preventDefault();
    alert("Please set the visit status to Active before editing.");
  }
};

const checkVisitActiveKeyDown = (event: KeyboardEvent) => {
  if (!visitIsActive.value) {
    event.preventDefault();
    alert("Please set the visit status to Active before editing.");
  }
};

const spOptions = ref<string[]>([]);
const stOptions = ref<string[]>([]);
const ccOptions = ref<string[]>([]);
const cOptions = ref<string[]>([]);
const gpOptions = ref<string[]>([]);

const frozenLeftOffsets = ref<Record<string, string>>({});
const currentLeft = ref(0);
let resizeObserver: ResizeObserver | null = null;

const updateFrozenOffsets = () => {
  if (!tableBox.value) return;
  const ths = tableBox.value.querySelectorAll('thead th');
  if (!ths.length) return;
  
  currentLeft.value = 0;
  let visibleColIdx = 0;
  
  columns.value.forEach((col) => {
    if (!col.visible) return;
    if (col.freeze) {
      frozenLeftOffsets.value[col.key] = `${currentLeft.value}px`;
      const th = ths[visibleColIdx] as HTMLElement;
      currentLeft.value += th.offsetWidth || 0;
    }
    visibleColIdx++;
  });
};

const columns = computed<Column[]>((): Column[] => [
  // { label: 'MSMT ID', key: 'measurement_guid', type: 'string', visible: false , freeze: false },
  // { label: 'Plot ID', key: 'plot_guid', type: 'string', visible: false, freeze: false},
  // { label: 'G', key: 'sortGroup', type: 'number', visible: true, freeze: false},
  { label: 'TR', key: 'tree_num', type: 'number', visible: true, freeze: false},
  { label: 'V', key: 'visit_number', type: 'number', visible: true, freeze: false},
  { label: 'AZ', key: 'az', type: 'number', visible: true, freeze: true},
  { label: 'HD', key: 'hd', type: 'number', visible: true, freeze: false},
  { label: 'SP', key: 'sp', type: 'select', options: spOptions.value, visible: true, freeze: true},
  { label: 'GP', key: 'gp', type: 'select', visible: true, options: gpOptions.value },
  { label: 'DBH', key: 'dbh', type: 'number', visible: true, freeze: true },
  { label: 'GT', key: 'gt', type: 'number', visible: true },
  { label: 'ST', key: 's', type: 'select', options: stOptions.value, visible: true },
  { label: 'FC', key: 'fc', type: 'number', visible: true },
  { label: 'HT', key: 'ht', type: 'number', visible: true },
  { label: 'BD', key: 'upstd', type: 'number', visible: true },
  { label: 'BHT', key: 'upstht', type: 'number', visible: true },
  { label: 'CR', key: 'cr', type: 'number', visible: true },
  { label: 'CC', key: 'cc', type: 'select', visible: true, options: ccOptions.value, allowNull: true },
  { label: 'D1', key: 'd1', type: 'number', visible: true },
  { label: 'S1', key: 's1', type: 'number', visible: true },
  { label: 'D2', key: 'd2', type: 'number', visible: true },
  { label: 'S2', key: 's2', type: 'number', visible: true },
  { label: 'D3', key: 'd3', type: 'number', visible: true },
  { label: 'S3', key: 's3', type: 'number', visible: true },
  { label: 'Def1', key: 'def1', type: 'number', visible: true },
  { label: 'Def2', key: 'def2', type: 'number', visible: true },
  { label: 'Def3', key: 'def3', type: 'number', visible: true },
  { label: 'CND', key: 'c', type: 'select', options: cOptions.value, visible: true, allowNull: true },
  { label: 'Age', key: 'age', type: 'number', visible: true },
  { label: 'BT', key: 'bt', type: 'number', visible: true },
  { label: '5yr', key: 'fiveyr', type: 'number', visible: true },
  { label: '10yr', key: 'tenyr', type: 'number', visible: true },
  { label: 'Ref', key: 'ref', type: 'number', visible: true },
  { label: 'SD', key: 'sd', type: 'number', visible: true },
  { label: 'Remarks', key: 'remarks', type: 'string', visible: true },
]);

const rows = ref<Row[]>([]);

// The row displayed to the user combines tree and measure values
const treeAndMeasToRow = (tree: ITree, meas: ITreeMeasurement | undefined, visitNum: number, isPrior: boolean, isNew: boolean, hasError: boolean, sortGroup: number): Row => ({
  visit_guid: meas?.visit_guid,
  plot_guid: tree.plot_guid,
  tree_guid: tree.guid,
  measurement_guid: meas?.guid || crypto.randomUUID(),
  visit_number: visitNum,
  tree_num: tree.tree_num,
  az: tree.az ?? '',
  hd: tree.hd ?? '',
  sp: tree.sp ?? '',
  gp: meas?.gp ?? '',
  gt: meas?.gt ?? '',
  dbh: meas?.dbh ?? '',
  s: meas?.s ?? '',
  upstd: meas?.upstd ?? '',
  upstht: meas?.upstht ?? '',
  cr: meas?.cr ?? '',
  cc: meas?.cc ?? '',
  ht: meas?.ht ?? '',
  fc: meas?.fc ?? '',
  d1: meas?.d1 ?? '',
  s1: meas?.s1 ?? '',
  d2: meas?.d2 ?? '',
  s2: meas?.s2 ?? '',
  d3: meas?.d3 ?? '',
  s3: meas?.s3 ?? '',
  def1: meas?.def1 ?? '',
  def2: meas?.def2 ?? '',
  def3: meas?.def3 ?? '',
  c: meas?.c ?? '',
  age: meas?.age ?? '',
  bt: meas?.bt ?? '',
  fiveyr: meas?.fiveyr ?? '',
  tenyr: meas?.tenyr ?? '',
  ref: tree.ref ?? '',
  sd: tree.sd ?? '',
  remarks: meas?.remarks ?? '',
  isPrior,
  isNew,
  hasError,
  sortGroup
});

const captureSnapshot = () => {
  if (rows.value.length === 0) return;
  lastCellRef.value = { r: activeRow.value, c: activeCol.value };
  const colKey = columns.value[activeCol.value].key;
  lastCellValue.value = rows.value[activeRow.value][colKey];
};

// Log edits to static tree attribute
const commitEditCheck = async () => {
  if (!lastCellRef.value || rows.value.length === 0) return true;
  
  const { r, c } = lastCellRef.value;
  const row = rows.value[r];
  if (!row || row.isPrior) return true;

  const col = columns.value[c];
  const colKey = col.key;
  const currentVal = row[colKey];
  const oldVal = lastCellValue.value;

  // Fraction evaluation and saving for fc and cr columns when navigating out
  if ((colKey === 'fc' || colKey === 'cr') && String(currentVal) !== String(oldVal)) {
    if (typeof currentVal === 'string' && currentVal.includes('/')) {
      let fractionVal = evaluateFraction(currentVal);
      if (fractionVal !== null) {
        if (colKey === 'cr'){
          fractionVal = 100 - fractionVal
        }
        row[colKey] = fractionVal;
      }
    }
    await saveRow(row, true);
  }

  // Define which attributes are considered "static" tree attributes
  const staticFields = ['tree_num', 'az', 'hd', 'sp','ref','sd'];
  
  if (!row.isNew && staticFields.includes(colKey) && String(currentVal) !== String(oldVal)) {
    const reason = prompt(`Reason for changing static attribute "${col.label}" from "${oldVal}" to "${currentVal}"?`);
    
    if (reason === null || reason.trim() === '') {
      // Discard/Revert
      row[colKey] = oldVal;
      await saveRow(row);
      return false; 
    } else {
      // Log Edit
      await db.edits.add({
        guid: crypto.randomUUID(),
        table_name: 'tree',
        record_guid: row.tree_guid,
        field_name: colKey,
        old_value: String(oldVal),
        new_value: String(currentVal),
        reason: reason,
        edit_date: Date.now()
      });
    }
  }
  return true;
};

// Load tree records from database
const loadRows = async () => {
  if (!store.selectedPlot.value || !store.selectedVisit.value) return;

  const plotGUID = store.selectedPlot.value.guid;
  
  // Refresh selected visit from database to ensure status is up to date
  const freshVisit = await db.plotVisits.get(store.selectedVisit.value.guid);
  if (freshVisit) {
    store.selectedVisit.value = freshVisit;
  }
  
  const currentVisit = store.selectedVisit.value;

  visitIsActive.value = currentVisit.status === 'Active';

  if (currentVisit.measurement_date === null){
    currentVisit.measurement_date = new Date().getTime();
  }
  // console.log(currentVisit.measurement_date)

  // Find prior visit as most recent prior to current visit
  const priorVisit = await db.plotVisits
    .where('plot_guid')
    .equals(plotGUID)
    .filter(v => v.measurement_date < currentVisit.measurement_date)
    .reverse()
    .sortBy('measurement_date')
    .then(list => list[0]);

  const [trees, currentMeas, priorMeas, syncErrors] = await Promise.all([
    db.plotTrees.where('plot_guid').equals(plotGUID).sortBy('az'),
    db.treeMeasurements.where('visit_guid').equals(currentVisit.guid).toArray(),
    priorVisit ? db.treeMeasurements.where('visit_guid').equals(priorVisit.guid).toArray() : Promise.resolve([]),
    db.syncErrors.toArray()
  ]);

  const erroredGuids = new Set(syncErrors.map(e => e.record_guid.toUpperCase()));

  // Rows to display include prior measurements interleaved with current measurements or empty rows
  const allRows: Row[] = [];
  // // Capture seedlings and saplings and append them to the end
  // const tailRows: Row[] = [];
  // trees.forEach(tree => {
  //   const pm = priorVisit ? priorMeas.find(m => m.tree_guid === tree.guid) : undefined;
  //   let isTailRow = false;
  //   if (priorVisit && pm) {
  //     const pmHasError = erroredGuids.has(tree.guid.toUpperCase()) || (pm ? erroredGuids.has(pm.guid.toUpperCase()) : false);
  //     const row = treeAndMeasToRow(tree, pm, priorVisit.visit_number, true, false, pmHasError);
  //     if (row.az === null || row.dbh<5.5){
  //       isTailRow = true;
  //       tailRows.push(row);
  //     } else {
  //       isTailRow = false;
  //       allRows.push(row);
  //     }
  //   }
  //   const cm = currentMeas.find(m => m.tree_guid === tree.guid);
  //   const cmHasError = erroredGuids.has(tree.guid.toUpperCase()) || (cm ? erroredGuids.has(cm.guid.toUpperCase()) : false);
  //   const row = treeAndMeasToRow(tree, cm, currentVisit.visit_number, false, !pm, cmHasError);
  //   if (isTailRow){
  //     tailRows.push(row);
  //   } else {
  //     allRows.push(row);
  //   }
  // });

  // // Sort by tree number and visit number
  // tailRows.sort((a,b) => a.tree_num-b.tree_num || a.visit_number - b.visit_number);

  // rows.value = [...allRows, ...tailRows];

  trees.forEach(tree => {
    const pm = priorVisit ? priorMeas.find(m => m.tree_guid === tree.guid) : undefined;
    let sortGroup = 1;
    if (priorVisit && pm) {
      const pmHasError = erroredGuids.has(tree.guid.toUpperCase()) || (pm ? erroredGuids.has(pm.guid.toUpperCase()) : false);
      if (tree.az == null || pm.dbh<5.5){
        sortGroup = 2;
      } else {
        sortGroup = 1;
      }
      const row = treeAndMeasToRow(tree, pm, priorVisit.visit_number, true, false, pmHasError, sortGroup);
      allRows.push(row);
    }
    const cm = currentMeas.find(m => m.tree_guid === tree.guid);
    const cmHasError = erroredGuids.has(tree.guid.toUpperCase()) || (cm ? erroredGuids.has(cm.guid.toUpperCase()) : false);
    if (!pm) {
      if (tree.az == null || (cm?.dbh ?? 0)<5.5){
        sortGroup = 2;
      } else {
        sortGroup = 1;
      }
    }
    const row = treeAndMeasToRow(tree, cm, currentVisit.visit_number, false, !pm, cmHasError, sortGroup);
    allRows.push(row);
  });

  // Sort by tree number and visit number
  allRows.sort((a,b) => a.sortGroup-b.sortGroup || a.az-b.az || a.tree_num-b.tree_num || a.visit_number - b.visit_number );

  rows.value = allRows;
  
  
  // Set initial active row to first editable row
  activeRow.value = allRows.findIndex(r => !r.isPrior);
  if (activeRow.value === -1) activeRow.value = 0;

  // If no records exist, add some default rows
  if (rows.value.length === 0) {
    await addRow();
  }
  captureSnapshot();
  cellNeedsOverwrite.value = true;
};

const toNumOrUndef = (val: any) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
};

const evaluateFraction = (valStr: string): number | null => {
  const parts = valStr.split('/');
  if (parts.length === 2) {
    const num = Number(parts[0].trim());
    const den = Number(parts[1].trim());
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return Math.round((num / den) * 100);
    }
  }
  return null;
};

// Save a row to database
const saveRow = async (row: Row, forceSave = false) => {
  if (row.isPrior) return;

  const tree: ITree = {
    guid: row.tree_guid,
    plot_guid: row.plot_guid,
    tree_num: Number(row.tree_num),
    az: toNumOrUndef(row.az),
    hd: toNumOrUndef(row.hd),
    sp: row.sp,
    ref: row.ref,
    sd: toNumOrUndef(row.sd),
    remarks: row.remarks
  };

  const measurement: ITreeMeasurement = {
    guid: row.measurement_guid,
    tree_guid: row.tree_guid,
    visit_guid: store.selectedVisit.value!.guid,
    dbh: Number(row.dbh),
    gp: row.gp,
    gt: Number(row.gt),
    s: Number(row.s),
    fc: toNumOrUndef(row.fc),
    ht: toNumOrUndef(row.ht),
    upstd: toNumOrUndef(row.upstd),
    upstht: toNumOrUndef(row.upstht),
    cr: toNumOrUndef(row.cr),
    cc: toNumOrUndef(row.cc),
    d1: toNumOrUndef(row.d1),
    s1: toNumOrUndef(row.s1),
    d2: toNumOrUndef(row.d2),
    s2: toNumOrUndef(row.s2),
    d3: toNumOrUndef(row.d3),
    s3: toNumOrUndef(row.s3),
    def1: toNumOrUndef(row.def1),
    def2: toNumOrUndef(row.def2),
    def3: toNumOrUndef(row.def3),
    c: toNumOrUndef(row.c),
    age: toNumOrUndef(row.age),
    bt: toNumOrUndef(row.bt),
    fiveyr: toNumOrUndef(row.fiveyr),
    tenyr: toNumOrUndef(row.tenyr),
    remarks: row.remarks
  };

  await Promise.all([
    db.plotTrees.put(tree),
    db.treeMeasurements.put(measurement)
  ]);
};


const activeColConfig = computed(() => columns.value[activeCol.value]);

const scrollActiveIntoView = async () => {
  await Promise.resolve();
  const wrapper = tableBox.value;
  const activeCell = wrapper?.querySelector('.active-cell');
  if (!wrapper || !activeCell) return;

  const table = activeCell.closest('table');
  const header = table?.querySelector('thead');
  const headerHeight = header?.offsetHeight || 0;

  const wrapperRect = wrapper.getBoundingClientRect();
  const cellRect = activeCell.getBoundingClientRect();
  const cellTop = cellRect.top - wrapperRect.top + wrapper.scrollTop;
  const cellBottom = cellTop + cellRect.height;
  const cellLeft = cellRect.left - wrapperRect.left + wrapper.scrollLeft;
  const cellRight = cellLeft + cellRect.width;
  const visibleTop = wrapper.scrollTop + headerHeight;
  const visibleBottom = wrapper.scrollTop + wrapper.clientHeight;
  const visibleLeft = wrapper.scrollLeft + currentLeft.value;
  const visibleRight = wrapper.scrollLeft + wrapper.clientWidth;

  if (cellTop < visibleTop) {
    wrapper.scrollTop = Math.max(cellTop - headerHeight, 0);
  } else if (cellBottom > visibleBottom) {
    wrapper.scrollTop = Math.min(cellBottom - wrapper.clientHeight, wrapper.scrollHeight - wrapper.clientHeight);
  }
  
  if (!activeColConfig.value.freeze) {
    if (cellLeft < visibleLeft) {
      wrapper.scrollLeft = Math.max(cellLeft - currentLeft.value, 0);
    } else if (cellRight > visibleRight) {
      wrapper.scrollLeft = Math.min(cellRight - wrapper.clientWidth, wrapper.scrollWidth - wrapper.clientWidth);
    }
  }
};

const setActive = async (r: number, c: number) => {
  if (rows.value[r].isPrior) return;
  await commitEditCheck();
  activeRow.value = r;
  activeCol.value = c;
  captureSnapshot();
  cellNeedsOverwrite.value = true;
  scrollActiveIntoView();
};

const move = async (dir: 'up' | 'down' | 'left' | 'right') => {
  await commitEditCheck();

  let r = activeRow.value;
  let c = activeCol.value;

  if (dir === 'up') {
    do { r--; } while (r >= 0 && rows.value[r].isPrior);
    if (r >= 0) activeRow.value = r;
  }
  if (dir === 'down') {
    do { r++; } while (r < rows.value.length && rows.value[r].isPrior);
    if (r < rows.value.length) activeRow.value = r;
  }
  if (dir === 'left') {
    const visibleIndices = columns.value.map((col, i) => col.visible ? i : -1).filter(i => i !== -1);
    const currentIdx = visibleIndices.indexOf(c);
    if (currentIdx > 0) {
      activeCol.value = visibleIndices[currentIdx - 1];
    } else if (currentIdx === 0 && r>1) {
      activeCol.value = visibleIndices[visibleIndices.length - 1];
      move('up');
    }
  }
  if (dir === 'right') {
    const visibleIndices = columns.value.map((col, i) => col.visible ? i : -1).filter(i => i !== -1);
    const currentIdx = visibleIndices.indexOf(c);
    if (currentIdx < visibleIndices.length - 1){
      activeCol.value = visibleIndices[currentIdx + 1];
    } else if (currentIdx === visibleIndices.length - 1) {
      activeCol.value = visibleIndices[5];
      move('down');
    }
  }
  captureSnapshot();
  cellNeedsOverwrite.value = true;
  scrollActiveIntoView();
};

const pressKey = (key: number | 'back' | '.' | '/') => {
  if (!checkVisitActive()) return;
  const row = rows.value[activeRow.value];
  const colKey = activeColConfig.value.key;
  const current = String(row[colKey] ?? '');

  // lastCellValue.value = current;
  console.log(lastCellValue.value);

  if (key === '/') {
    // Only allow '/' on 'fc' and 'cr' columns
    if (colKey !== 'fc' && colKey !== 'cr') return;
  }

  if (key === 'back') {
    if (activeColConfig.value.type === 'number') {
      row[colKey] = '';
      cellNeedsOverwrite.value = false;
    } else if (cellNeedsOverwrite.value && activeColConfig.value.type !== 'string') {
      row[colKey] = '';
      cellNeedsOverwrite.value = false;
    } else {
      row[colKey] = current.slice(0, -1);
      cellNeedsOverwrite.value = false;
    }
  } else {
    if (cellNeedsOverwrite.value) {
      row[colKey] = String(key);
      cellNeedsOverwrite.value = false;
    } else {
      if (key === '.' && current.includes('.')) return;
      if (key === '/' && current.includes('/')) return;
      row[colKey] = current + String(key);
    }
  }

  // Save the updated row to database
  saveRow(row);
};

const undoEdit = () => {
  if (!checkVisitActive()) return;
  if (rows.value.length === 0) return;
  const row = rows.value[activeRow.value];
  const colKey = activeColConfig.value.key;
  
  row[colKey] = lastCellValue.value;
  cellNeedsOverwrite.value = true;
  // Save the updated row to database
  saveRow(row);
};

const setVal = (val: string) => {
  if (!checkVisitActive()) return;
  rows.value[activeRow.value][activeColConfig.value.key] = val;
  // Save the updated row to database
  saveRow(rows.value[activeRow.value]);
  move('right');
};

const addRow = async () => {
  if (!checkVisitActive()) return;
  if (!store.selectedPlot.value) return;
  
  const nextTreeNum = rows.value.length > 0 
    ? Math.max(...rows.value.map(r => Number(r.tree_num))) + 1 
    : 1;

  const newTree: ITree = {
    guid: crypto.randomUUID(),
    plot_guid: store.selectedPlot.value.guid,
    tree_num: nextTreeNum,
    sp: '',
    az: 0,
    hd: 0
  };

  const newRow = treeAndMeasToRow(
    newTree, 
    undefined, 
    store.selectedVisit.value?.visit_number || 1, 
    false,
    true,
    false
  );

  rows.value.push(newRow);
  activeRow.value = rows.value.length - 1;
  activeCol.value = 4; // Focus Tr
  captureSnapshot();
  cellNeedsOverwrite.value = true;
  scrollActiveIntoView();
  
  saveRow(newRow);
};

const removeRow = async () => {
  if (rows.value.length === 0) return;
  console.log(store.selectedVisit.value);
  if (!checkVisitActive()) return;

  const rowToDelete = rows.value[activeRow.value];
  if (!rowToDelete) return;

  if (rowToDelete.isPrior) {
    alert("Records from prior visits cannot be removed.");
    return;
  }

  const message = `Delete measurement for tree ${rowToDelete['tree_num']}? This cannot be undone.`;
  if (!confirm(message)) return;

  // Check if tree is associated with another visit
  const measurements = await db.treeMeasurements.where('tree_guid').equals(rowToDelete.tree_guid).toArray();
  const otherMeasurements = measurements.filter(m => m.visit_guid !== store.selectedVisit.value?.guid);

  let deleteTree = false;
  if (otherMeasurements.length === 0) {
    deleteTree = confirm(`This tree record is not associated with any other visits. Do you want to delete the tree record as well?`);
  }

  // 1. Delete the measurement record for this visit
  const measRecord = await db.treeMeasurements.where('tree_guid').equals(rowToDelete.tree_guid)
    .filter(m => m.visit_guid === store.selectedVisit.value?.guid)
    .first();

  if (measRecord) {
    // If the record has been synced (has OBJECTID or GlobalID), track it for server deletion
    if (measRecord.OBJECTID || measRecord.GlobalID) {
      await db.deletedRecords.put({
        guid: measRecord.guid,
        table_name: 'measurement',
        objectid: measRecord.OBJECTID,
        globalid: measRecord.GlobalID,
        deleted_date: Date.now()
      });
    }
    await db.treeMeasurements.delete(measRecord.guid);
  }

  // 2. Delete the tree record if requested
  if (deleteTree) {
    const treeRecord = await db.plotTrees.get(rowToDelete.tree_guid);
    if (treeRecord) {
      if (treeRecord.OBJECTID || treeRecord.GlobalID) {
        await db.deletedRecords.put({
          guid: treeRecord.guid,
          table_name: 'tree',
          objectid: treeRecord.OBJECTID,
          globalid: treeRecord.GlobalID,
          deleted_date: Date.now()
        });
      }
      await db.plotTrees.delete(rowToDelete.tree_guid);
    }
  }

  // 3. Update local UI state
  if (deleteTree) {
    // Remove all rows associated with this tree (prior and current)
    rows.value = rows.value.filter(r => r.tree_guid !== rowToDelete.tree_guid);
  } else {
    // Keep the tree but clear the current measurement values
    const rowIndex = rows.value.findIndex(r => r.measurement_guid === rowToDelete.measurement_guid);
    if (rowIndex !== -1) {
      const tree = await db.plotTrees.get(rowToDelete.tree_guid);
      if (tree) {
        const pm = rows.value.find(r => r.tree_guid === rowToDelete.tree_guid && r.isPrior);
        const treeErrors = await db.syncErrors.where('record_guid').equals(tree.guid).count();
        const updatedRow = treeAndMeasToRow(tree, undefined, store.selectedVisit.value?.visit_number || 1, false, !pm, treeErrors > 0);
        rows.value[rowIndex] = updatedRow;
      }
    }
  }

  // Adjust activeRow if it's out of bounds or pointing to a prior row
  if (activeRow.value >= rows.value.length) {
    activeRow.value = rows.value.length - 1;
  }
  while (activeRow.value >= 0 && rows.value[activeRow.value].isPrior) {
    activeRow.value--;
  }
  if (activeRow.value < 0) {
    activeRow.value = rows.value.findIndex(r => !r.isPrior);
  }
  if (activeRow.value === -1) {
    activeRow.value = 0;
  }

  // If no records are left, insert a default row
  if (rows.value.length === 0) {
    await addRow();
  }

  captureSnapshot();
  cellNeedsOverwrite.value = true;
};

const updateFullscreenState = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggleMenu = () => {
  console.log('toggleMenu', !isMenuOpen.value);
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const toggleFullscreen = async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen();
  }
};

const handleGlobalKeydown = async (event: KeyboardEvent) => {
  // Skip key handling on mobile devices
  if (store.isMobile.value) return;

  const target = event.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    console.log('input, skipping')
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    await move('up');
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    await move('down');
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    await move('left');
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    await move('right');
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    if (event.shiftKey) {
      await move('left');
    } else {
      await move('right');
    }
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    await move('right');
    return;
  }

  if (rows.value.length === 0) return;
  const row = rows.value[activeRow.value];
  const colConfig = activeColConfig.value;

  if (event.key === ' ' || event.code === 'Space') {
    if (colConfig && colConfig.type === 'select') {
      event.preventDefault();
      if (!checkVisitActive()) return;

      const selectEl = Array.isArray(activeSelectRef.value) 
        ? activeSelectRef.value[0] 
        : activeSelectRef.value;

      if (selectEl && typeof selectEl.showPicker === 'function') {
        try {
          selectEl.showPicker();
        } catch (err) {
          console.error('Failed to show select picker:', err);
        }
      }
      return;
    }
  }

  if (!row || row.isPrior) return;

  if (!colConfig) return;
  const colKey = colConfig.key;

  // Prevent editing keys if visit is not active
  const isEditingKey = event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Escape' || (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey);
  if (isEditingKey) {
    if (!checkVisitActive()) {
      event.preventDefault();
      return;
    }
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    const current = String(row[colKey] ?? '');
    if (colConfig.type === 'number') {
      row[colKey] = '';
      cellNeedsOverwrite.value = false;
    } else if (cellNeedsOverwrite.value && colConfig.type !== 'string') {
      row[colKey] = '';
      cellNeedsOverwrite.value = false;
    } else {
      row[colKey] = current.slice(0, -1);
      cellNeedsOverwrite.value = false;
    }
    await saveRow(row);
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    row[colKey] = '';
    cellNeedsOverwrite.value = true;
    await saveRow(row);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    undoEdit();
    return;
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (colConfig.type === 'number') {
      const isFcOrCr = colConfig.key === 'fc' || colConfig.key === 'cr';
      const allowedRegex = isFcOrCr ? /[\d\.\/]/ : /[\d\.]/;
      if (allowedRegex.test(event.key)) {
        event.preventDefault();
        const current = String(row[colKey] ?? '');
        if (cellNeedsOverwrite.value) {
          row[colKey] = event.key;
          cellNeedsOverwrite.value = false;
        } else {
          if (event.key === '.' && current.includes('.')) return;
          if (event.key === '/' && current.includes('/')) return;
          row[colKey] = current + event.key;
        }
        await saveRow(row);
      }
    } else if (colConfig.type === 'select') {
      event.preventDefault();
      const options = colConfig.options || [];
      const current = String(row[colKey] ?? '');
      const typed = event.key;
      const candidate = (cellNeedsOverwrite.value ? typed : current + typed).toLowerCase();
      
      const exactMatch = options.find(opt => String(opt).toLowerCase() === candidate);
      if (exactMatch !== undefined) {
        row[colKey] = exactMatch;
        cellNeedsOverwrite.value = false;
        await saveRow(row);
        await move('right');
        return;
      }
      
      const prefixMatches = options.filter(opt => String(opt).toLowerCase().startsWith(candidate));
      if (prefixMatches.length === 1) {
        row[colKey] = prefixMatches[0];
        cellNeedsOverwrite.value = false;
        await saveRow(row);
        await move('right');
        return;
      } else if (prefixMatches.length > 1) {
        row[colKey] = cellNeedsOverwrite.value ? typed.toUpperCase() : current + typed.toUpperCase();
        cellNeedsOverwrite.value = false;
        await saveRow(row);
      }
    } else if (colConfig.type === 'string') {
      event.preventDefault();
      const current = String(row[colKey] ?? '');
      row[colKey] = current + event.key;
      cellNeedsOverwrite.value = false;
      await saveRow(row);
    }
  }
};

onMounted(async () => {
  if ('virtualKeyboard' in navigator) {
    (navigator as any).virtualKeyboard.overlaysContent = true;
  }

  updateFullscreenState();
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('click', closeMenu);
  document.addEventListener('keydown', handleGlobalKeydown);

  if (tableBox.value) {
    resizeObserver = new ResizeObserver(() => {
      updateFrozenOffsets();
    });
    resizeObserver.observe(tableBox.value);
    const table = tableBox.value.querySelector('table');
    if (table) resizeObserver.observe(table);
  }

  // Load lookups
  const loadLookup = async (feature: string) => (await db.lookups.where('feature').equals(feature).sortBy('code')).map(item => item.code);
  spOptions.value = await loadLookup('sp');
  stOptions.value = await loadLookup('s');
  ccOptions.value = await loadLookup('cc');
  cOptions.value = await loadLookup('c');
  gpOptions.value = await loadLookup('gp');

  await loadRows();
});

onBeforeUnmount(async () => {
  await commitEditCheck();
  document.removeEventListener('fullscreenchange', updateFullscreenState);
  document.removeEventListener('click', closeMenu);
  document.removeEventListener('keydown', handleGlobalKeydown);
  if (resizeObserver) resizeObserver.disconnect();
});

// Screen Lock
const isLocked = ref(false)
let wakeLock: WakeLockSentinel | null = null
let wakeLockTimeoutId: any = null

// Swipe variables
const startX = ref(0)
const currentX = ref(0)
const swipeX = ref(0)
const threshold = 150 // Minimum swipe distance in px

// Request Wake Lock
const requestWakeLock = async () => {
  if ('wakeLock' in navigator) {
    try {
      if (wakeLockTimeoutId) {
        clearTimeout(wakeLockTimeoutId)
        wakeLockTimeoutId = null
      }
      
      wakeLock = await navigator.wakeLock.request('screen')
      swipeX.value = 0
      isLocked.value = true
      
      const durationMin = store.maxWakeLockTime.value
      wakeLockTimeoutId = setTimeout(async () => {
        await unlockScreen()
        console.log(`Wake lock automatically released after ${durationMin} minutes.`)
      }, durationMin * 60 * 1000)
    } catch (err) {
      console.error('Wake lock failed:', err)
    }
  }
}

// Release Wake Lock
const releaseWakeLock = async () => {
  if (wakeLockTimeoutId) {
    clearTimeout(wakeLockTimeoutId)
    wakeLockTimeoutId = null
  }
  if (wakeLock) {
    await wakeLock.release()
    wakeLock = null
  }
}

// Swipe Handlers
const onTouchStart = (e: TouchEvent) => {
  startX.value = e.touches[0].clientX
  currentX.value = startX.value
}

const onTouchMove = (e: TouchEvent) => {
  currentX.value = e.touches[0].clientX
  const deltaX = currentX.value - startX.value
  
  // Constrain swipe within track (0 to 200px)
  if (deltaX > 0) {
    swipeX.value = Math.min(deltaX, 200)
  }
}

const onTouchEnd = () => {
  if (swipeX.value >= threshold) {
    unlockScreen()
    swipeX.value = 0
  } else {
    // Snap back if released too early
    swipeX.value = 0
  }
}

const unlockScreen = async () => {
  isLocked.value = false
  await releaseWakeLock()
}

// onMounted(async () => {
//   await requestWakeLock()
//   // Re-acquire wake lock if tab becomes visible again
//   document.addEventListener('visibilitychange', async () => {
//     if (isLocked.value && document.visibilityState === 'visible') {
//       await requestWakeLock()
//     }
//   })
// })

onUnmounted(async () => {
  await releaseWakeLock()
})

</script>

<style>
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

.table-container {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: auto;
  border-bottom: 2px solid var(--border-color);
}

table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
}

th {
  position: sticky;
  top: 0;
  background: var(--btn-bg);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  padding: 4px 6px;
  font-weight: 800;
  z-index: 10;
}

td {
  border-bottom: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  padding: 6px 4px;
  text-align: center;
  /* height: 40px; */
  background: var(--cell-bg);
  color: var(--text-primary);
}

.error-row td {
  background-color: rgba(239, 68, 68, 0.1) !important;
  color: #b91c1c !important;
}

.dark-mode .error-row td {
  background-color: rgba(239, 68, 68, 0.15) !important;
  color: #fca5a5 !important;
}

.freeze-col {
    position: sticky;
    z-index: 1; /* Keeps the column on top of regular scrolling data */
}
th.freeze-col {
    z-index: 20; /* Keeps frozen headers above normal headers */
  }

.active-cell {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: var(--active-cell-bg) !important;
  z-index: 99
}

.keypad-btn {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  /* height: 48px; */
  padding: 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.25rem;
  /* height: 2.5rem; */
  box-shadow: 0 2px 0 var(--border-color);
}

.keypad-btn:active {
  transform: translateY(2px);
  box-shadow: none;
  background: var(--accent);
  color: white;
}

.nav-btn {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* font-size: 1.75rem; */
  box-shadow: 0 2px 0 var(--border-color);
}

.chip {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 10px 15px;
  font-weight: 600;
  text-align: center;
  min-height: 44px;
  max-height: 40px;
}

.active-chip {
  background: var(--accent) !important;
  color: white !important;
}

.lock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.0);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: sans-serif;
}

.lock-content {
  text-align: center;
}

.swipe-area {
  margin-top: 30rem;
  width: 300px;
  height: 60px;
  background-color: rgba(46, 46, 46, 0.6);
  border-radius: 30px;
  position: relative;
  overflow: hidden;
  touch-action: none; /* Disables default browser scrolling/pinching during swipe */
}

.swipe-track {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;
}

.swipe-thumb {
  width: 50px;
  height: 50px;
  background-color: #fff;
  border-radius: 50%;
  position: absolute;
  left: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  cursor: pointer;
}

.select-dropdown {
  width: 100%;
  height: 100%;
  background: transparent;
  color: var(--text-primary);
  border: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  text-align: center;
  text-align-last: center;
  /* padding: 6px 20px 6px 4px; /* Add right padding to prevent dropdown arrow from obscuring values */
  cursor: pointer;
}
.select-dropdown option {
  background-color: var(--cell-bg);
  color: var(--text-primary);
}
</style>
