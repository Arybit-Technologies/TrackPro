/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

class TrackProApp {
    constructor() {
        this.map = null;
        this.marker = null;
        this.geofence = null;
        this.currentLocation = null;
        this.websocket = null;
        this.isDarkMode = false;
        this.timeUpdateInterval = null;
        this.websocketUrl = 'wss://trackpro.arybit.co.ke/api/ws'; // Replace with actual WebSocket URL
        this.defaultLocation = { latitude: -1.286389, longitude: 36.817223 }; // Nairobi coordinates
        this.safeZone = { center: null, radius: 200 }; // Geofence radius in meters
        this.bindEvents();
    }

    bindEvents() {
        // Cordova device ready event
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        // Fallback for non-Cordova environments (e.g., browser testing)
        if (typeof cordova === 'undefined') {
            setTimeout(() => this.onDeviceReady(), 1000);
        }
        // Expose methods for HTML onclick handlers
        window.showScreen = this.showScreen.bind(this);
        window.startRouteOptimization = this.startRouteOptimization.bind(this);
        window.openAlerts = this.openAlerts.bind(this);
        window.openSupport = this.openSupport.bind(this);
        window.openAccount = this.openAccount.bind(this);
        window.openSettings = this.openSettings.bind(this);
        window.toggleLanguage = this.toggleLanguage.bind(this);
        // Handle online/offline events
        window.addEventListener('online', this.updateConnectionStatus.bind(this));
        window.addEventListener('offline', this.updateConnectionStatus.bind(this));
    }

