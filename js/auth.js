/**
 * Sistema de Autenticación JavaScript
 * Maneja login, registro, sesiones y validación en el frontend
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.sessionCheckInterval = null;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 300000; // 5 minutos
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startSessionCheck();
        Logger.info('AuthManager inicializado');
    }
    
    setupEventListeners() {
        // Event listener para formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Event listener para formulario de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Event listener para logout
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Event listener para verificar sesión al enfocar la ventana
        window.addEventListener('focus', () => {
            if (this.isLoggedIn) {
                this.checkSession();
            }
        });
        
        // Event listener para detectar actividad del usuario
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, Utils.throttle(() => {
                if (this.isLoggedIn) {
                    this.updateActivity();
                }
            }, 30000)); // Actualizar cada 30 segundos máximo
        });
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        // Verificar si está bloqueado por intentos fallidos
        if (this.isLockedOut()) {
            this.showError('Demasiados intentos fallidos. Intente nuevamente en unos minutos.');
            return;
        }
        
        const form = event.target;
        const formData = new FormData(form);
        const loginData = {
            usuario: formData.get('usuario'),
            password: formData.get('password'),
            rol: formData.get('rol')
        };
        
        // Validar datos antes de enviar
        if (!this.validateLoginData(loginData)) {
            return;
        }
        
        this.setLoginLoading(true);
        
        try {
            const response = await Utils.fetchWithErrorHandling('php/login.php', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });
            
            if (response.success) {
                this.loginSuccess(response);
            } else {
                this.loginError(response.message);
            }
            
        } catch (error) {
            Logger.error('Error en login:', error);
            this.loginError('Error de conexión. Por favor, intente nuevamente.');
        } finally {
            this.setLoginLoading(false);
        }
    }
    
    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const registerData = {
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            username: formData.get('username'),
            password: formData.get('password'),
            confirm_password: formData.get('confirm_password'),
            rol: formData.get('rol')
        };
        
        // Validar datos antes de enviar
        if (!this.validateRegisterData(registerData)) {
            return;
        }
        
        this.setRegisterLoading(true);
        
        try {
            const response = await Utils.fetchWithErrorHandling('php/register.php', {
                method: 'POST',
                body: JSON.stringify(registerData)
            });
            
            if (response.success) {
                this.registerSuccess(response);
            } else {
                this.registerError(response.message, response.errors);
            }
            
        } catch (error) {
            Logger.error('Error en registro:', error);
            this.registerError('Error de conexión. Por favor, intente nuevamente.');
        } finally {
            this.setRegisterLoading(false);
        }
    }
    
    validateLoginData(data) {
        let isValid = true;
        
        if (!data.usuario.trim()) {
            this.showFieldError('usuario', 'Usuario requerido');
            isValid = false;
        }
        
        if (!data.password.trim()) {
            this.showFieldError('password', 'Contraseña requerida');
            isValid = false;
        }
        
        if (!data.rol) {
            this.showFieldError('rol', 'Tipo de usuario requerido');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateRegisterData(data) {
        let isValid = true;
        
        // Validar nombre
        if (!data.nombre.trim()) {
            this.showFieldError('reg_nombre', 'Nombre requerido');
            isValid = false;
        }
        
        // Validar apellido
        if (!data.apellido.trim()) {
            this.showFieldError('reg_apellido', 'Apellido requerido');
            isValid = false;
        }
        
        // Validar email
        if (!data.email.trim()) {
            this.showFieldError('reg_email', 'Email requerido');
            isValid = false;
        } else if (!Utils.validateEmail(data.email)) {
            this.showFieldError('reg_email', 'Email inválido');
            isValid = false;
        }
        
        // Validar username
        if (!data.username.trim()) {
            this.showFieldError('reg_username', 'Usuario requerido');
            isValid = false;
        } else if (!Utils.validateUsername(data.username)) {
            this.showFieldError('reg_username', 'Usuario debe tener 3-20 caracteres');
            isValid = false;
        }
        
        // Validar contraseña
        if (!data.password.trim()) {
            this.showFieldError('reg_password', 'Contraseña requerida');
            isValid = false;
        } else {
            const passwordValidation = Utils.validatePassword(data.password);
            if (!passwordValidation.isValid) {
                this.showFieldError('reg_password', 'Contraseña debe tener al menos 6 caracteres');
                isValid = false;
            }
        }
        
        // Validar confirmación de contraseña
        if (data.password !== data.confirm_password) {
            this.showFieldError('reg_confirm_password', 'Las contraseñas no coinciden');
            isValid = false;
        }
        
        // Validar rol
        if (!data.rol) {
            this.showFieldError('reg_rol', 'Rol requerido');
            isValid = false;
        }
        
        return isValid;
    }
    
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
            
            // Remover error después de un tiempo
            setTimeout(() => {
                field.classList.remove('error');
            }, 3000);
        }
    }
    
    loginSuccess(response) {
        this.currentUser = response.user;
        this.isLoggedIn = true;
        this.loginAttempts = 0;
        
        // Guardar información de sesión
        Utils.saveToStorage('user_session', {
            user: response.user,
            loginTime: Date.now()
        });
        
        // Limpiar formulario
        document.getElementById('loginForm').reset();
        
        // Mostrar notificación
        this.showSuccess(response.message);
        
        // Emitir evento
        EventBus.emit('auth:login:success', response.user);
        
        // Redireccionar o cargar dashboard
        if (response.redirect) {
            window.location.href = response.redirect;
        } else {
            this.loadDashboard(response.user);
        }
        
        Logger.info('Login exitoso:', response.user);
    }
    
    loginError(message) {
        this.loginAttempts++;
        
        // Mostrar error
        this.showError(message);
        
        // Shake effect en la tarjeta de login
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.classList.add('error');
            setTimeout(() => {
                loginCard.classList.remove('error');
            }, 500);
        }
        
        // Verificar si debe bloquear
        if (this.loginAttempts >= this.maxLoginAttempts) {
            this.lockoutUser();
        }
        
        EventBus.emit('auth:login:error', { message, attempts: this.loginAttempts });
        Logger.warn('Error de login:', message);
    }
    
    registerSuccess(response) {
        this.showSuccess(response.message);
        
        // Cerrar modal de registro
        this.closeRegisterModal();
        
        // Opcional: auto-login después del registro
        if (response.auto_login) {
            this.currentUser = response.user;
            this.isLoggedIn = true;
            this.loadDashboard(response.user);
        }
        
        EventBus.emit('auth:register:success', response);
        Logger.info('Registro exitoso:', response);
    }
    
    registerError(message, errors = []) {
        this.showError(message);
        
        // Mostrar errores específicos de campos
        if (errors && errors.length > 0) {
            errors.forEach(error => {
                Logger.warn('Error de validación:', error);
            });
        }
        
        EventBus.emit('auth:register:error', { message, errors });
    }
    
    async logout() {
        if (!this.isLoggedIn) return;
        
        try {
            await Utils.fetchWithErrorHandling('php/logout.php', {
                method: 'POST'
            });
        } catch (error) {
            Logger.error('Error al cerrar sesión:', error);
        }
        
        // Limpiar estado local
        this.currentUser = null;
        this.isLoggedIn = false;
        
        // Limpiar storage
        Utils.removeFromStorage('user_session');
        
        // Detener verificación de sesión
        this.stopSessionCheck();
        
        // Mostrar pantalla de login
        this.showLoginScreen();
        
        // Mostrar notificación
        this.showSuccess('Sesión cerrada correctamente');
        
        // Emitir evento
        EventBus.emit('auth:logout');
        
        Logger.info('Logout completado');
    }
    
    async checkSession() {
        if (!this.isLoggedIn) return;
        
        try {
            const response = await Utils.fetchWithErrorHandling('php/check_session.php');
            
            if (!response.logged_in) {
                this.sessionExpired();
            } else {
                // Actualizar información del usuario si cambió
                if (response.user) {
                    this.currentUser = response.user;
                    EventBus.emit('auth:session:updated', response.user);
                }
            }
        } catch (error) {
            Logger.error('Error verificando sesión:', error);
        }
    }
    
    sessionExpired() {
        this.currentUser = null;
        this.isLoggedIn = false;
        
        Utils.removeFromStorage('user_session');
        this.stopSessionCheck();
        this.showLoginScreen();
        
        this.showWarning('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        
        EventBus.emit('auth:session:expired');
        Logger.warn('Sesión expirada');
    }
    
    async updateActivity() {
        if (!this.isLoggedIn) return;
        
        try {
            await Utils.fetchWithErrorHandling('php/update_activity.php', {
                method: 'POST'
            });
        } catch (error) {
            Logger.error('Error actualizando actividad:', error);
        }
    }
    
    startSessionCheck() {
        // Verificar sesión cada 5 minutos
        this.sessionCheckInterval = setInterval(() => {
            this.checkSession();
        }, 300000);
    }
    
    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }
    
    isLockedOut() {
        const lockoutData = Utils.getFromStorage('login_lockout');
        if (!lockoutData) return false;
        
        const timeSinceLockout = Date.now() - lockoutData.time;
        return timeSinceLockout < this.lockoutTime;
    }
    
    lockoutUser() {
        Utils.saveToStorage('login_lockout', {
            time: Date.now(),
            attempts: this.loginAttempts
        });
        
        const remainingTime = Math.ceil(this.lockoutTime / 60000);
        this.showError(`Cuenta bloqueada por ${remainingTime} minutos debido a múltiples intentos fallidos.`);
        
        EventBus.emit('auth:lockout', { attempts: this.loginAttempts });
    }
    
    loadDashboard(user) {
        // Ocultar pantalla de login
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // Mostrar dashboard
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (dashboardContainer) {
            dashboardContainer.style.display = 'block';
            
            // Cargar contenido del dashboard
            this.fetchDashboardContent(user);
        }
    }
    
    async fetchDashboardContent(user) {
        try {
            const response = await fetch('dashboard.php');
            const html = await response.text();
            
            const dashboardContainer = document.getElementById('dashboardContainer');
            dashboardContainer.innerHTML = html;
            
            // Inicializar dashboard
            if (window.DashboardManager) {
                window.DashboardManager.init(user);
            }
            
            EventBus.emit('dashboard:loaded', user);
            
        } catch (error) {
            Logger.error('Error cargando dashboard:', error);
            this.showError('Error al cargar el panel principal');
        }
    }
    
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const dashboardContainer = document.getElementById('dashboardContainer');
        
        if (loginScreen) {
            loginScreen.style.display = 'flex';
        }
        
        if (dashboardContainer) {
            dashboardContainer.style.display = 'none';
            dashboardContainer.innerHTML = '';
        }
    }
    
    closeRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Limpiar formulario
            const form = document.getElementById('registerForm');
            if (form) {
                form.reset();
            }
        }
    }
    
    setLoginLoading(loading) {
        const form = document.getElementById('loginForm');
        const submitBtn = form.querySelector('.login-btn');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
        } else {
            form.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }
    
    setRegisterLoading(loading) {
        const form = document.getElementById('registerForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (loading) {
            form.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        } else {
            form.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar';
        }
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showWarning(message) {
        this.showMessage(message, 'warning');
    }
    
    showMessage(message, type = 'info') {
        // Mostrar en el contenedor de login si está visible
        const loginMessage = document.getElementById('loginMessage');
        if (loginMessage && document.getElementById('loginScreen').style.display !== 'none') {
            loginMessage.className = `message ${type}`;
            loginMessage.textContent = message;
            loginMessage.style.display = 'block';
            
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 5000);
        }
        
        // También mostrar notificación global
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }
    
    // Métodos públicos para verificar estado
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return this.isLoggedIn;
    }
    
    hasRole(role) {
        return this.currentUser && this.currentUser.rol === role;
    }
    
    hasPermission(requiredRole) {
        if (!this.isLoggedIn) return false;
        
        const roleHierarchy = {
            'alumno': 1,
            'profesor': 2,
            'admin': 3
        };
        
        const userLevel = roleHierarchy[this.currentUser.rol] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
    
    // Método para recuperar sesión desde storage
    restoreSession() {
        const sessionData = Utils.getFromStorage('user_session');
        if (sessionData) {
            const sessionAge = Date.now() - sessionData.loginTime;
            // Si la sesión tiene menos de 24 horas, intentar restaurar
            if (sessionAge < 86400000) {
                this.currentUser = sessionData.user;
                this.isLoggedIn = true;
                this.checkSession(); // Verificar con el servidor
                return true;
            } else {
                Utils.removeFromStorage('user_session');
            }
        }
        return false;
    }
}

// ===== FUNCIONES AUXILIARES PARA AUTENTICACIÓN =====

/**
 * Función para manejar el login desde el formulario HTML
 */
