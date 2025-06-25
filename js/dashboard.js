/**
 * Dashboard.js - Sistema de gestión del dashboard principal
 * Maneja la inicialización y funcionalidad del panel de control
 */

class Dashboard {
    constructor() {
        this.isInitialized = false;
        this.widgets = new Map();
        this.analytics = {
            pageViews: 0,
            sessionStart: Date.now(),
            interactions: []
        };
        this.config = {
            autoRefresh: true,
            refreshInterval: 30000, // 30 segundos
            theme: 'light'
        };
        
        this.init();
    }

    /**
     * Inicializa el dashboard
     */
    async init() {
        try {
            console.log('[Dashboard] Inicializando dashboard...');
            
            // Esperar a que el DOM esté listo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
            
        } catch (error) {
            console.error('[Dashboard] Error en inicialización:', error);
        }
    }

    /**
     * Configuración principal del dashboard
     */
    async setup() {
        try {
            // Inicializar componentes básicos
            this.setupEventListeners();
            this.loadUserPreferences();
            this.initializeWidgets();
            this.startAutoRefresh();
            
            // Cargar datos iniciales
            await this.loadDashboardData();
            
            this.isInitialized = true;
            console.log('[Dashboard] Dashboard inicializado correctamente');
            
            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('dashboardReady', {
                detail: { dashboard: this }
            }));
            
        } catch (error) {
            console.error('[Dashboard] Error en setup:', error);
        }
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Listener para cambios de tema
        document.addEventListener('themeChange', (e) => {
            this.handleThemeChange(e.detail.theme);
        });

