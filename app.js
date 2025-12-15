// Google Sheets Configuration (loaded from config.js)
const SPREADSHEET_ID = CONFIG.SPREADSHEET_ID;

// Default year is current year
const currentCalendarYear = new Date().getFullYear();
const DEFAULT_YEAR = (currentCalendarYear).toString();

// Global state
let availableYears = [];
let currentYear = DEFAULT_YEAR;
let allData = [];
let filteredData = [];
let availableMonths = []; // Meses disponibles detectados del Excel
let currentMonth = ''; // Mes actualmente seleccionado
let monthColumns = {}; // Mapeo de mes -> índice de columna

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const dataSectionEl = document.getElementById('data-section');
const tableBodyEl = document.getElementById('table-body');
const searchInputEl = document.getElementById('search-input');
const filterDisponiblesEl = document.getElementById('filter-disponibles');
const totalDisponiblesEl = document.getElementById('total-disponibles');
const totalOcupadosEl = document.getElementById('total-ocupados');
const totalCamposEl = document.getElementById('total-campos');
const totalServiciosEl = document.getElementById('total-servicios');
const lastUpdateTimeEl = document.getElementById('last-update-time');
const yearTabsEl = document.getElementById('year-tabs');
const yearScrollLeftEl = document.getElementById('year-scroll-left');
const yearScrollRightEl = document.getElementById('year-scroll-right');
const monthSelectorEl = document.getElementById('month-selector');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
    setupMobileView();
    window.addEventListener('resize', debounce(setupMobileView, 200));
});

// Setup mobile view - hide/show columns based on screen width
function setupMobileView() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile-view', isMobile);
}

// Setup event listeners
function setupEventListeners() {
    searchInputEl.addEventListener('input', debounce(filterData, 300));
    filterDisponiblesEl.addEventListener('change', filterData);
    
    // Month selector change handler
    monthSelectorEl.addEventListener('change', (e) => {
        currentMonth = e.target.value;
        processAndRenderData();
    });
    
    // Year tab click handlers (delegated)
    yearTabsEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('year-tab')) {
            const year = e.target.dataset.year;
            if (year !== currentYear) {
                currentYear = year;
                updateYearTabs();
                loadData();
            }
        }
    });
    
    // Year scroll button handlers
    yearScrollLeftEl.addEventListener('click', () => scrollYearTabs('left'));
    yearScrollRightEl.addEventListener('click', () => scrollYearTabs('right'));
    
    // Recalculate scroll on window resize
    window.addEventListener('resize', debounce(setupYearScroll, 200));
}

// Initialize app
async function initializeApp() {
    showLoading();
    try {
        await detectAvailableSheets();
        renderYearTabs();
        await loadData();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError();
    }
}

// Detect available year sheets from the spreadsheet
async function detectAvailableSheets() {
    // Years range: from 2024 to current year + 1
    // Example: if 2025, range is 2024, 2025, 2026, 2027
    const startYear = 2024;
    const endYear = currentCalendarYear + 1;
    
    const yearsToTry = [];
    for (let y = startYear; y <= endYear; y++) {
        yearsToTry.push(y.toString());
    }
    
    const validYears = [];
    
    // Check each year - only add if sheet exists
    for (const year of yearsToTry) {
        const exists = await checkSheetExists(year);
        if (exists) {
            validYears.push(year);
        }
    }
    
    availableYears = validYears;
    
    // Set current year to default (current+1) if available, otherwise use the latest available
    if (availableYears.includes(DEFAULT_YEAR)) {
        currentYear = DEFAULT_YEAR;
    } else if (availableYears.length > 0) {
        currentYear = availableYears[availableYears.length - 1];
    }
}

// Check if a specific sheet exists by querying it
async function checkSheetExists(sheetName) {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        
        // If response contains "error" status, sheet doesn't exist
        // Google returns: {"status":"error","errors":[...]} for non-existent sheets
        if (text.includes('"status":"error"')) {
            return false;
        }
        
        // Sheet exists if we got a valid response with "status":"ok"
        return text.includes('"status":"ok"');
    } catch (e) {
        return false;
    }
}

// Render year tabs dynamically
function renderYearTabs() {
    yearTabsEl.innerHTML = '';
    
    availableYears.forEach(year => {
        const button = document.createElement('button');
        button.className = 'year-tab' + (year === currentYear ? ' active' : '');
        button.dataset.year = year;
        button.textContent = year;
        yearTabsEl.appendChild(button);
    });
    
    // Setup scroll functionality after rendering
    setupYearScroll();
}