async function handleLogin(event) {
    if (window.authManager) {
        await window.authManager.handleLogin(event);
    }
}

/**
 * Función para manejar el registro desde el formulario HTML
 */
async function handleRegister(event) {
    if (window.authManager) {
        await window.authManager.handleRegister(event);
    }
}

/**
 * Función para logout global
 */
async function logout() {
    if (window.authManager) {
        await window.authManager.logout();
    }
}

/**
 * Función para verificar si el usuario está autenticado
 */
function isLoggedIn() {
    return window.authManager ? window.authManager.isAuthenticated() : false;
}

/**
 * Función para obtener el usuario actual
 */
function getCurrentUser() {
    return window.authManager ? window.authManager.getCurrentUser() : null;
}

/**
 * Función para verificar permisos
 */
function hasPermission(role) {
    return window.authManager ? window.authManager.hasPermission(role) : false;
}

/**
 * Función para verificar rol específico
 */
function hasRole(role) {
    return window.authManager ? window.authManager.hasRole(role) : false;
}

// ===== MIDDLEWARE DE AUTENTICACIÓN =====

/**
 * Middleware para requerir autenticación
 */
function requireAuth(callback) {
    return function(...args) {
        if (!isLoggedIn()) {
            window.showNotification('Debe iniciar sesión para acceder a esta función', 'warning');
            return;
        }
        return callback.apply(this, args);
    };
}

