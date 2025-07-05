// Define API configuration
window.API_CONFIG = {
    BASE_URL: 'https://trackpro.arybit.co.ke/api',
    SERVER_URL: 'https://trackpro.arybit.co.ke/server',
    //SERVER_URL: 'https://arybit.x10.mx/index.php',
    DEVICE_URL: 'https://arybit.x10.mx/device_simulator.php',

    ENDPOINTS: {
        AUTH: {
            CSRF: '/csrf-token',  // Add this line
            LOGIN: '/auth/login',  
            LOGOUT: '/auth/logout',
            REGISTER: '/auth/register',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password',
            VERIFY_EMAIL: '/auth/verify-email',
            RESEND_VERIFICATION: '/auth/resend-verification'
        },
        USER: {
            PROFILE: '/user/profile',
            UPDATE_PROFILE: '/user/update-profile',
            CHANGE_PASSWORD: '/user/change-password',
            DELETE_ACCOUNT: '/user/delete-account'
        },
        POSTS: {
            CREATE: '/posts/create',
            UPDATE: '/posts/update',
            DELETE: '/posts/delete',
            LIST: '/posts/list',
            DETAIL: '/posts/detail'
        },
        COMMENTS: {
            CREATE: '/comments/create',
            UPDATE: '/comments/update',
            DELETE: '/comments/delete',
            LIST: '/comments/list'
        },
        NOTIFICATIONS: {
            LIST: '/notifications/list',
            MARK_AS_READ: '/notifications/mark-as-read',
            DELETE: '/notifications/delete'
        },
        MESSAGES: {
            SEND: '/messages/send',
            LIST: '/messages/list',
            DETAIL: '/messages/detail',
            DELETE: '/messages/delete'
        },
        SETTINGS: {
            GET: '/settings/get',
            UPDATE: '/settings/update'
        },
        REPORTS: {
            CREATE: '/reports/create',
            LIST: '/reports/list',
            DETAIL: '/reports/detail'
        },
        SEARCH: {
            GLOBAL: '/search/global',
            POSTS: '/search/posts',
            USERS: '/search/users'
        },
        ANALYTICS: {
            DASHBOARD: '/analytics/dashboard',
            USER_STATS: '/analytics/user-stats',
            POST_STATS: '/analytics/post-stats'
        },
        FILES: {
            UPLOAD: '/files/upload',
            DOWNLOAD: '/files/download',
            DELETE: '/files/delete'
        },
        ADMIN: {
            USER_MANAGEMENT: '/admin/user-management',
            POST_MODERATION: '/admin/post-moderation',
            REPORTS_MANAGEMENT: '/admin/reports-management',
            SETTINGS_MANAGEMENT: '/admin/settings-management'
        }                
    },
    DEFAULT_PARAMS: {
        PAGE: 1,
        LIMIT: 20,
        SORT: 'created_at',
        ORDER: 'desc'
    },
    CACHE_DURATION: {
        SHORT: 300, // 5 minutes
        MEDIUM: 900, // 15 minutes
        LONG: 3600 // 1 hour
    }
};

// For module support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.API_CONFIG;
}