    onDeviceReady() {
        this.hideLoading();
        this.updateTime();
        this.timeUpdateInterval = setInterval(() => this.updateTime(), 1000);
        this.updateConnectionStatus();
        this.initWebSocket();
        this.setupDarkModeToggle();
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            setTimeout(() => loadingEl.remove(), 500); // Remove after fade-out
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Nairobi' // EAT timezone
        });
        document.querySelectorAll('#time-display').forEach(el => {
            el.textContent = timeString;
            el.setAttribute('aria-label', `Current time: ${timeString}`);
        });
    }

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        const statusText = isOnline ? '<i class="fas fa-circle text-success"></i> Online' : '<i class="fas fa-circle text-danger"></i> Offline';
        document.querySelectorAll('#connection-status').forEach(element => {
            element.innerHTML = statusText;
            element.setAttribute('aria-label', `Connection status: ${isOnline ? 'Online' : 'Offline'}`);
        });
        if (!isOnline && this.websocket) {
            this.websocket.close();
            this.initWebSocket(); // Attempt reconnect
        }
    }

    setupDarkModeToggle() {
        const toggleBtn = document.getElementById('toggleThemeBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isDarkMode = !this.isDarkMode;
                document.body.classList.toggle('dark-mode', this.isDarkMode);
                toggleBtn.innerHTML = this.isDarkMode
                    ? '<i class="fas fa-sun"></i> Light Mode'
                    : '<i class="fas fa-moon"></i> Dark Mode';
            });
        }
    }

    showScreen(screenId) {
        try {
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const screen = document.getElementById(screenId);
            if (!screen) throw new Error(`Screen ${screenId} not found`);
            screen.classList.add('active');
            const navBtn = document.querySelector(`.nav-item[onclick="showScreen('${screenId}')"]`);
            if (navBtn) navBtn.classList.add('active');
            if (screenId === 'tracking') this.initMap();
            this.updateTime();
            this.updateConnectionStatus();
        } catch (error) {
            console.error('Error switching screen:', error);
            this.showError('Failed to load screen. Please try again.');
        }
    }

    async initMap() {
        if (this.map) {
            this.map.invalidateSize(); // Refresh Leaflet map size
            return;
        }
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        try {
            const location = await this.getCurrentLocation().catch(() => this.defaultLocation);
            this.map = L.map(mapEl).setView([location.latitude, location.longitude], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(this.map);
            this.marker = L.marker([location.latitude, location.longitude], {
                title: 'Current Location'
            }).addTo(this.map);
            this.safeZone.center = [location.latitude, location.longitude];
            this.setupGeofence();
            this.watchPosition();
        } catch (error) {
            console.error('Map initialization failed:', error);
            this.showError('Failed to initialize map. Please check your connection.');
        }
    }

    initWebSocket() {
        try {
            this.websocket = new WebSocket(this.websocketUrl);
            this.websocket.onopen = () => console.log('WebSocket connected');
            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'location_update') {
                        this.currentLocation = {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            accuracy: data.accuracy || 10
                        };
                        this.updateMapLocation();
                        this.updateLocationDetails();
                    }
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus();
            };
            this.websocket.onclose = () => {
                console.log('WebSocket closed. Attempting to reconnect...');
                setTimeout(() => this.initWebSocket(), 5000);
            };
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
        }
    }

    watchPosition() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            this.showError('Geolocation is not supported on this device.');
            return;
        }
        navigator.geolocation.watchPosition(
            (pos) => {
                this.currentLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
                this.updateMapLocation();
                this.updateLocationDetails();
            },
            (err) => this.handleGeoError(err),
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
    }

    updateMapLocation() {
        if (!this.currentLocation || !this.map) return;
        const { latitude, longitude } = this.currentLocation;
        this.map.setView([latitude, longitude], 15);
        if (this.marker) {
            this.marker.setLatLng([latitude, longitude]);
        } else {
            this.marker = L.marker([latitude, longitude], {
                title: 'Current Location'
            }).addTo(this.map);
        }
        this.checkGeofence();
    }

    setupGeofence() {
        if (!this.safeZone.center || !this.map) return;
        if (this.geofence) this.geofence.remove();
        this.geofence = L.circle(this.safeZone.center, {
            color: '#28a745',
            opacity: 0.8,
            weight: 2,
            fillColor: '#28a745',
            fillOpacity: 0.2,
            radius: this.safeZone.radius
        }).addTo(this.map);
        const statusEl = document.getElementById('geofence-status');
        if (statusEl) {
            statusEl.textContent = 'Active';
            statusEl.style.color = '#28a745';
            statusEl.setAttribute('aria-label', 'Geofence status: Active');
        }
    }

    checkGeofence() {
        if (!this.currentLocation || !this.safeZone.center) return;
        const distance = this.calculateDistance(
            this.currentLocation.latitude,
            this.currentLocation.longitude,
            this.safeZone.center[0],
            this.safeZone.center[1]
        );
        const statusEl = document.getElementById('geofence-status');
        if (statusEl) {
            if (distance > this.safeZone.radius) {
                statusEl.textContent = 'Outside Safe Zone';
                statusEl.style.color = '#dc3545';
                statusEl.setAttribute('aria-label', 'Geofence status: Outside Safe Zone');
            } else {
                statusEl.textContent = 'Within Safe Zone';
                statusEl.style.color = '#28a745';
                statusEl.setAttribute('aria-label', 'Geofence status: Within Safe Zone');
            }
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                error => reject(error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }

    updateLocationDetails() {
        if (!this.currentLocation) return;
        const { latitude, longitude, accuracy } = this.currentLocation;
        document.getElementById('lat')?.textContent = latitude.toFixed(6);
        document.getElementById('lng')?.textContent = longitude.toFixed(6);
        document.getElementById('accuracy')?.textContent = `${accuracy.toFixed(2)}m`;
        const mapLinkEl = document.getElementById('view-map-link');
        if (mapLinkEl) mapLinkEl.href = `https://maps.google.com/?q=${latitude},${longitude}`;
    }

    // Placeholder actions
    startRouteOptimization() { alert('Route optimization started'); }
    openAlerts() { alert('Alert management opened'); }
    openSupport() { window.location.href = 'mailto:support@trackpro.arybit.co.ke'; }
    openAccount() { alert('Account management coming soon'); }
    openSettings() { alert('Settings coming soon'); }
    toggleLanguage() { alert('Language switch coming soon'); }
}

/**
 * Initializes the logging panel.
 */
const MAX_LOG_ENTRIES = 100;
const initializeLoggingPanel = () => {
    const vigiliaLogHistory = [];
    const logPanel = document.createElement('div');
    logPanel.id = 'vigilia-log-panel';
    logPanel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 400px; max-height: 300px;
        background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); z-index: 1000; overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    logPanel.innerHTML = `
        <div id="vigilia-log-header" role="banner" style="cursor: move; background: linear-gradient(90deg, #32062E, #9B59B6); color: #FFFFFF; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600;">Console Log</span>
            <span>
                <button id="log-panel-clear" title="Clear logs" style="border: none; background: none; color: #FFFFFF; font-size: 1.1em; cursor: pointer;" aria-label="Clear logs">🧹</button>
                <button id="log-panel-toggle" title="Toggle panel" style="border: none; background: none; color: #FFFFFF; font-size: 1.1em; cursor: pointer;" aria-label="Toggle log panel">⬇</button>
            </span>
        </div>
        <div id="vigilia-log-body" style="padding: 10px; overflow-y: auto; max-height: 250px; font-size: 0.9em; background: #FFFFFF;" role="log"></div>
    `;
    document.body.appendChild(logPanel);

    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0, isMinimized = false;
    const header = logPanel.querySelector('#vigilia-log-header');
    header.addEventListener('mousedown', e => {
        isDragging = true;
        dragOffsetX = e.clientX - logPanel.offsetLeft;
        dragOffsetY = e.clientY - logPanel.offsetTop;
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
        if (isDragging) {
            logPanel.style.left = `${e.clientX - dragOffsetX}px`;
            logPanel.style.top = `${e.clientY - dragOffsetY}px`;
            logPanel.style.right = 'auto';
            logPanel.style.bottom = 'auto';
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    const renderLogPanel = () => {
        const body = document.getElementById('vigilia-log-body');
        body.innerHTML = '';
        vigiliaLogHistory.forEach(entry => {
            body.innerHTML += `<div class="log-msg log-${entry.type}" style="margin-bottom: 4px; white-space: pre-wrap; word-break: break-word; color: ${entry.type === 'log' ? '#1F2937' : entry.type === 'warn' ? '#D97706' : '#DC2626'};">[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.type.toUpperCase()}: ${entry.text}</div>`;
        });
        body.scrollTop = body.scrollHeight;
    };

    document.getElementById('log-panel-clear').onclick = () => {
        vigiliaLogHistory.length = 0;
        renderLogPanel();
        console.log('Log panel cleared');
    };
    document.getElementById('log-panel-toggle').onclick = () => {
        isMinimized = !isMinimized;
        document.getElementById('vigilia-log-body').style.display = isMinimized ? 'none' : 'block';
        logPanel.style.maxHeight = isMinimized ? '40px' : '300px';
        document.getElementById('log-panel-toggle').textContent = isMinimized ? '⬆' : '⬇';
        console.log(`Log panel ${isMinimized ? 'minimized' : 'expanded'}`);
    };
    window.addEventListener('keydown', e => {
        if (e.key === 'F8') {
            logPanel.style.display = logPanel.style.display === 'none' ? 'block' : 'none';
            renderLogPanel();
            console.log(`Log panel ${logPanel.style.display === 'none' ? 'hidden' : 'shown'}`);
        }
    });

    const orig = { log: console.log, warn: console.warn, error: console.error };
    const appendLog = (type, args) => {
        const text = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
        vigiliaLogHistory.push({ type, text: text.replace(/[<>&]/g, ''), timestamp: new Date() });
        if (vigiliaLogHistory.length > MAX_LOG_ENTRIES) vigiliaLogHistory.shift();
        renderLogPanel();
        orig[type].apply(console, args);
    };
    console.log = (...args) => appendLog('log', args);
    console.warn = (...args) => appendLog('warn', args);
    console.error = (...args) => appendLog('error', args);
};

// Optionally, auto-initialize in development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.addEventListener('DOMContentLoaded', initializeLoggingPanel);
}

// Initialize the app
new TrackProApp();
