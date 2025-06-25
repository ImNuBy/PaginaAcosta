/**
 * Funciones de Utilidad del Sistema Escolar
 * Contiene funciones helper, validaciones y utilidades generales
 */

// ===== UTILIDADES GENERALES =====

/**
 * Función para hacer peticiones HTTP con manejo de errores
 */
async function fetchWithErrorHandling(url, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('Error en petición:', error);
        throw error;
    }
}

/**
 * Función para enviar datos de formulario
 */
async function submitForm(formElement, url) {
    const formData = new FormData(formElement);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return await fetchWithErrorHandling(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Función para debounce (evitar múltiples llamadas rápidas)
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Función para throttle (limitar frecuencia de ejecución)
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== VALIDACIONES =====

/**
 * Validador de email
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validador de contraseña
 */
function validatePassword(password) {
    return {
        isValid: password.length >= 6,
        minLength: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
}

/**
 * Validador de teléfono
 */
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validador de nombre de usuario
 */
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._-]{3,20}$/;
    return usernameRegex.test(username);
}

/**
 * Función para validar formularios en tiempo real
 */
function setupFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', debounce(() => validateField(input), 300));
    });
}

/**
 * Validar un campo específico
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldType = field.type;
    const fieldName = field.name;
    const isRequired = field.hasAttribute('required');
    
    let isValid = true;
    let message = '';
    
    // Validar campo requerido
    if (isRequired && !value) {
        isValid = false;
        message = 'Este campo es requerido';
    }
    // Validar según el tipo de campo
    else if (value) {
        switch (fieldType) {
            case 'email':
                if (!validateEmail(value)) {
                    isValid = false;
                    message = 'Email inválido';
                }
                break;
            case 'password':
                const passwordValidation = validatePassword(value);
                if (!passwordValidation.isValid) {
                    isValid = false;
                    message = 'La contraseña debe tener al menos 6 caracteres';
                }
                break;
            case 'tel':
                if (!validatePhone(value)) {
                    isValid = false;
                    message = 'Teléfono inválido';
                }
                break;
            default:
                if (fieldName === 'username' && !validateUsername(value)) {
                    isValid = false;
                    message = 'Usuario debe tener 3-20 caracteres (letras, números, ., _, -)';
                }
                break;
        }
    }
    
    // Validación de confirmación de contraseña
    if (fieldName === 'confirm_password') {
        const passwordField = field.form.querySelector('input[name="password"]');
        if (passwordField && value !== passwordField.value) {
            isValid = false;
            message = 'Las contraseñas no coinciden';
        }
    }
    
    updateFieldValidation(field, isValid, message);
    return isValid;
}

/**
 * Actualizar la visualización de validación del campo
 */
function updateFieldValidation(field, isValid, message) {
    const formGroup = field.closest('.form-group');
    const helpText = formGroup.querySelector('.form-help');
    
    // Remover clases anteriores
    formGroup.classList.remove('valid', 'invalid');
    field.classList.remove('error', 'success');
    
    if (field.value.trim()) {
        if (isValid) {
            formGroup.classList.add('valid');
            field.classList.add('success');
        } else {
            formGroup.classList.add('invalid');
            field.classList.add('error');
        }
    }
    
    // Actualizar mensaje de ayuda
    if (helpText) {
        helpText.textContent = message;
        helpText.className = `form-help ${isValid ? 'success' : 'error'}`;
        helpText.style.display = message ? 'block' : 'none';
    } else if (message) {
        const newHelpText = document.createElement('div');
        newHelpText.className = `form-help ${isValid ? 'success' : 'error'}`;
        newHelpText.textContent = message;
        formGroup.appendChild(newHelpText);
    }
}

// ===== FORMATEO DE DATOS =====

/**
 * Formatear fechas
 */
function formatDate(date, format = 'dd/mm/yyyy') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
        case 'dd/mm/yyyy':
            return `${day}/${month}/${year}`;
        case 'mm/dd/yyyy':
            return `${month}/${day}/${year}`;
        case 'yyyy-mm-dd':
            return `${year}-${month}-${day}`;
        case 'dd-mm-yyyy':
            return `${day}-${month}-${year}`;
        default:
            return d.toLocaleDateString('es-ES');
    }
}