        // Listener para resize de ventana
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Listener para visibilidad de página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });

        // Listeners para navegación
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-dashboard-action]')) {
                this.handleDashboardAction(e);
            }
        });
    }

    /**
     * Inicializa los widgets del dashboard
     */
    initializeWidgets() {
        const widgetConfigs = [
            { id: 'stats', type: 'statistics', container: '#stats-widget' },
            { id: 'charts', type: 'charts', container: '#charts-widget' },
            { id: 'activity', type: 'activity', container: '#activity-widget' },
            { id: 'notifications', type: 'notifications', container: '#notifications-widget' }
        ];

        widgetConfigs.forEach(config => {
            try {
                const widget = new DashboardWidget(config);
                this.widgets.set(config.id, widget);
            } catch (error) {
                console.warn(`[Dashboard] No se pudo inicializar widget ${config.id}:`, error);
            }
        });
    }

    /**
     * Carga datos del dashboard
     */
    async loadDashboardData() {
        try {
            const endpoints = {
                stats: '/api/dashboard/stats',
                activity: '/api/dashboard/activity',
                notifications: '/api/dashboard/notifications'
            };

            const promises = Object.entries(endpoints).map(async ([key, url]) => {
                try {
                    const response = await this.fetchWithAuth(url);
                    return { key, data: response };
                } catch (error) {
                    console.warn(`[Dashboard] Error cargando ${key}:`, error);
                    return { key, data: null };
                }
            });

            const results = await Promise.all(promises);
            
            results.forEach(({ key, data }) => {
                if (data) {
                    this.updateWidgetData(key, data);
                }
            });

        } catch (error) {
            console.error('[Dashboard] Error cargando datos:', error);
        }
    }

    /**
     * Actualiza datos de un widget específico
     */
    updateWidgetData(widgetId, data) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.updateData(data);
        } else {
            // Si no hay widget, actualizar elemento DOM directamente
            this.updateDOMElement(widgetId, data);
        }
    }

    /**
     * Actualiza elementos DOM con datos
     */
    updateDOMElement(elementId, data) {
        const element = document.getElementById(`${elementId}-widget`);
        if (!element) return;

        switch (elementId) {
            case 'stats':
                this.updateStatsWidget(element, data);
                break;
            case 'activity':
                this.updateActivityWidget(element, data);
                break;
            case 'notifications':
                this.updateNotificationsWidget(element, data);
                break;
        }
    }

    /**
     * Actualiza widget de estadísticas
     */
    updateStatsWidget(element, data) {
        const template = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Usuarios Activos</h3>
                    <span class="stat-number">${data.activeUsers || 0}</span>
                </div>
                <div class="stat-card">
                    <h3>Ventas Hoy</h3>
                    <span class="stat-number">${data.todaySales || 0}</span>
                </div>
                <div class="stat-card">
                    <h3>Ingresos</h3>
                    <span class="stat-number">$${data.revenue || 0}</span>
                </div>
                <div class="stat-card">
                    <h3>Conversión</h3>
                    <span class="stat-number">${data.conversionRate || 0}%</span>
                </div>
            </div>
        `;
        element.innerHTML = template;
    }

    /**
     * Actualiza widget de actividad
     */
    updateActivityWidget(element, data) {
        if (!data.activities) return;

        const activities = data.activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${this.formatTime(activity.time)}</span>
                <span class="activity-text">${activity.description}</span>
            </div>
        `).join('');

        element.innerHTML = `
            <div class="activity-feed">
                <h3>Actividad Reciente</h3>
                ${activities}
            </div>
        `;
    }

    /**
     * Actualiza widget de notificaciones
     */
    updateNotificationsWidget(element, data) {
        if (!data.notifications) return;

        const notifications = data.notifications.map(notification => `
            <div class="notification-item ${notification.type}">
                <span class="notification-title">${notification.title}</span>
                <span class="notification-message">${notification.message}</span>
                <span class="notification-time">${this.formatTime(notification.time)}</span>
            </div>
        `).join('');

        element.innerHTML = `
            <div class="notifications-list">
                <h3>Notificaciones</h3>
                ${notifications}
            </div>
        `;
    }

    /**
     * Maneja acciones del dashboard
     */
    handleDashboardAction(event) {
        event.preventDefault();
        const action = event.target.getAttribute('data-dashboard-action');
        const target = event.target.getAttribute('data-target');

        switch (action) {
            case 'refresh':
                this.refreshWidget(target);
                break;
            case 'toggle':
                this.toggleWidget(target);
                break;
            case 'export':
                this.exportData(target);
                break;
            case 'settings':
                this.openSettings();
                break;
        }
    }

    /**
     * Refresca un widget específico
     */
    async refreshWidget(widgetId) {
        try {
            console.log(`[Dashboard] Refrescando widget: ${widgetId}`);
            await this.loadDashboardData();
        } catch (error) {
            console.error('[Dashboard] Error refrescando widget:', error);
        }
    }

    /**
     * Inicia auto-refresh
     */
    startAutoRefresh() {
        if (this.config.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                if (!document.hidden) {
                    this.loadDashboardData();
                }
            }, this.config.refreshInterval);
        }
    }

    /**
     * Pausa auto-refresh
     */
    pauseAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    /**
     * Reanuda auto-refresh
     */
    resumeAutoRefresh() {
        this.startAutoRefresh();
    }

    /**
     * Fetch con autenticación
     */
    async fetchWithAuth(url) {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Carga preferencias del usuario
     */
    loadUserPreferences() {
        const prefs = localStorage.getItem('dashboardPreferences');
        if (prefs) {
            try {
                this.config = { ...this.config, ...JSON.parse(prefs) };
            } catch (error) {
                console.warn('[Dashboard] Error cargando preferencias:', error);
            }
        }
    }

    /**
     * Guarda preferencias del usuario
     */
    saveUserPreferences() {
        localStorage.setItem('dashboardPreferences', JSON.stringify(this.config));
    }

    /**
     * Maneja cambio de tema
     */
    handleThemeChange(theme) {
        this.config.theme = theme;
        document.body.className = `theme-${theme}`;
        this.saveUserPreferences();
    }

    /**
     * Maneja redimensionamiento
     */
    handleResize() {
        this.widgets.forEach(widget => {
            if (widget.handleResize) {
                widget.handleResize();
            }
        });
    }

    /**
     * Formatea tiempo para mostrar
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // menos de 1 minuto
            return 'hace un momento';
        } else if (diff < 3600000) { // menos de 1 hora
            return `hace ${Math.floor(diff / 60000)} min`;
        } else if (diff < 86400000) { // menos de 1 día
            return `hace ${Math.floor(diff / 3600000)} h`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
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

    /**
     * Obtiene instancia del dashboard
     */
    static getInstance() {
        if (!Dashboard.instance) {
            Dashboard.instance = new Dashboard();
        }
        return Dashboard.instance;
    }
}

/**
 * Clase para widgets individuales del dashboard
 */
class DashboardWidget {
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.container = document.querySelector(config.container);
        this.data = null;
        
        if (!this.container) {
            throw new Error(`Container not found: ${config.container}`);
        }
        
        this.init();
    }

    init() {
        this.container.classList.add('dashboard-widget', `widget-${this.type}`);
    }

    updateData(data) {
        this.data = data;
        this.render();
    }

    render() {
        // Implementación específica por tipo de widget
        console.log(`[Widget] Renderizando widget ${this.id}`, this.data);
    }

    handleResize() {
        // Manejar redimensionamiento del widget
        console.log(`[Widget] Redimensionando widget ${this.id}`);
    }
}

// Inicializar dashboard cuando se carga el script
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
    
    // Auto-inicializar si no existe ya una instancia
    if (!window.dashboardInstance) {
        window.dashboardInstance = Dashboard.getInstance();
    }
    
    console.log('[Dashboard] dashboard.js cargado correctamente');
}