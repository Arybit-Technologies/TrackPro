/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// TrackProApp Singleton
const TrackProApp = {
    websocket: null,
    websocketUrl: 'wss://trackpro.arybit.co.ke/ws',
    timeUpdateInterval: null,
    map: null,
    marker: null,
    geofence: null,
    currentLocation: null,
    safeZone: { center: null, radius: 200 },
    isDarkMode: false,
    defaultLocation: { latitude: -1.286389, longitude: 36.817223 }, // Nairobi

    onDeviceReady() {
        console.log('Cordova is ready! Initializing TrackProApp...');
        this.hideLoading();
        this.updateTime();
        this.timeUpdateInterval = setInterval(() => this.updateTime(), 1000);
        this.updateConnectionStatus();
        this.initWebSocket();
        this.setupDarkModeToggle();
        this.setupNavigationListeners();
        this.showScreen('home');
        //initializeLoggingPanel();
    },

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            loadingEl.addEventListener('transitionend', () => loadingEl.remove(), { once: true });
        }
    },

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Africa/Nairobi'
        });
        document.querySelectorAll('#time-display').forEach(el => {
            el.textContent = timeString;
            el.setAttribute('aria-label', `Current time: ${timeString}`);
        });
    },

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        const statusText = isOnline
            ? '<i class="fas fa-circle text-success"></i> Online'
            : '<i class="fas fa-circle text-danger"></i> Offline';
        document.querySelectorAll('#connection-status').forEach(element => {
            element.innerHTML = statusText;
            element.setAttribute('aria-label', `Connection status: ${isOnline ? 'Online' : 'Offline'}`);
        });

        if (!isOnline && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log('Offline detected, closing WebSocket to re-initialize.');
            this.websocket.close();
        } else if (isOnline && (!this.websocket || this.websocket.readyState !== WebSocket.OPEN)) {
            console.log('Online detected, attempting to initialize WebSocket.');
            this.initWebSocket();
        }
    },

    setupDarkModeToggle() {
        const toggleBtn = document.getElementById('toggleThemeBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isDarkMode = !this.isDarkMode;
                document.body.classList.toggle('dark-mode', this.isDarkMode);
                toggleBtn.innerHTML = this.isDarkMode
                    ? '<i class="fas fa-sun"></i> Light Mode'
                    : '<i class="fas fa-moon"></i> Dark Mode';
                toggleBtn.setAttribute('aria-label', `Switch to ${this.isDarkMode ? 'Light' : 'Dark'} Mode`);
            });
        }
    },

    setupNavigationListeners() {
        document.querySelectorAll('.nav-item').forEach(navItem => {
            const screenId = navItem.getAttribute('onclick')?.match(/showScreen\('([^']+)'\)/)?.[1];
            if (screenId) {
                navItem.addEventListener('click', () => this.showScreen(screenId));
            }
        });

        document.getElementById('routeOptimizationBtn')?.addEventListener('click', () => this.startRouteOptimization());
        document.getElementById('alertsBtn')?.addEventListener('click', () => this.openAlerts());
        document.getElementById('supportBtn')?.addEventListener('click', () => this.openSupport());
        document.getElementById('accountBtn')?.addEventListener('click', () => this.openAccount());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('languageToggleBtn')?.addEventListener('click', () => this.toggleLanguage());
    },

    showScreen(screenId) {
        try {
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
                screen.style.display = 'none';
                screen.setAttribute('aria-hidden', 'true');
            });
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

            const screen = document.getElementById(screenId);
            if (!screen) throw new Error(`Screen with ID "${screenId}" not found.`);
            screen.style.display = 'block';
            void screen.offsetWidth;
            screen.classList.add('active');
            screen.setAttribute('aria-hidden', 'false');

            const navBtn = document.querySelector(`.nav-item[onclick="showScreen('${screenId}')"]`);
            if (navBtn) navBtn.classList.add('active');

            if (screenId === 'tracking') this.initMap();
            this.updateTime();
            this.updateConnectionStatus();
        } catch (error) {
            console.error('Error switching screen:', error);
            this.showError(`Failed to load screen "${screenId}". Please try again. ${error.message}`);
        }
    },

    /**
     * Loads Google Maps JS API dynamically.
     */
    VigiliaApp: {
        loadGoogleMapsApi(apiKey) {
            return new Promise((resolve, reject) => {
                if (window.google && window.google.maps) return resolve();
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
                script.async = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    },

    getApiKey() {
        // TODO: Replace with secure environment variable in production
        return 'AIzaSyAloYDyJ7kvvz0U8MDDGVnf_4E_SJU8V0c';
    },

    async initMap() {
        if (this.map) {
            this.map.invalidateSize();
            if (this.currentLocation) {
                this.map.setView([this.currentLocation.latitude, this.currentLocation.longitude], 15);
            }
            return;
        }

        const mapEl = document.getElementById('map');
        if (!mapEl) {
            console.error('Map element #map not found.');
            return;
        }

        try {
            await VigiliaApp.loadGoogleMapsApi(this.getApiKey());
            const defaultLatLng = await this.getCurrentLocation().catch(() => ({
                latitude: -1.286389,
                longitude: 36.817223
            })); // Fallback: Nairobi
            this.map = new google.maps.Map(mapEl, {
                center: { lat: defaultLatLng.latitude, lng: defaultLatLng.longitude },
                zoom: 13,
                mapTypeId: 'roadmap',
                disableDefaultUI: true,
                zoomControl: true
            });
            this.marker = new google.maps.Marker({
                map: this.map,
                position: { lat: defaultLatLng.latitude, lng: defaultLatLng.longitude },
                title: 'You are here'
            });
            this.updateMapLocation();
            this.setupGeofence();
        } catch (error) {
            console.error('Map initialization failed:', error);
            this.showStatus('❌ Failed to load map: ' + error.message, 'danger');
        }
    },

    initWebSocket() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log('WebSocket already open.');
            return;
        }
        if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket is already connecting.');
            return;
        }

        try {
            this.websocket = new WebSocket(this.websocketUrl);

            this.websocket.onopen = () => {
                console.log('WebSocket connected successfully.');
                this.updateConnectionStatus();
                this.showStatus('Connected to tracking server.', 'success');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'location_update' && data.latitude && data.longitude) {
                        this.currentLocation = {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            accuracy: data.accuracy || 10
                        };
                        this.updateMapLocation();
                        this.updateLocationDetails();
                        this.showStatus('Received location update from server.', 'info');
                    } else {
                        console.warn('Received unknown or malformed WebSocket message:', data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message or processing data:', error, 'Message:', event.data);
                    this.showError('Failed to process data from server.');
                }
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus();
                this.showError('WebSocket connection error. Attempting to reconnect...');
            };

            this.websocket.onclose = (event) => {
                console.log('WebSocket closed.', event.code, event.reason);
                this.updateConnectionStatus();
                this.showStatus('Disconnected from tracking server. Reconnecting in 5 seconds...', 'warning');
                setTimeout(() => this.initWebSocket(), 5000);
            };
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            this.showError('Failed to establish WebSocket connection.');
            setTimeout(() => this.initWebSocket(), 5000);
        }
    },

    watchPosition() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported on this device.');
            this.showError('Geolocation is not supported on this device. Tracking functionality will be limited.');
            return;
        }

        if (this._watchId) {
            navigator.geolocation.clearWatch(this._watchId);
        }

        this._watchId = navigator.geolocation.watchPosition(
            (pos) => {
                this.currentLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: pos.timestamp
                };
                this.updateMapLocation();
                this.updateLocationDetails();
            },
            (err) => this.handleGeoError(err),
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
        console.log('Geolocation watch started.');
    },

    updateMapLocation() {
        if (!this.currentLocation || !this.map) return;

        const { latitude, longitude } = this.currentLocation;
        const newLatLng = L.latLng(latitude, longitude);

        if (this.marker) {
            this.marker.setLatLng(newLatLng);
        } else {
            this.marker = L.marker(newLatLng, {
                title: 'Current Location'
            }).addTo(this.map);
        }

        this.map.setView(newLatLng, 15);
        this.checkGeofence();
    },

    setupGeofence() {
        if (!this.safeZone.center || !this.map) return;

        if (this.geofence) {
            this.geofence.setLatLng(this.safeZone.center).setRadius(this.safeZone.radius);
        } else {
            this.geofence = L.circle(this.safeZone.center, {
                color: '#28a745',
                opacity: 0.8,
                weight: 2,
                fillColor: '#28a745',
                fillOpacity: 0.2,
                radius: this.safeZone.radius
            }).addTo(this.map);
        }

        const statusEl = document.getElementById('geofence-status');
        if (statusEl) {
            statusEl.textContent = 'Active';
            statusEl.style.color = '#28a745';
            statusEl.setAttribute('aria-label', 'Geofence status: Active');
        }
    },

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
                this.showStatus('Alert: You have left the safe zone!', 'danger');
            } else {
                statusEl.textContent = 'Within Safe Zone';
                statusEl.style.color = '#28a745';
                statusEl.setAttribute('aria-label', 'Geofence status: Within Safe Zone');
            }
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser/device.'));
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
    },

    updateLocationDetails() {
        if (!this.currentLocation) {
            this.getCurrentLocation().then(() => this.updateLocationDetails()).catch(() => {
                this.showStatus('❌ Unable to fetch location', 'danger');
            });
            return;
        }
        const { latitude, longitude, accuracy } = this.currentLocation;
        document.getElementById('lat')?.setAttribute('data-lat', latitude.toFixed(6));
        document.getElementById('lng')?.setAttribute('data-lng', longitude.toFixed(6));
        document.getElementById('accuracy')?.setAttribute('data-accuracy', `±${accuracy}m`);
        const mapLinkEl = document.getElementById('view-map-link');
        if (mapLinkEl) mapLinkEl.href = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        this.updateMapLocation();
    },

    handleGeoError(err) {
        let message = 'An unknown error occurred while trying to get your location.';
        switch (err.code) {
            case err.PERMISSION_DENIED:
                message = 'Location access was denied. Please enable location services for this app in your device settings.';
                break;
            case err.POSITION_UNAVAILABLE:
                message = 'Your location information is unavailable. Please check your GPS signal.';
                break;
            case err.TIMEOUT:
                message = 'Could not retrieve location within the allotted time. Please try again.';
                break;
        }
        console.error('Geolocation error:', err.code, message, err);
        this.showError(message);
    },

    showError(message) {
        //alert(`Error: ${message}`);
        console.error(message);
    },

    showStatus(message, type = 'info') {
        console.log(`Status (${type}): ${message}`);
    },

    startRouteOptimization() {
        this.showStatus('Route optimization started (feature coming soon).', 'info');
    },
    openAlerts() {
        this.showStatus('Alert management opened (feature coming soon).', 'info');
    },
    openSupport() {
        window.location.href = 'mailto:support@trackpro.arybit.co.ke?subject=TrackProApp%20Support%20Request';
        this.showStatus('Opening email client for support.', 'info');
    },
    openAccount() {
        this.showStatus('Account management coming soon.', 'info');
    },
    openSettings() {
        this.showStatus('Settings coming soon.', 'info');
    },
    toggleLanguage() {
        this.showStatus('Language switch coming soon.', 'info');
    },

    sendLocationToServer(location) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                const message = {
                    type: 'location_update',
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    timestamp: location.timestamp || Date.now()
                };
                this.websocket.send(JSON.stringify(message));
                console.log('Sent location to server:', message);
            } catch (error) {
                console.error('Error sending location to WebSocket:', error);
                this.showError('Failed to send location update to server.');
            }
        } else {
            console.warn('WebSocket not open, cannot send location.');
            this.showStatus('Not connected to tracking server. Location not sent.', 'warning');
        }
    }
};

