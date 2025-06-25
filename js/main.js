/**
 * Archivo Principal de JavaScript
 * Punto de entrada y coordinador de la aplicación
 */

// ===== ESTADO GLOBAL DE LA APLICACIÓN =====
window.App = {
    version: '2.0',
    initialized: false,
    modules: {},
    config: {
        debug: true,
        apiTimeout: 30000,
        sessionCheckInterval: 300000, // 5 minutos
        notificationDuration: 5000
    },
    
    // Estado de la aplicación
    state: {
        user: null,
        currentSection: 'dashboard',
        isLoading: false,
        isOnline: navigator.onLine
    },
    
    // Métodos principales
    init() {
        Logger.info('Iniciando aplicación...');
        
        try {
            this.setupGlobalHandlers();
            this.initializeModules();
            this.setupNetworkDetection();
            this.setupServiceWorker();
            this.markAsInitialized();
            
            Logger.info('Aplicación inicializada correctamente');
            EventBus.emit('app:initialized');
            
        } catch (error) {
            Logger.error('Error inicializando aplicación:', error);
            this.showCriticalError('Error al inicializar la aplicación');
        }
    },
    
    setupGlobalHandlers() {
        // Manejo global de errores
        window.addEventListener('error', (event) => {
            Logger.error('Error global:', event.error);
            this.handleGlobalError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            Logger.error('Promise rechazada:', event.reason);
            this.handleGlobalError(event.reason);
        });
        
        // Manejo de cambios de visibilidad
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && window.authManager?.isAuthenticated()) {
                window.authManager.checkSession();
            }
        });
        
        // Manejo de teclas globales
        document.addEventListener('keydown', (event) => {
            this.handleGlobalKeyDown(event);
        });
        
        // Prevenir envío accidental de formularios
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.type !== 'submit' && event.target.tagName !== 'TEXTAREA') {
                const form = event.target.closest('form');
                if (form && !event.target.matches('button[type="submit"], input[type="submit"]')) {
                    event.preventDefault();
                }
            }
        });
    },
    
    initializeModules() {
        Logger.info('Inicializando módulos...');
        
        // Los módulos se inicializan automáticamente en sus archivos respectivos
        // Aquí solo verificamos que estén disponibles
        const requiredModules = ['authManager', 'Utils', 'EventBus', 'Logger'];
        
        requiredModules.forEach(module => {
            if (!window[module]) {
                throw new Error(`Módulo requerido no encontrado: ${module}`);
            }
        });
        
        Logger.info('Todos los módulos requeridos están disponibles');
    },
    
    setupNetworkDetection() {
        // Detectar cambios en la conectividad
        window.addEventListener('online', () => {
            this.state.isOnline = true;
            this.showNotification('Conexión restaurada', 'success');
            EventBus.emit('network:online');
        });
        
        window.addEventListener('offline', () => {
            this.state.isOnline = false;
            this.showNotification('Sin conexión a internet', 'warning');
            EventBus.emit('network:offline');
        });
    },
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    Logger.info('Service Worker registrado:', registration);
                })
                .catch(error => {
                    Logger.warn('Error registrando Service Worker:', error);
                });
        }
    },
    
    markAsInitialized() {
        this.initialized = true;
        document.body.classList.add('app-initialized');
    },
    
    handleGlobalError(error) {
        // No mostrar errores menores en producción
        if (!this.config.debug && error.name === 'TypeError') {
            return;
        }
        
        this.showNotification('Se ha producido un error inesperado', 'error');
    },
    
    handleGlobalKeyDown(event) {
        // Atajos de teclado globales
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    // Ctrl+K para búsqueda rápida
                    event.preventDefault();
                    this.openQuickSearch();
                    break;
                case 'l':
                    // Ctrl+L para logout
                    if (window.authManager?.isAuthenticated()) {
                        event.preventDefault();
                        window.authManager.logout();
                    }
                    break;
            }
        }
        
        // Escape para cerrar modales
        if (event.key === 'Escape') {
            this.closeAllModals();
        }
    },
    
    openQuickSearch() {
        // Implementar búsqueda rápida
        Logger.info('Abriendo búsqueda rápida...');
        // TODO: Implementar modal de búsqueda
    },
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
        document.body.style.overflow = 'auto';
    },
    
    showNotification(message, type = 'info', duration = null) {
        if (window.showNotification) {
            window.showNotification(message, type, duration || this.config.notificationDuration);
        }
    },
    
    showCriticalError(message) {
        // Mostrar error crítico que requiere recarga
        const errorDiv = document.createElement('div');
        errorDiv.className = 'critical-error';
        errorDiv.innerHTML = `
            <div class="critical-error-content">
                <h2>Error Crítico</h2>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    Recargar Página
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    },
    
    // Métodos de utilidad
    navigate(section) {
        if (this.state.currentSection !== section) {
            this.state.currentSection = section;
            EventBus.emit('navigation:change', section);
        }
    },
    
    setLoading(loading) {
        this.state.isLoading = loading;
        if (loading) {
            Utils.showLoading();
        } else {
            Utils.hideLoading();
        }
    },
    
    updateUser(user) {
        this.state.user = user;
        EventBus.emit('user:updated', user);
    },
    
    // Getters
    getUser() {
        return this.state.user;
    },
    
    isOnline() {
        return this.state.isOnline;
    },
    
    getCurrentSection() {
        return this.state.currentSection;
    }
};

// ===== MANEJO DE CARGA DE LA PÁGINA =====

// Detectar cuando el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

function initializeApp() {
    Logger.info('DOM listo, inicializando aplicación...');
    
    // Esperar a que todos los módulos estén cargados
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkModules = () => {
        attempts++;
        
        // Verificar que los módulos críticos estén disponibles
        if (window.Utils && window.EventBus && window.Logger) {
            App.init();
        } else if (attempts < maxAttempts) {
            setTimeout(checkModules, 100);
        } else {
            console.error('Error: No se pudieron cargar todos los módulos requeridos');
            App.showCriticalError('Error cargando módulos del sistema');
        }
    };
    
    checkModules();
}

// ===== MANEJO DE RENDIMIENTO =====

// Medir tiempo de carga
const loadStartTime = performance.now();

window.addEventListener('load', () => {
    const loadTime = performance.now() - loadStartTime;
    Logger.info(`Página cargada en ${loadTime.toFixed(2)}ms`);
    
    // Enviar métricas si hay analytics disponible
    if (window.analytics) {
        window.analytics.track('page_load_time', { duration: loadTime });
    }
});

// ===== CONFIGURACIÓN DE ANALYTICS =====

// Configurar analytics básico
window.analytics = {
    track(event, data = {}) {
        if (App.config.debug) {
            Logger.info('Analytics:', event, data);
        }
        
        // Aquí se integraría con Google Analytics, Mixpanel, etc.
        // gtag('event', event, data);
    },
    
    page(path) {
        if (App.config.debug) {
            Logger.info('Page view:', path);
        }
        
        // gtag('config', 'GA_MEASUREMENT_ID', { page_path: path });
    }
};

// ===== MANEJO DE ACTUALIZACIONES =====

// Verificar actualizaciones de la aplicación
function checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                showUpdateNotification();
            }
        });
    }
}

function showUpdateNotification() {
    const notification = Utils.createElement('div', {
        className: 'update-notification',
        innerHTML: `
            <div class="update-content">
                <i class="fas fa-download"></i>
                <span>Nueva versión disponible</span>
                <button class="btn btn-sm btn-primary" onclick="reloadForUpdate()">
                    Actualizar
                </button>
                <button class="btn btn-sm btn-secondary" onclick="this.parentElement.parentElement.remove()">
                    Más tarde
                </button>
            </div>
        `
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
}

function reloadForUpdate() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
}

// ===== MANEJO DE TEMAS =====

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'auto';
        this.applyTheme();
        this.setupThemeToggle();
    }
    
    getStoredTheme() {
        return Utils.getFromStorage('theme');
    }
    
    setStoredTheme(theme) {
        Utils.saveToStorage('theme', theme);
    }
    
    applyTheme(theme = this.currentTheme) {
        const root = document.documentElement;
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        root.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        EventBus.emit('theme:changed', theme);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.setStoredTheme(newTheme);
    }
    
    setupThemeToggle() {
        // Escuchar cambios en preferencias del sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.getStoredTheme() === 'auto') {
                this.applyTheme('auto');
            }
        });
    }
}

// ===== INICIALIZACIÓN DE COMPONENTES ADICIONALES =====

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar gestor de temas
    window.themeManager = new ThemeManager();
    
    // Verificar actualizaciones
    checkForUpdates();
    
    // Configurar lazy loading de imágenes
    if ('IntersectionObserver' in window) {
        Utils.setupLazyLoading();
    }
    
    // Configurar tooltips
    setupTooltips();
    
    // Configurar dropdowns
    setupDropdowns();
});

// ===== CONFIGURACIÓN DE TOOLTIPS =====

function setupTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.target;
    const text = element.getAttribute('data-tooltip');
    
    if (!text) return;
    
    const tooltip = Utils.createElement('div', {
        className: 'tooltip-popup',
        innerHTML: text
    });
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    
    setTimeout(() => tooltip.classList.add('show'), 10);
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip-popup');
    if (tooltip) {
        tooltip.remove();
    }
}

// ===== CONFIGURACIÓN DE DROPDOWNS =====

function setupDropdowns() {
    document.addEventListener('click', (event) => {
        const dropdown = event.target.closest('.dropdown');
        
        if (dropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) {
                menu.classList.toggle('show');
            }
        } else {
            // Cerrar todos los dropdowns al hacer clic fuera
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// ===== MANEJO DE FORMULARIOS GLOBALES =====

document.addEventListener('submit', (event) => {
    const form = event.target;
    
    // Prevenir doble envío
    if (form.classList.contains('submitting')) {
        event.preventDefault();
        return;
    }
    
    // Marcar como enviando
    form.classList.add('submitting');
    
    // Remover marca después de un tiempo
    setTimeout(() => {
        form.classList.remove('submitting');
    }, 2000);
});

// ===== CONFIGURACIÓN DE ACCESIBILIDAD =====

class AccessibilityManager {
    constructor() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.setupHighContrastMode();
    }
    
    setupKeyboardNavigation() {
        // Navegación con Tab mejorada
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                this.handleTabNavigation(event);
            }
        });
    }
    
    handleTabNavigation(event) {
        const focusableElements = this.getFocusableElements();
        const currentIndex = focusableElements.indexOf(document.activeElement);
        
        if (event.shiftKey) {
            // Tab hacia atrás
            if (currentIndex <= 0) {
                event.preventDefault();
                focusableElements[focusableElements.length - 1].focus();
            }
        } else {
            // Tab hacia adelante
            if (currentIndex === focusableElements.length - 1) {
                event.preventDefault();
                focusableElements[0].focus();
            }
        }
    }
    
    getFocusableElements() {
        const selector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll(selector))
            .filter(el => !el.disabled && !el.hidden && el.offsetWidth > 0 && el.offsetHeight > 0);
    }
    
    setupFocusManagement() {
        // Manejo de foco en modales
        EventBus.on('modal:opened', (modal) => {
            this.trapFocus(modal);
        });
        
        EventBus.on('modal:closed', () => {
            this.restoreFocus();
        });
    }
    
    trapFocus(container) {
        const focusableElements = container.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Foco inicial
        if (firstElement) {
            firstElement.focus();
        }
        
        // Trap focus
        container.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }
    
    restoreFocus() {
        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }
    }
    
    setupScreenReaderSupport() {
        // Anunciar cambios de página
        EventBus.on('navigation:change', (section) => {
            this.announceToScreenReader(`Navegando a ${section}`);
        });
        
        // Anunciar notificaciones
        EventBus.on('notification:show', (message) => {
            this.announceToScreenReader(message);
        });
    }
    
    announceToScreenReader(message) {
        const announcement = Utils.createElement('div', {
            className: 'sr-only',
            'aria-live': 'polite',
            innerHTML: message
        });
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    setupHighContrastMode() {
        // Detectar preferencia de alto contraste
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
        
        // Escuchar cambios
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('high-contrast');
            } else {
                document.body.classList.remove('high-contrast');
            }
        });
    }
}

// ===== MANEJO DE DATOS OFFLINE =====

class OfflineManager {
    constructor() {
        this.cache = new Map();
        this.queuedRequests = [];
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        EventBus.on('network:offline', () => {
            this.enableOfflineMode();
        });
        
        EventBus.on('network:online', () => {
            this.disableOfflineMode();
            this.syncQueuedRequests();
        });
    }
    
    enableOfflineMode() {
        document.body.classList.add('offline-mode');
        App.showNotification('Modo offline activado. Algunos datos pueden no estar actualizados.', 'warning');
    }
    
    disableOfflineMode() {
        document.body.classList.remove('offline-mode');
    }
    
    async syncQueuedRequests() {
        Logger.info(`Sincronizando ${this.queuedRequests.length} solicitudes pendientes...`);
        
        for (const request of this.queuedRequests) {
            try {
                await this.executeRequest(request);
            } catch (error) {
                Logger.error('Error sincronizando solicitud:', error);
            }
        }
        
        this.queuedRequests = [];
        App.showNotification('Datos sincronizados correctamente', 'success');
    }
    
    queueRequest(request) {
        this.queuedRequests.push(request);
    }
    
    async executeRequest(request) {
        return fetch(request.url, request.options);
    }
    
    cacheData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    getCachedData(key, maxAge = 300000) { // 5 minutos por defecto
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
}

// ===== SISTEMA DE NOTIFICACIONES PUSH =====

class PushNotificationManager {
    constructor() {
        this.registration = null;
        this.init();
    }
    
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            Logger.warn('Push notifications no soportadas');
            return;
        }
        
        try {
            this.registration = await navigator.serviceWorker.ready;
            await this.checkSubscription();
        } catch (error) {
            Logger.error('Error inicializando push notifications:', error);
        }
    }
    
    async requestPermission() {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            await this.subscribe();
            App.showNotification('Notificaciones activadas correctamente', 'success');
        } else {
            App.showNotification('Las notificaciones fueron deshabilitadas', 'warning');
        }
        
        return permission;
    }
    
    async subscribe() {
        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlB64ToUint8Array(Config.VAPID_PUBLIC_KEY || '')
            });
            
            // Enviar suscripción al servidor
            await this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            Logger.error('Error suscribiendo a push notifications:', error);
        }
    }
    
    async sendSubscriptionToServer(subscription) {
        await fetch('php/push_subscription.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription,
                user_id: App.getUser()?.id
            })
        });
    }
    
    async checkSubscription() {
        const subscription = await this.registration.pushManager.getSubscription();
        
        if (subscription) {
            Logger.info('Usuario suscrito a push notifications');
        } else {
            Logger.info('Usuario no suscrito a push notifications');
        }
    }
    
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
}

// ===== SISTEMA DE BACKUP AUTOMÁTICO =====

class AutoBackupManager {
    constructor() {
        this.backupInterval = 600000; // 10 minutos
        this.maxBackups = 5;
        this.startAutoBackup();
    }
    
    startAutoBackup() {
        setInterval(() => {
            if (App.getUser()) {
                this.createBackup();
            }
        }, this.backupInterval);
    }
    
    createBackup() {
        try {
            const backupData = {
                timestamp: Date.now(),
                user: App.getUser(),
                preferences: this.getUserPreferences(),
                sessionData: this.getSessionData()
            };
            
            this.saveBackup(backupData);
            Logger.info('Backup automático creado');
            
        } catch (error) {
            Logger.error('Error creando backup:', error);
        }
    }
    
    getUserPreferences() {
        return {
            theme: window.themeManager?.currentTheme,
            language: document.documentElement.lang,
            notifications: Notification.permission
        };
    }
    
    getSessionData() {
        return {
            currentSection: App.getCurrentSection(),
            lastActivity: Date.now()
        };
    }
    
    saveBackup(data) {
        const backups = Utils.getFromStorage('app_backups') || [];
        
        // Agregar nuevo backup
        backups.unshift(data);
        
        // Mantener solo los últimos N backups
        if (backups.length > this.maxBackups) {
            backups.splice(this.maxBackups);
        }
        
        Utils.saveToStorage('app_backups', backups);
    }
    
    restoreFromBackup(timestamp) {
        const backups = Utils.getFromStorage('app_backups') || [];
        const backup = backups.find(b => b.timestamp === timestamp);
        
        if (backup) {
            // Restaurar preferencias
            if (backup.preferences.theme) {
                window.themeManager?.applyTheme(backup.preferences.theme);
            }
            
            Logger.info('Backup restaurado correctamente');
            return true;
        }
        
        return false;
    }
}

// ===== INICIALIZACIÓN DE COMPONENTES FINALES =====

// Inicializar cuando la aplicación esté lista
EventBus.on('app:initialized', () => {
    // Inicializar gestores adicionales
    window.accessibilityManager = new AccessibilityManager();
    window.offlineManager = new OfflineManager();
    window.pushNotificationManager = new PushNotificationManager();
    window.autoBackupManager = new AutoBackupManager();
    
    Logger.info('Todos los componentes adicionales inicializados');
});

// ===== LIMPIEZA AL CERRAR LA PÁGINA =====

window.addEventListener('beforeunload', (event) => {
    // Guardar estado antes de cerrar
    if (App.getUser()) {
        const state = {
            user: App.getUser(),
            section: App.getCurrentSection(),
            timestamp: Date.now()
        };
        
        Utils.saveToStorage('app_state_before_close', state);
    }
    
    // Limpiar recursos
    if (window.authManager) {
        window.authManager.stopSessionCheck();
    }
    
    Logger.info('Aplicación cerrandose, estado guardado');
});

// ===== DETECCIÓN DE CAPACIDADES DEL DISPOSITIVO =====

const DeviceCapabilities = {
    // Detectar tipo de dispositivo
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768,
    isDesktop: !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
    
    // Detectar capacidades
    hasTouch: 'ontouchstart' in window,
    hasGeolocation: 'geolocation' in navigator,
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    hasNotifications: 'Notification' in window,
    hasLocalStorage: (() => {
        try {
            return 'localStorage' in window && window.localStorage !== null;
        } catch {
            return false;
        }
    })(),
    
    // Información de la pantalla
    screenSize: {
        width: window.screen.width,
        height: window.screen.height,
        available: {
            width: window.screen.availWidth,
            height: window.screen.availHeight
        }
    },
    
    // Información de la conexión
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
    
    getConnectionInfo() {
        if (this.connection) {
            return {
                effectiveType: this.connection.effectiveType,
                downlink: this.connection.downlink,
                rtt: this.connection.rtt,
                saveData: this.connection.saveData
            };
        }
        return null;
    }
};

// Hacer disponible globalmente
window.DeviceCapabilities = DeviceCapabilities;

// ===== CONFIGURACIÓN ADAPTATIVA SEGÚN EL DISPOSITIVO =====

document.addEventListener('DOMContentLoaded', () => {
    // Agregar clases CSS según el dispositivo
    if (DeviceCapabilities.isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    if (DeviceCapabilities.isTablet) {
        document.body.classList.add('tablet-device');
    }
    
    if (DeviceCapabilities.hasTouch) {
        document.body.classList.add('touch-device');
    }
    
    // Configurar interface según la conexión
    const connectionInfo = DeviceCapabilities.getConnectionInfo();
    if (connectionInfo?.saveData) {
        document.body.classList.add('save-data-mode');
        App.config.notificationDuration = 3000; // Reducir duración de notificaciones
    }
    
    Logger.info('Configuración adaptativa aplicada', {
        device: {
            mobile: DeviceCapabilities.isMobile,
            tablet: DeviceCapabilities.isTablet,
            touch: DeviceCapabilities.hasTouch
        },
        connection: connectionInfo
    });
});

// ===== MONITOREO DE RENDIMIENTO =====

const PerformanceMonitor = {
    metrics: {
        loadTime: 0,
        interactionTime: 0,
        memoryUsage: 0
    },
    
    startMonitoring() {
        // Medir tiempo de interacción
        document.addEventListener('click', this.measureInteraction.bind(this));
        document.addEventListener('keydown', this.measureInteraction.bind(this));
        
        // Monitorear memoria cada minuto
        setInterval(() => {
            this.checkMemoryUsage();
        }, 60000);
        
        // Medir tiempo de carga inicial
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now();
            Logger.info(`Tiempo de carga: ${this.metrics.loadTime.toFixed(2)}ms`);
        });
    },
    
    measureInteraction(event) {
        const start = performance.now();
        
        requestAnimationFrame(() => {
            const interactionTime = performance.now() - start;
            this.metrics.interactionTime = interactionTime;
            
            if (interactionTime > 100) {
                Logger.warn(`Interacción lenta detectada: ${interactionTime.toFixed(2)}ms`);
            }
        });
    },
    
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
            
            if (this.metrics.memoryUsage > 0.8) {
                Logger.warn('Alto uso de memoria detectado:', this.metrics.memoryUsage);
                this.optimizeMemory();
            }
        }
    },
    
    optimizeMemory() {
        // Limpiar cache
        if (window.Cache) {
            window.Cache.cleanup();
        }
        
        // Limpiar eventos no utilizados
        this.cleanupEventListeners();
        
        Logger.info('Optimización de memoria ejecutada');
    },
    
    cleanupEventListeners() {
        // Implementar limpieza de event listeners huérfanos
        // Esta es una implementación básica
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            if (element._events && element._events.length === 0) {
                delete element._events;
            }
        });
    },
    
    getMetrics() {
        return { ...this.metrics };
    }
};

// Inicializar monitoreo de rendimiento
PerformanceMonitor.startMonitoring();
window.PerformanceMonitor = PerformanceMonitor;

// ===== FINALIZACIÓN =====

Logger.info('Archivo main.js cargado completamente');

// Exportar funciones principales para uso global
window.App = App;
window.DeviceCapabilities = DeviceCapabilities;
window.PerformanceMonitor = PerformanceMonitor;

// Marcar como listo
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('main-js-loaded');
});