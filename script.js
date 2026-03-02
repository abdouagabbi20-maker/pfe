
// Application State
const AppState = {
    sources: {
        solar: { power: 2.5, voltage: 400, current: 6.3, pf: 0.98, frequency: 50, efficiency: 83 },
        wind: { power: 1.2, voltage: 398, current: 3.0, pf: 0.96, frequency: 50, efficiency: 60 },
        battery: { soc: 68, voltage: 384, current: 2.1, power: 0.5, charging: true },
        grid: { voltage: 230, frequency: 50, power: 0, status: 'connected' }
    },
    charges: {
        washing: { power: 0, voltage: 0, current: 0, energy: 0, active: false, nominal: 2000 },
        ac: { power: 1500, voltage: 230, current: 6.5, energy: 4.2, active: true, nominal: 1500 },
        heat: { power: 0, voltage: 0, current: 0, energy: 0, active: false, nominal: 2500 }
    },
    consumption: 3.7,
    evSoc: 68
};

const app = {
    init() {
        this.updateClock();
        this.renderDashboard();
        this.initCharts();
        this.startLiveUpdates();
        this.updateDeviceStatus();
        this.initPriorityDragDrop();
    },

    navigatePage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.nav-item')?.classList.add('active');
    },

    toggleTheme() {
        document.documentElement.style.colorScheme =
            document.documentElement.style.colorScheme === 'dark' ? 'light' : 'dark';
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen();
        }
    },

    toggleSource(btn, source) {
        btn.classList.toggle('on');
    },

    toggleCharge(btn, charge) {
        btn.classList.toggle('on');
        const card = btn.closest('.charge-card');
        const status = card.querySelector('.charge-status');
        const statusDot = status.querySelector('.status-dot');
        const statusLabel = status.querySelector('.status-label');

        if (btn.classList.contains('on')) {
            status.classList.add('on');
            statusDot.style.animation = 'pulse 2s infinite';
            statusLabel.textContent = 'En fonctionnement';
        } else {
            status.classList.remove('on');
            statusDot.style.animation = 'none';
            statusLabel.textContent = charge === 'washing' ? 'Arrêtée' : 'Arrêt';
        }
    },

    toggleChargeState(btn, charge) {
        const isOn = btn.textContent === 'Éteindre';
        btn.textContent = isOn ? 'Allumer' : 'Éteindre';

        const card = btn.closest('.charge-card');
        const toggle = card.querySelector('.charge-toggle');
        if (isOn) {
            toggle.classList.remove('on');
        } else {
            toggle.classList.add('on');
        }
        this.toggleCharge(toggle, charge);
    },

    updateSocMin(input) {
        document.getElementById('socMinVal').textContent = input.value + '%';
    },

    updateSocMax(input) {
        document.getElementById('socMaxVal').textContent = input.value + '%';
    },

    filterAlerts(btn, filter) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    updateClock() {
        const update = () => {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');

            document.getElementById('timeDisplay').textContent = `${h}:${m}:${s}`;
            document.getElementById('footerTime').textContent = `${h}:${m}:${s}`;

            const opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
            document.getElementById('dateDisplay').textContent = now.toLocaleDateString('fr-FR', opts);
        };

        update();
        setInterval(update, 1000);
    },

    renderDashboard() {
        // KPIs
        document.getElementById('kpi-solar').textContent = AppState.sources.solar.power.toFixed(1);
        document.getElementById('kpi-wind').textContent = AppState.sources.wind.power.toFixed(1);
        document.getElementById('kpi-battery').textContent = AppState.sources.battery.soc;
        document.getElementById('kpi-consumption').textContent = AppState.consumption.toFixed(1);

        // Flow
        document.getElementById('flow-solar-val').textContent = AppState.sources.solar.power.toFixed(1) + ' kW';
        document.getElementById('flow-wind-val').textContent = AppState.sources.wind.power.toFixed(1) + ' kW';
        document.getElementById('house-consumption').textContent = AppState.consumption.toFixed(1) + ' kW';

        // Resources
        document.getElementById('solar-power').textContent = AppState.sources.solar.power.toFixed(1) + ' kW';
        document.getElementById('wind-power').textContent = AppState.sources.wind.power.toFixed(1) + ' kW';
        document.getElementById('battery-soc-val').textContent = AppState.sources.battery.soc + ' %';

        // Battery
        document.getElementById('battery-soc').textContent = AppState.sources.battery.soc + '%';
        document.getElementById('ev-soc').textContent = AppState.evSoc + '%';

        // Devices
        this.updateDeviceStatus();
    },

    updateDeviceStatus() {
        const devices = ['ESP32 #1', 'ESP32 #2', 'ESP32 #3', 'ESP32 #4'];
        document.getElementById('deviceStatus').innerHTML = devices.map(d => `
          <div class="footer-device">
            <div class="footer-device-dot online"></div>
            <span>${d}</span>
          </div>
        `).join('');
    },

    initCharts() {
        this.drawProductionChart();
        this.drawDistributionChart();
        this.drawDailyChart();
    },

    drawProductionChart() {
        const canvas = document.getElementById('productionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.parentElement.offsetWidth;
        const height = 300;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const hours = ['0h', '2h', '4h', '6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
        const solarData = hours.map((_, i) => {
            const peak = Math.sin((i - 6) * Math.PI / 12) * 2.5;
            return Math.max(0, peak + (Math.random() - 0.5) * 0.3);
        });

        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;
        const maxValue = 4;

        // Background
        ctx.fillStyle = 'rgba(248, 250, 252, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (i / 4) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Solar line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        solarData.forEach((val, i) => {
            const x = padding.left + (i / (solarData.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - (val / maxValue) * graphHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Axes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
    },

    drawDistributionChart() {
        const canvas = document.getElementById('distributionChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 280 * dpr;
        canvas.height = 280 * dpr;
        ctx.scale(dpr, dpr);

        const segments = [
            { val: 0, color: '#f59e0b' },
            { val: 1.5, color: '#06b6d4' },
            { val: 0, color: '#f97316' },
            { val: 3.7, color: '#4f46e5' }
        ];
        const total = segments.reduce((s, seg) => s + seg.val, 0);

        const cx = 140, cy = 140, R = 100, r = 60;
        let angle = -Math.PI / 2;

        segments.forEach(seg => {
            if (seg.val === 0) return;
            const sweep = (seg.val / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
            ctx.arc(cx, cy, R, angle, angle + sweep);
            ctx.arc(cx, cy, r, angle + sweep, angle, true);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            angle += sweep;
        });

        // Inner
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    },

    drawDailyChart() {
        const canvas = document.getElementById('dailyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.parentElement.offsetWidth;
        const height = 320;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const data = Array.from({ length: 24 }, () => 2 + Math.random() * 2);
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;
        const barWidth = (graphWidth / data.length) * 0.6;
        const barGap = (graphWidth / data.length) * 0.2;

        // Background
        ctx.fillStyle = 'rgba(248, 250, 252, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Bars
        ctx.fillStyle = '#4f46e5';
        data.forEach((val, i) => {
            const barX = padding.left + (i * (barWidth + barGap)) + barGap / 2;
            const barH = (val / 4) * graphHeight;
            const barY = padding.top + graphHeight - barH;
            ctx.fillRect(barX, barY, barWidth, barH);
        });
    },

    startLiveUpdates() {
        setInterval(() => {
            // Battery
            AppState.sources.battery.soc = Math.min(100, AppState.sources.battery.soc + 0.5);

            // EV
            AppState.evSoc = Math.min(100, AppState.evSoc + 0.3);

            // Solar variation
            const solarVar = 2.5 + Math.sin(Date.now() / 5000) * 0.5;
            AppState.sources.solar.power = Math.max(0, solarVar);
            AppState.sources.solar.efficiency = Math.round((solarVar / 3) * 100);

            // Wind variation
            const windVar = 1.2 + Math.sin(Date.now() / 7000 + 2) * 0.3;
            AppState.sources.wind.power = Math.max(0, windVar);
            AppState.sources.wind.efficiency = Math.round((windVar / 1.5) * 100);

            this.renderDashboard();
        }, 2000);
    },

    toggleProfileMenu() {
        const menu = document.getElementById('profileMenu');
        menu.classList.toggle('show');
    },

    closeProfileMenu() {
        const menu = document.getElementById('profileMenu');
        menu.classList.remove('show');
    },

    saveProfile() {
        const name = document.getElementById('profileName').value;
        const password = document.getElementById('profilePassword').value;
        localStorage.setItem('userName', name);
        if (password) {
            localStorage.setItem('userPassword', password);
        }
        this.closeProfileMenu();
        alert('Profil sauvegardé avec succès!');
    },

    initPriorityDragDrop() {
        const priorityList = document.getElementById('priorityList');
        if (!priorityList) return;

        const items = priorityList.querySelectorAll('.priority-item');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                items.forEach(i => i.classList.remove('drag-over'));
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (item !== draggedItem) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (item !== draggedItem) {
                    const allItems = Array.from(priorityList.querySelectorAll('.priority-item'));
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const targetIndex = allItems.indexOf(item);

                    if (draggedIndex < targetIndex) {
                        item.parentNode.insertBefore(draggedItem, item.nextSibling);
                    } else {
                        item.parentNode.insertBefore(draggedItem, item);
                    }

                    this.updatePriorityBadges();
                    item.classList.remove('drag-over');
                }
            });
        });
    },

    updatePriorityBadges() {
        const priorityList = document.getElementById('priorityList');
        if (!priorityList) return;

        const items = priorityList.querySelectorAll('.priority-item');
        items.forEach((item, index) => {
            const badge = item.querySelector('.priority-badge');
            badge.textContent = (index + 1);
        });
    },

    toggleTheme() {
        // Fonction vide - le thème sombre n'est plus disponible
        console.log('Thème non disponible');
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();

    // Fermer le menu profil quand on clique ailleurs
    document.addEventListener('click', (e) => {
        const profileBtn = document.querySelector('.profile-btn');
        const profileMenu = document.getElementById('profileMenu');
        if (profileBtn && profileMenu && !profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    });
});