/**
 * Formatear números
 */
function formatNumber(number, decimals = 2) {
    return Number(number).toFixed(decimals);
}

/**
 * Formatear calificaciones
 */
function formatGrade(grade) {
    const num = parseFloat(grade);
    if (isNaN(num)) return '-';
    return num.toFixed(1);
}

/**
 * Obtener color para calificación
 */
function getGradeColor(grade) {
    const num = parseFloat(grade);
    if (isNaN(num)) return 'gray';
    if (num >= 7) return 'success';
    if (num >= 4) return 'warning';
    return 'danger';
}

/**
 * Formatear nombre completo
 */
function formatFullName(firstName, lastName) {
    return `${firstName} ${lastName}`.trim();
}

/**
 * Capitalizar primera letra
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convertir a title case
 */
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// ===== MANIPULACIÓN DEL DOM =====

/**
 * Crear elemento con atributos
 */
function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.keys(attributes).forEach(key => {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'innerHTML') {
            element.innerHTML = attributes[key];
        } else {
            element.setAttribute(key, attributes[key]);
        }
    });
    
    if (content) {
        element.textContent = content;
    }
    
    return element;
}

/**
 * Buscar elemento con timeout
 */
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Elemento ${selector} no encontrado`));
        }, timeout);
    });
}

/**
 * Scroll suave hacia elemento
 */
function scrollToElement(selector, offset = 0) {
    const element = document.querySelector(selector);
    if (element) {
        const top = element.offsetTop - offset;
        window.scrollTo({
            top: top,
            behavior: 'smooth'
        });
    }
}

// ===== ALMACENAMIENTO LOCAL =====

/**
 * Guardar en localStorage con manejo de errores
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
        return false;
    }
}

/**
 * Obtener de localStorage con manejo de errores
 */
function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error obteniendo de localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remover de localStorage
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removiendo de localStorage:', error);
        return false;
    }
}

// ===== UTILIDADES DE TIEMPO =====

/**
 * Obtener tiempo relativo (hace 2 horas, etc.)
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Hace unos segundos';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return formatDate(date);
}

/**
 * Verificar si una fecha es hoy
 */
function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
}

/**
 * Obtener días de la semana en español
 */
function getDayNames() {
    return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
}

/**
 * Obtener meses en español
 */
function getMonthNames() {
    return [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
}

// ===== UTILIDADES DE ARCHIVO =====

/**
 * Validar tipo de archivo
 */
function validateFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
}

/**
 * Validar tamaño de archivo
 */
function validateFileSize(file, maxSizeMB) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

/**
 * Formatear tamaño de archivo
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== UTILIDADES DE CARGA =====

/**
 * Mostrar indicador de carga
 */
function showLoading(elementId = 'loading') {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

/**
 * Ocultar indicador de carga
 */
function hideLoading(elementId = 'loading') {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

/**
 * Crear spinner dinámico
 */
function createSpinner(size = 'normal') {
    const spinner = createElement('div', {
        className: `spinner ${size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : ''}`
    });
    return spinner;
}

// ===== UTILIDADES DE EVENTO =====

/**
 * Agregar evento con limpieza automática
 */
function addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    return () => element.removeEventListener(event, handler);
}

/**
 * Disparar evento personalizado
 */
function triggerCustomEvent(element, eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    element.dispatchEvent(event);
}

// ===== UTILIDADES DE URL =====

/**
 * Obtener parámetros de la URL
 */
function getURLParams() {
    const params = {};
    const urlSearchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlSearchParams) {
        params[key] = value;
    }
    return params;
}

/**
 * Actualizar parámetro de URL sin recargar
 */
function updateURLParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url);
}

// ===== UTILIDADES DE PERFORMANCE =====

/**
 * Medir tiempo de ejecución
 */
function measureExecutionTime(fn, ...args) {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`Función ejecutada en ${end - start} milisegundos`);
    return result;
}

/**
 * Lazy loading de imágenes
 */
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.Utils = {
    // HTTP
    fetchWithErrorHandling,
    submitForm,
    
    // Timing
    debounce,
    throttle,
    
    // Validación
    validateEmail,
    validatePassword,
    validatePhone,
    validateUsername,
    setupFormValidation,
    validateField,
    updateFieldValidation,
    
    // Formateo
    formatDate,
    formatNumber,
    formatGrade,
    getGradeColor,
    formatFullName,
    capitalizeFirst,
    toTitleCase,
    
    // DOM
    createElement,
    waitForElement,
    scrollToElement,
    
    // Storage
    saveToStorage,
    getFromStorage,
    removeFromStorage,
    
    // Tiempo
    getRelativeTime,
    isToday,
    getDayNames,
    getMonthNames,
    
    // Archivos
    validateFileType,
    validateFileSize,
    formatFileSize,
    
    // Loading
    showLoading,
    hideLoading,
    createSpinner,
    
    // Eventos
    addEventListenerWithCleanup,
    triggerCustomEvent,
    
    // URL
    getURLParams,
    updateURLParam,
    
    // Performance
    measureExecutionTime,
    setupLazyLoading
};

// ===== INICIALIZACIÓN AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', function() {
    // Configurar lazy loading automáticamente
    setupLazyLoading();
    
    // Configurar validación en formularios existentes
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (form.id) {
            setupFormValidation(form.id);
        }
    });
});

// ===== POLYFILLS PARA COMPATIBILIDAD =====

// Polyfill para Object.assign
if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        
        var to = Object(target);
        
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

// Polyfill para Array.includes
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement) {
        'use strict';
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement) {
                return true;
            }
            k++;
        }
        return false;
    };
}

// ===== MANEJO GLOBAL DE ERRORES =====
window.addEventListener('error', function(e) {
    console.error('Error global capturado:', e.error);
    // Aquí se podría enviar el error a un servicio de logging
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promise rechazada no manejada:', e.reason);
    // Aquí se podría enviar el error a un servicio de logging
});

// ===== DETECCIÓN DE CARACTERÍSTICAS =====
const Features = {
    // Detectar soporte para localStorage
    hasLocalStorage: (function() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    })(),
    
    // Detectar soporte para fetch
    hasFetch: typeof fetch !== 'undefined',
    
    // Detectar soporte para WebSockets
    hasWebSocket: typeof WebSocket !== 'undefined',
    
    // Detectar dispositivo móvil
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    
    // Detectar si está en modo oscuro
    isDarkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
    
    // Detectar soporte para notificaciones
    hasNotifications: 'Notification' in window,
    
    // Detectar soporte para Service Workers
    hasServiceWorker: 'serviceWorker' in navigator
};

window.Features = Features;

// ===== CONFIGURACIÓN REACTIVA =====
const Config = {
    // Configuración de la aplicación
    app: {
        name: 'Sistema Escolar',
        version: '2.0',
        debug: true
    },
    
    // Configuración de API
    api: {
        baseUrl: window.location.origin,
        timeout: 30000,
        retries: 3
    },
    
    // Configuración de UI
    ui: {
        animationDuration: 300,
        debounceDelay: 300,
        toastDuration: 5000
    },
    
    // Configuración de validación
    validation: {
        minPasswordLength: 6,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif']
    }
};

window.Config = Config;

// ===== SISTEMA DE EVENTOS GLOBAL =====
const EventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en callback del evento ${event}:`, error);
                }
            });
        }
    },
    
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
};