// Year tabs scroll position
let yearScrollPosition = 0;

// Setup year tabs horizontal scroll with arrows
function setupYearScroll() {
    const wrapper = yearTabsEl.parentElement;
    const tabsWidth = yearTabsEl.scrollWidth;
    const wrapperWidth = wrapper.offsetWidth;
    
    // Only show arrows if content overflows
    if (tabsWidth > wrapperWidth) {
        yearScrollLeftEl.classList.remove('hidden');
        yearScrollRightEl.classList.remove('hidden');
        updateScrollButtons();
    } else {
        yearScrollLeftEl.classList.add('hidden');
        yearScrollRightEl.classList.add('hidden');
        yearScrollPosition = 0;
        yearTabsEl.style.transform = 'translateX(0)';
    }
}

// Update scroll button visibility based on position
function updateScrollButtons() {
    const wrapper = yearTabsEl.parentElement;
    const tabsWidth = yearTabsEl.scrollWidth;
    const wrapperWidth = wrapper.offsetWidth;
    const maxScroll = tabsWidth - wrapperWidth;
    
    // Hide left arrow if at start
    if (yearScrollPosition <= 0) {
        yearScrollLeftEl.classList.add('hidden');
    } else {
        yearScrollLeftEl.classList.remove('hidden');
    }
    
    // Hide right arrow if at end
    if (yearScrollPosition >= maxScroll) {
        yearScrollRightEl.classList.add('hidden');
    } else {
        yearScrollRightEl.classList.remove('hidden');
    }
}

// Scroll year tabs
function scrollYearTabs(direction) {
    const wrapper = yearTabsEl.parentElement;
    const tabsWidth = yearTabsEl.scrollWidth;
    const wrapperWidth = wrapper.offsetWidth;
    const maxScroll = tabsWidth - wrapperWidth;
    const scrollAmount = 150;
    
    if (direction === 'left') {
        yearScrollPosition = Math.max(0, yearScrollPosition - scrollAmount);
    } else {
        yearScrollPosition = Math.min(maxScroll, yearScrollPosition + scrollAmount);
    }
    
    yearTabsEl.style.transform = `translateX(-${yearScrollPosition}px)`;
    updateScrollButtons();
}