/**
 * Middleware para requerir permisos específicos
 */
function requirePermission(role, callback) {
    return function(...args) {
        if (!isLoggedIn()) {
            window.showNotification('Debe iniciar sesión para acceder a esta función', 'warning');
            return;
        }
        if (!hasPermission(role)) {
            window.showNotification('No tiene permisos para realizar esta acción', 'error');
            return;
        }
        return callback.apply(this, args);
    };
}

// ===== INTERCEPTOR PARA PETICIONES HTTP =====

/**
 * Interceptor para agregar token de autenticación a las peticiones
 */
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    // Agregar headers de autenticación si el usuario está logueado
    if (isLoggedIn()) {
        options.headers = {
            ...options.headers,
            'X-User-ID': getCurrentUser()?.id,
            'X-User-Role': getCurrentUser()?.rol
        };
    }
    
    try {
        const response = await originalFetch(url, options);
        
        // Verificar si la respuesta indica sesión expirada
        if (response.status === 401 && isLoggedIn()) {
            window.authManager.sessionExpired();
            throw new Error('Sesión expirada');
        }
        
        return response;
    } catch (error) {
        // Manejar errores de red
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            window.showNotification('Error de conexión. Verifique su conexión a internet.', 'error');
        }
        throw error;
    }
};

// ===== GESTIÓN DE TOKENS CSRF =====