// Cordova Event Listener
document.addEventListener('deviceready', () => TrackProApp.onDeviceReady(), false);

// Expose global functions for HTML onclick
window.showScreen = (id) => TrackProApp.showScreen(id);
window.startRouteOptimization = () => TrackProApp.startRouteOptimization();
window.openAlerts = () => TrackProApp.openAlerts();
window.openSupport = () => TrackProApp.openSupport();
window.openAccount = () => TrackProApp.openAccount();
window.openSettings = () => TrackProApp.openSettings();
window.toggleLanguage = () => TrackProApp.toggleLanguage();

/**
 * Initializes the logging panel.
 */
const initializeLoggingPanel = () => {
    const vigiliaLogHistory = [];
    const MAX_LOG_ENTRIES = 200;
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
        const text = Array.from(args).map(a => {
            if (typeof a === 'object' && a !== null) {
                try {
                    return JSON.stringify(a, null, 2);
                } catch {
                    return '[Object]';
                }
            }
            return String(a);
        }).join(' ');
        vigiliaLogHistory.push({ type, text: text.replace(/[<>&]/g, ''), timestamp: new Date() });
        if (vigiliaLogHistory.length > MAX_LOG_ENTRIES) vigiliaLogHistory.shift();
        renderLogPanel();
        orig[type].apply(console, args);
    };
    console.log = (...args) => appendLog('log', args);
    console.warn = (...args) => appendLog('warn', args);
    console.error = (...args) => appendLog('error', args);
};