// Update year tab active state
function updateYearTabs() {
    document.querySelectorAll('.year-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.year === currentYear);
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load data from Google Sheets
async function loadData() {
    showLoading();
    
    try {
        // Using Google Visualization API Query to fetch data by sheet name
        const sheetName = encodeURIComponent(currentYear);
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Parse the JSONP response
        const jsonString = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
        const json = JSON.parse(jsonString);
        
        if (json.status === 'error') {
            throw new Error(json.errors[0].message);
        }
        
        // Store raw rows for processing
        const rows = json.table.rows;
        
        // Detect available months from the header row (row 2 in Excel = index 1)
        detectMonthColumns(rows);
        
        // Populate month selector
        populateMonthSelector();
        
        // Process and render data
        processAndRenderData(rows);
        showData();
        
        // Update last update time
        lastUpdateTimeEl.textContent = new Date().toLocaleString('es-PE', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError();
    }
}

// Store raw rows globally for reprocessing when month changes
let rawRows = [];

// Month columns mapping (Excel column letters to 0-based index)
// ENERO=I(8), FEBRERO=S(18), MARZO=AC(28), ABRIL=AM(38), MAYO=AW(48), JUNIO=BG(58)
// JULIO=BQ(68), AGOSTO=CA(78), SETIEMBRE=CK(88), OCTUBRE=CU(98), NOVIEMBRE=DE(108), DICIEMBRE=DO(118)
const MONTH_COLUMN_MAP = {
    'ENERO': 8,       // Column I
    'FEBRERO': 18,    // Column S
    'MARZO': 28,      // Column AC
    'ABRIL': 38,      // Column AM
    'MAYO': 48,       // Column AW
    'JUNIO': 58,      // Column BG
    'JULIO': 68,      // Column BQ
    'AGOSTO': 78,     // Column CA
    'SETIEMBRE': 88,  // Column CK
    'OCTUBRE': 98,    // Column CU
    'NOVIEMBRE': 108, // Column DE
    'DICIEMBRE': 118  // Column DO
};

// Initialize month columns from fixed mapping
function detectMonthColumns(rows) {
    rawRows = rows;
    
    // Use the fixed column mapping
    monthColumns = { ...MONTH_COLUMN_MAP };
    
    // Ordered month names array (index 0 = January, index 11 = December)
    const orderedMonths = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    availableMonths = orderedMonths;
    
    // Set current month to current calendar month (getMonth() returns 0-11)
    const currentMonthIndex = new Date().getMonth();
    currentMonth = orderedMonths[currentMonthIndex];
}

// Populate month selector dropdown
function populateMonthSelector() {
    monthSelectorEl.innerHTML = '';
    
    const monthDisplayNames = {
        'ENERO': 'Enero', 'FEBRERO': 'Febrero', 'MARZO': 'Marzo',
        'ABRIL': 'Abril', 'MAYO': 'Mayo', 'JUNIO': 'Junio',
        'JULIO': 'Julio', 'AGOSTO': 'Agosto', 'SETIEMBRE': 'Setiembre',
        'OCTUBRE': 'Octubre', 'NOVIEMBRE': 'Noviembre', 'DICIEMBRE': 'Diciembre'
    };
    
    availableMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = monthDisplayNames[month] || month;
        option.selected = month === currentMonth;
        monthSelectorEl.appendChild(option);
    });
}

// Process and render data for the selected month
function processAndRenderData(rows = null) {
    if (rows) rawRows = rows;
    
    allData = processSheetData(rawRows);
    
    if (allData.length === 0) {
        console.warn('No se encontraron datos en la hoja');
    }
    
    filterData();
}

// Process sheet data - group by service and calculate availability
function processSheetData(rows) {
    const serviceMap = new Map();
    let currentUnidad = '';
    let currentSubUnidad = '';
    let currentServicio = '';
    let currentTutor = '';
    
    // Get the column index for the selected month (default to column I = index 8)
    const monthColIndex = monthColumns[currentMonth] || 8;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.c) continue;
        
        // Get cell values
        const cellA = getCellValue(row.c[0]); // UNIDADES
        const cellB = getCellValue(row.c[1]); // SUB UNIDADES
        const cellC = getCellValue(row.c[2]); // SERVICIOS A ROTAR
        const cellD = getCellValue(row.c[3]); // TUTOR DE SERVICIO
        const cellE = getCellValue(row.c[4]); // N° DE CAMPOS CLÍNICOS
        const cellMonth = getCellValue(row.c[monthColIndex]); // Column for selected month
        
        // Skip header rows
        if (cellA === 'UNIDADES' || cellA === 'N°' || cellC === 'SERVICIOS A ROTAR') {
            continue;
        }
        
        // Skip summary/total rows at the bottom of each sheet
        const summaryKeywords = ['TOTAL', 'RESIDENTES', 'PROGRAMADOS', 'ASISTIERON', 'FALTARON'];
        const rowText = `${cellA} ${cellB} ${cellC} ${cellD}`.toUpperCase();
        if (summaryKeywords.some(keyword => rowText.includes(keyword))) {
            continue;
        }
        
        // Skip completely empty rows
        if (!cellA && !cellB && !cellC && !cellD && !cellE && !cellMonth) {
            continue;
        }
        
        // Update current values for merged cells (carry forward from previous row)
        if (cellA) currentUnidad = cellA;
        if (cellB) currentSubUnidad = cellB;
        if (cellC) currentServicio = cellC;
        if (cellD) currentTutor = cellD;
        
        // Skip if no service defined yet
        if (!currentServicio) continue;
        
        // Create a unique key for this service (combination of unidad + subunidad + servicio)
        const serviceKey = `${currentUnidad}|${currentSubUnidad}|${currentServicio}`;
        
        // Parse N° DE CAMPOS CLÍNICOS from column E
        const numCampos = parseInt(cellE) || 0;
        
        // Initialize service entry if not exists
        if (!serviceMap.has(serviceKey)) {
            serviceMap.set(serviceKey, {
                unidad: currentUnidad || '-',
                subUnidad: currentSubUnidad || '-',
                servicio: currentServicio,
                tutor: currentTutor || '-',
                totalCampos: 0,
                ocupados: 0
            });
        }
        
        const service = serviceMap.get(serviceKey);
        
        // Update tutor if we got a new one
        if (cellD) {
            service.tutor = cellD;
        }
        
        // SUM the value from column E (N° DE CAMPOS CLÍNICOS)
        // Each row with a valid numCampos contributes to the total
        if (numCampos > 0) {
            service.totalCampos += numCampos;
        }
        
        // Check if selected month column has a name (occupied)
        if (cellMonth && isValidName(cellMonth)) {
            service.ocupados++;
        }
    }
    
    // Convert map to array and calculate availability (min 0, no negativos)
    return Array.from(serviceMap.values()).map(service => ({
        ...service,
        disponibles: Math.max(0, service.totalCampos - service.ocupados)
    }));
}