class CSRFManager {
    constructor() {
        this.token = null;
        this.refreshToken();
    }
    
    async refreshToken() {
        try {
            const response = await originalFetch('php/csrf_token.php');
            const data = await response.json();
            this.token = data.token;
            
            // Actualizar todos los formularios con el nuevo token
            this.updateFormTokens();
        } catch (error) {
            Logger.error('Error obteniendo token CSRF:', error);
        }
    }
    
    updateFormTokens() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            let tokenInput = form.querySelector('input[name="csrf_token"]');
            if (!tokenInput) {
                tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'csrf_token';
                form.appendChild(tokenInput);
            }
            tokenInput.value = this.token;
        });
    }
    
    getToken() {
        return this.token;
    }
}

// ===== SISTEMA DE RECUPERACIÓN DE CONTRASEÑA =====

class PasswordRecovery {
    constructor() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Event listener para enlace de recuperación
        document.addEventListener('click', (e) => {
            if (e.target.matches('.forgot-password-link')) {
                e.preventDefault();
                this.showRecoveryModal();
            }
        });
    }
    
    showRecoveryModal() {
        // Crear modal dinámicamente
        const modal = this.createRecoveryModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }
    
    createRecoveryModal() {
        const modal = Utils.createElement('div', {
            className: 'modal',
            id: 'recoveryModal'
        });
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Recuperar Contraseña</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="recoveryForm" class="recovery-form">
                    <div class="form-group">
                        <label for="recovery_email">Email</label>
                        <input type="email" id="recovery_email" name="email" required>
                        <div class="form-help">Ingrese el email asociado a su cuenta</div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i>
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // Agregar event listener al formulario
        const form = modal.querySelector('#recoveryForm');
        form.addEventListener('submit', (e) => this.handleRecovery(e));
        
        return modal;
    }
    
    async handleRecovery(event) {
        event.preventDefault();
        
        const form = event.target;
        const email = form.querySelector('#recovery_email').value;
        
        if (!Utils.validateEmail(email)) {
            window.showNotification('Email inválido', 'error');
            return;
        }
        
        try {
            const response = await Utils.fetchWithErrorHandling('php/password_recovery.php', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            if (response.success) {
                window.showNotification('Se ha enviado un enlace de recuperación a su email', 'success');
                event.target.closest('.modal').remove();
            } else {
                window.showNotification(response.message, 'error');
            }
        } catch (error) {
            Logger.error('Error en recuperación de contraseña:', error);
            window.showNotification('Error al enviar el enlace de recuperación', 'error');
        }
    }
}