window.EventBus = EventBus;

// ===== SISTEMA DE CACHE SIMPLE =====
const Cache = {
    data: new Map(),
    
    set(key, value, ttl = 300000) { // TTL por defecto: 5 minutos
        const expiresAt = Date.now() + ttl;
        this.data.set(key, { value, expiresAt });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiresAt) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    delete(key) {
        return this.data.delete(key);
    },
    
    clear() {
        this.data.clear();
    },
    
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.data) {
            if (now > item.expiresAt) {
                this.data.delete(key);
            }
        }
    }
};

// Limpiar cache automáticamente cada 5 minutos
setInterval(() => Cache.cleanup(), 300000);

window.Cache = Cache;

// ===== LOGGER PERSONALIZADO =====
const Logger = {
    levels: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    },
    
    currentLevel: Config.app.debug ? 3 : 1,
    
    log(level, message, data = null) {
        if (this.levels[level] <= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level}] ${message}`;
            
            switch (level) {
                case 'ERROR':
                    console.error(logMessage, data);
                    break;
                case 'WARN':
                    console.warn(logMessage, data);
                    break;
                case 'INFO':
                    console.info(logMessage, data);
                    break;
                case 'DEBUG':
                    console.log(logMessage, data);
                    break;
            }
        }
    },
    
    error(message, data) {
        this.log('ERROR', message, data);
    },
    
    warn(message, data) {
        this.log('WARN', message, data);
    },
    
    info(message, data) {
        this.log('INFO', message, data);
    },
    
    debug(message, data) {
        this.log('DEBUG', message, data);
    }
};

window.Logger = Logger;

// ===== UTILIDADES ESPECÍFICAS DEL SISTEMA ESCOLAR =====

/**
 * Calcular promedio de calificaciones
 */
function calculateAverage(grades) {
    if (!grades || grades.length === 0) return 0;
    const validGrades = grades.filter(grade => !isNaN(parseFloat(grade)));
    if (validGrades.length === 0) return 0;
    
    const sum = validGrades.reduce((acc, grade) => acc + parseFloat(grade), 0);
    return sum / validGrades.length;
}

/**
 * Obtener estado académico según promedio
 */
function getAcademicStatus(average) {
    if (average >= 7) return { status: 'Aprobado', class: 'success' };
    if (average >= 4) return { status: 'Regular', class: 'warning' };
    return { status: 'Desaprobado', class: 'danger' };
}

/**
 * Formatear horario
 */
function formatScheduleTime(time) {
    return time.substring(0, 5); // HH:MM
}

/**
 * Obtener días de la semana para horarios
 */
function getWeekDays() {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
}

/**
 * Validar DNI argentino
 */
function validateDNI(dni) {
    const dniRegex = /^\d{7,8}$/;
    return dniRegex.test(dni.replace(/\./g, ''));
}

/**
 * Formatear DNI
 */
function formatDNI(dni) {
    const cleanDNI = dni.replace(/\D/g, '');
    return cleanDNI.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

/**
 * Generar código de materia
 */
function generateSubjectCode(subjectName, year, specialty) {
    const words = subjectName.split(' ');
    let code = '';
    
    // Tomar primeras letras de cada palabra
    words.forEach(word => {
        if (word.length > 0) {
            code += word.charAt(0).toUpperCase();
        }
    });
    
    // Agregar año y código de especialidad
    code += year.charAt(0) + specialty.charAt(0).toUpperCase();
    
    return code;
}

/**
 * Obtener color para especialidad
 */
function getSpecialtyColor(specialty) {
    const colors = {
        'programacion': 'primary',
        'electronica': 'secondary',
        'general': 'info'
    };
    return colors[specialty.toLowerCase()] || 'info';
}

/**
 * Validar año académico
 */
function validateAcademicYear(year) {
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year);
    return yearNum >= 2020 && yearNum <= currentYear + 1;
}

// Agregar utilidades escolares a Utils
Object.assign(window.Utils, {
    calculateAverage,
    getAcademicStatus,
    formatScheduleTime,
    getWeekDays,
    validateDNI,
    formatDNI,
    generateSubjectCode,
    getSpecialtyColor,
    validateAcademicYear
});

// ===== INICIALIZACIÓN FINAL =====
Logger.info('Sistema de utilidades cargado correctamente');

// Emitir evento de utilidades listas
EventBus.emit('utils:ready', {
    features: Features,
    config: Config
});