// Get cell value safely
function getCellValue(cell) {
    if (!cell) return '';
    const value = cell.v;
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value.toString();
    return String(value).trim();
}

// Check if value looks like a valid resident name (not a header or empty)
function isValidName(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim().toUpperCase();
    
    // Skip if it's a header or common non-name values
    const invalidValues = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SETIEMBRE', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
        'MES', 'NOMBRE', 'RESIDENTE', 'N°', 'REQUISITOS', ''
    ];
    
    if (invalidValues.includes(trimmed)) return false;
    
    // Must have at least 3 characters to be considered a name
    return trimmed.length >= 3;
}


// Filter data based on search and availability toggle
function filterData() {
    const searchTerm = searchInputEl.value.toLowerCase().trim();
    const onlyAvailable = filterDisponiblesEl.checked;
    
    filteredData = allData.filter(item => {
        // Filter by availability
        if (onlyAvailable && item.disponibles <= 0) {
            return false;
        }
        
        // Filter by search term (only servicio and tutor)
        if (searchTerm) {
            const searchFields = [
                item.servicio,
                item.tutor
            ].map(f => (f || '').toLowerCase());
            
            return searchFields.some(field => field.includes(searchTerm));
        }
        
        return true;
    });
    
    renderTable();
    updateStats();
}

// Render table with data
function renderTable() {
    tableBodyEl.innerHTML = '';
    
    if (filteredData.length === 0) {
        tableBodyEl.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: var(--gray-500);">
                    No se encontraron resultados para su búsqueda.
                </td>
            </tr>
        `;
        return;
    }
    
    filteredData.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${Math.min(index * 0.03, 0.3)}s`;
        
        // Determine badge class based on disponibles value
        let badgeClass = 'campos-zero';
        if (item.disponibles >= 3) {
            badgeClass = 'campos-high';
        } else if (item.disponibles >= 1) {
            badgeClass = 'campos-medium';
        } else if (item.disponibles === 0 && item.totalCampos > 0) {
            badgeClass = 'campos-low';
        }
        
        tr.innerHTML = `
            <td class="col-unidad">${escapeHtml(item.unidad)}</td>
            <td class="col-subunidad">${escapeHtml(item.subUnidad)}</td>
            <td class="col-servicio">${escapeHtml(item.servicio)}</td>
            <td class="col-tutor">${escapeHtml(item.tutor)}</td>
            <td class="col-total"><span class="campos-badge campos-total-badge">${item.totalCampos}</span></td>
            <td class="col-ocupados"><span class="campos-badge campos-occupied-badge">${item.ocupados}</span></td>
            <td class="col-disponibles"><span class="campos-badge ${badgeClass}">${item.disponibles}</span></td>
        `;
        
        tableBodyEl.appendChild(tr);
    });
}

// Update statistics
function updateStats() {
    const totalDisponibles = filteredData.reduce((sum, item) => sum + item.disponibles, 0);
    const totalOcupados = filteredData.reduce((sum, item) => sum + item.ocupados, 0);
    const totalCampos = filteredData.reduce((sum, item) => sum + item.totalCampos, 0);
    const totalServicios = filteredData.length;
    
    // Animate numbers
    animateNumber(totalDisponiblesEl, totalDisponibles);
    animateNumber(totalOcupadosEl, totalOcupados);
    animateNumber(totalCamposEl, totalCampos);
    animateNumber(totalServiciosEl, totalServicios);
}

// Animate number change
function animateNumber(element, targetValue) {
    const duration = 500;
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '-';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// UI State functions
function showLoading() {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    dataSectionEl.classList.add('hidden');
}

function showError() {
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    dataSectionEl.classList.add('hidden');
}

function showData() {
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    dataSectionEl.classList.remove('hidden');
}

// Auto-refresh data every 5 minutes
setInterval(loadData, 5 * 60 * 1000);