// ===== SISTEMA DE AUTENTICACIÓN DE DOS FACTORES =====

class TwoFactorAuth {
    constructor() {
        this.isEnabled = false;
        this.pendingLogin = null;
    }
    
    async enableTwoFactor() {
        try {
            const response = await Utils.fetchWithErrorHandling('php/enable_2fa.php', {
                method: 'POST'
            });
            
            if (response.success) {
                this.showQRCode(response.qr_code, response.secret);
            }
        } catch (error) {
            Logger.error('Error habilitando 2FA:', error);
        }
    }
    
    showQRCode(qrCode, secret) {
        // Implementar modal con código QR
        // Este sería un modal para mostrar el código QR y permitir al usuario configurar su app de autenticación
    }
    
    async verifyTwoFactor(code) {
        try {
            const response = await Utils.fetchWithErrorHandling('php/verify_2fa.php', {
                method: 'POST',
                body: JSON.stringify({ code, login_data: this.pendingLogin })
            });
            
            if (response.success) {
                // Completar login
                window.authManager.loginSuccess(response);
                this.pendingLogin = null;
            } else {
                window.showNotification('Código de verificación inválido', 'error');
            }
        } catch (error) {
            Logger.error('Error verificando 2FA:', error);
        }
    }
}

// ===== INICIALIZACIÓN =====

// Crear instancias globales
window.authManager = null;
window.csrfManager = null;
window.passwordRecovery = null;
window.twoFactorAuth = null;

// Event listener para inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar AuthManager
    window.authManager = new AuthManager();
    
    // Inicializar CSRF Manager
    window.csrfManager = new CSRFManager();
    
    // Inicializar recuperación de contraseña
    window.passwordRecovery = new PasswordRecovery();
    
    // Inicializar 2FA
    window.twoFactorAuth = new TwoFactorAuth();
    
    // Intentar restaurar sesión existente
    if (window.authManager.restoreSession()) {
        Logger.info('Sesión restaurada automáticamente');
        // Si hay una sesión válida, cargar el dashboard
        window.authManager.loadDashboard(window.authManager.getCurrentUser());
    }
    
    // Configurar validación de formularios
    Utils.setupFormValidation('loginForm');
    Utils.setupFormValidation('registerForm');
    
    Logger.info('Sistema de autenticación inicializado completamente');
});

// ===== EVENTOS PERSONALIZADOS =====

// Escuchar eventos de autenticación
EventBus.on('auth:login:success', (user) => {
    Logger.info('Usuario logueado:', user);
    
    // Limpiar intentos de login fallidos
    Utils.removeFromStorage('login_lockout');
    
    // Enviar evento de analytics si está disponible
    if (window.analytics) {
        window.analytics.track('login_success', {
            user_id: user.id,
            role: user.rol
        });
    }
});

EventBus.on('auth:logout', () => {
    Logger.info('Usuario deslogueado');
    
    // Limpiar cache
    if (window.Cache) {
        window.Cache.clear();
    }
    
    // Enviar evento de analytics
    if (window.analytics) {
        window.analytics.track('logout');
    }
});

EventBus.on('auth:session:expired', () => {
    Logger.warn('Sesión expirada detectada');
    
    // Limpiar datos sensibles
    if (window.Cache) {
        window.Cache.clear();
    }
});

// ===== FUNCIONES GLOBALES PARA HTML =====

// Estas funciones estarán disponibles para ser llamadas desde HTML
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.hasPermission = hasPermission;
window.hasRole = hasRole;
window.requireAuth = requireAuth;
window.requirePermission = requirePermission;

// ===== CONFIGURACIÓN DE SEGURIDAD =====

// Deshabilitar clic derecho en producción (opcional)
if (!Config.app.debug) {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Deshabilitar teclas de desarrollo
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C') ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });
}

// Limpiar logs sensibles en producción
if (!Config.app.debug) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
}

Logger.info('Sistema de autenticación cargado completamente');