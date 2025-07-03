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

/**
 * TrackProApp class for managing real-time tracking functionality in Cordova and web environments.
 */
class TrackProApp {
  // Singleton instance
  static #instance = null;

  // Private properties
  #websocket = null;
  #websocketUrl = 'wss://trackpro.arybit.co.ke/ws';
  #timeUpdateInterval = null;
  #map = null;
  #marker = null;
  #geofence = null;
  #currentLocation = null;
  #safeZone = { center: null, radius: 200 }; // Default radius: 200 meters
  #isDarkMode = false;
  #defaultLocation = { latitude: -1.286389, longitude: 36.817223 }; // Nairobi
  #watchId = null;
  #isCordova = typeof cordova !== 'undefined';

  /**
   * Private constructor to enforce singleton pattern.
   */
  constructor() {
    if (TrackProApp.#instance) {
      return TrackProApp.#instance;
    }
    TrackProApp.#instance = this;
  }

  /**
   * Get the singleton instance of TrackProApp.
   * @returns {TrackProApp} The singleton instance.
   */
  static getInstance() {
    if (!TrackProApp.#instance) {
      TrackProApp.#instance = new TrackProApp();
    }
    return TrackProApp.#instance;
  }

  /**
   * Initialize the app when the device is ready (Cordova) or on page load (web).
   */
  onDeviceReady() {
    console.log(`${this.#isCordova ? 'Cordova' : 'Web'} is ready! Initializing TrackProApp...`);
    this.hideLoading();
    this.updateTime();
    this.#timeUpdateInterval = setInterval(() => this.updateTime(), 1000);
    this.updateConnectionStatus();
    this.initWebSocket();
    this.setupDarkModeToggle();
    this.setupNavigationListeners();
    this.showScreen('home');
    setupQuickActionCards();
    //this.initializeLoggingPanel();
  }

  /**
   * Hide the loading screen with a fade-out effect.
   */
  hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
      loadingEl.addEventListener('transitionend', () => loadingEl.remove(), { once: true });
    }
  }

  /**
   * Update the displayed time in Nairobi timezone.
   */
  updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Nairobi',
    });
    document.querySelectorAll('#time-display').forEach((el) => {
      el.textContent = timeString;
      el.setAttribute('aria-label', `Current time: ${timeString}`);
    });
  }

  /**
   * Update the connection status indicator based on network state.
   */
  updateConnectionStatus() {
    const isOnline = navigator.onLine;
    const statusText = isOnline
      ? '<i class="fas fa-circle text-success"></i> Online'
      : '<i class="fas fa-circle text-danger"></i> Offline';
    document.querySelectorAll('#connection-status').forEach((element) => {
      element.innerHTML = statusText;
      element.setAttribute('aria-label', `Connection status: ${isOnline ? 'Online' : 'Offline'}`);
    });

    if (!isOnline && this.#websocket && this.#websocket.readyState === WebSocket.OPEN) {
      console.log('Offline detected, closing WebSocket to re-initialize.');
      this.#websocket.close();
    } else if (isOnline && (!this.#websocket || this.#websocket.readyState !== WebSocket.OPEN)) {
      console.log('Online detected, attempting to initialize WebSocket.');
      this.initWebSocket();
    }
  }

  /**
   * Set up the dark mode toggle button.
   */
  setupDarkModeToggle() {
    const toggleBtn = document.getElementById('toggleThemeBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.#isDarkMode = !this.#isDarkMode;
        document.body.classList.toggle('dark-mode', this.#isDarkMode);
        toggleBtn.innerHTML = this.#isDarkMode
          ? '<i class="fas fa-sun"></i> Light Mode'
          : '<i class="fas fa-moon"></i> Dark Mode';
        toggleBtn.setAttribute('aria-label', `Switch to ${this.#isDarkMode ? 'Light' : 'Dark'} Mode`);
      });
    }
  }

  /**
   * Set up navigation listeners for screen switching and feature buttons.
   */
  setupNavigationListeners() {
    document.querySelectorAll('.nav-item').forEach((navItem) => {
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
  }

  /**
   * Switch to the specified screen and update UI.
   * @param {string} screenId - The ID of the screen to display.
   */
  showScreen(screenId) {
    try {
      document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.remove('active');
        screen.style.display = 'none';
        screen.setAttribute('aria-hidden', 'true');
      });
      document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));

      const screen = document.getElementById(screenId);
      if (!screen) throw new Error(`Screen with ID "${screenId}" not found.`);
      screen.style.display = 'block';
      void screen.offsetWidth; // Trigger reflow for animation
      screen.classList.add('active');
      screen.setAttribute('aria-hidden', 'false');

      const navBtn = document.querySelector(`.nav-item[onclick="showScreen('${screenId}')"]`);
      if (navBtn) navBtn.classList.add('active');

      // Use the new toggleHeader function
      toggleHeader(screenId);

      if (screenId === 'tracking') this.initMap();
      if (screenId === 'geofencing') this.initGeofenceMap();
      if (screenId === 'ai-route-optimization') this.initAiRouteOptimizationMap();
      this.updateTime();
      this.updateConnectionStatus();
    } catch (error) {
      console.error('Error switching screen:', error);
      this.showError(`Failed to load screen "${screenId}". Please try again. ${error.message}`);
    }
  }

  /**
   * Load Google Maps JavaScript API dynamically.
   * @param {string} apiKey - Google Maps API key.
   * @returns {Promise<void>}
   */
  static async loadGoogleMapsApi(apiKey) {
    if (window.google && window.google.maps) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Get the Google Maps API key.
   * @returns {string} The API key.
   */
  getApiKey() {
    // TODO: Replace with secure environment variable in production
    return 'AIzaSyAloYDyJ7kvvz0U8MDDGVnf_4E_SJU8V0c';
  }

  /**
   * Initialize the Google Map for the tracking screen.
   */
  async initMap() {
    if (this.#map) {
      this.#map.setCenter({
        lat: this.#currentLocation?.latitude || this.#defaultLocation.latitude,
        lng: this.#currentLocation?.longitude || this.#defaultLocation.longitude,
      });
      return;
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) {
      console.error('Map element #map not found.');
      return;
    }

    try {
      await TrackProApp.loadGoogleMapsApi(this.getApiKey());
      const defaultLatLng = await this.getCurrentLocation().catch(() => this.#defaultLocation);
      this.#map = new google.maps.Map(mapEl, {
        center: { lat: defaultLatLng.latitude, lng: defaultLatLng.longitude },
        zoom: 13,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
      });
      this.#marker = new google.maps.Marker({
        map: this.#map,
        position: { lat: defaultLatLng.latitude, lng: defaultLatLng.longitude },
        title: 'You are here',
      });
      this.updateMapLocation();
      this.setupGeofence();
      this.watchPosition(); // Start watching position after map initialization
    } catch (error) {
      console.error('Map initialization failed:', error);
      this.showStatus('❌ Failed to load map: ' + error.message, 'danger');
    }
  }

  /**
   * Initialize the WebSocket connection for real-time updates.
   */
  initWebSocket() {
    if (this.#websocket && this.#websocket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already open.');
      return;
    }
    if (this.#websocket && this.#websocket.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is already connecting.');
      return;
    }

    try {
      this.#websocket = new WebSocket(this.#websocketUrl);

      this.#websocket.onopen = () => {
        console.log('WebSocket connected successfully.');
        this.updateConnectionStatus();
        this.showStatus('Connected to tracking server.', 'success');
      };

      this.#websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'location_update' && data.latitude && data.longitude) {
            this.#currentLocation = {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy || 10,
              timestamp: Date.now(),
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

      this.#websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus();
        this.showError('WebSocket connection error. Attempting to reconnect...');
      };

      this.#websocket.onclose = (event) => {
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
  }

  /**
   * Start watching the device's geolocation.
   */
  watchPosition() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported on this device.');
      this.showError('Geolocation is not supported on this device. Tracking functionality will be limited.');
      return;
    }

    if (this.#watchId) {
      navigator.geolocation.clearWatch(this.#watchId);
    }

    this.#watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.#currentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        this.updateMapLocation();
        this.updateLocationDetails();
        this.sendLocationToServer(this.#currentLocation);
      },
      (err) => this.handleGeoError(err),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
    console.log('Geolocation watch started.');
  }

  /**
   * Updates map with current location.
   */
  updateMapLocation() {
    if (!this.#currentLocation || !this.#map) return;
    const { latitude, longitude, accuracy } = this.#currentLocation;
    const latLng = { lat: latitude, lng: longitude };
    this.#map.setCenter(latLng);
    this.#map.setZoom(15);

    if (this.#marker) {
      this.#marker.setPosition(latLng);
    } else {
      this.#marker = new google.maps.Marker({
        position: latLng,
        map: this.#map,
        title: 'You are here',
      });
    }

    const statusEl = document.getElementById('geofence-status');
    const geofenceStatus = statusEl?.textContent || 'Inactive';
    const geofenceColor = statusEl?.style.color || '#28a745';

    const themeColor = '#32062e'; // Use your app's primary color
    const logoUrl = 'icons/icon-32x32.png'; // Path to your logo image

    const infoContent = `
      <div class="d-flex flex-wrap gap-2 align-items-center" style="font-size:0.95em;">
        <img src="${logoUrl}" alt="TrackPro Logo" style="width:24px;height:24px;border-radius:6px;background:${themeColor};margin-right:6px;box-shadow:0 2px 8px rgba(50,6,46,0.12);">
        <span class="badge bg-primary bg-gradient">
          <i class="fas fa-map-marker-alt"></i> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
        </span>
        <span class="badge bg-secondary">
          <i class="fas fa-bullseye"></i> ±${accuracy}m
        </span>
        <span class="badge" style="background:#28a7451a;color:${geofenceColor};font-weight:600;">
          ${geofenceStatus}
        </span>
      </div>
    `;
    if (this.infoWindow) this.infoWindow.close();
    this.infoWindow = new google.maps.InfoWindow({ content: infoContent });
    this.infoWindow.open(this.#map, this.#marker);

    this.checkGeofence();
  }

  /**
   * Sets up geofence around safe zone.
   */
  setupGeofence() {
    const location = this.#currentLocation;
    const map = this.#map;
    const safeZone = this.#safeZone;

    if (!location || !map) {
        console.warn('No location or map for geofence');
        return;
    }
    if (!safeZone.center) {
        safeZone.center = [location.latitude, location.longitude];
    }
    const centerLatLng = { lat: safeZone.center[0], lng: safeZone.center[1] };

    // Remove previous geofence if exists
    if (this.#geofence) this.#geofence.setMap(null);

    // Debug log
    console.log('Drawing geofence at:', centerLatLng, 'radius:', safeZone.radius);

    this.#geofence = new google.maps.Circle({
        strokeColor: '#28a745',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#28a745',
        fillOpacity: 0.2,
        map: map,
        center: centerLatLng,
        radius: safeZone.radius || 200 // fallback to 200 if undefined
    });

    const statusEl = document.getElementById('geofence-status');
    if (statusEl) statusEl.textContent = 'Active';
  }

  /**
   * Checks if user is within safe zone.
   */
  checkGeofence() {
    if (!this.#currentLocation || !this.#safeZone.center) return;
    const distance = this.calculateDistance(
      this.#currentLocation.latitude,
      this.#currentLocation.longitude,
      this.#safeZone.center[0],
      this.#safeZone.center[1]
    );
    const statusEl = document.getElementById('geofence-status');
    if (distance > this.#safeZone.radius) {
      statusEl.textContent = 'Outside Safe Zone';
      statusEl.style.color = '#dc3545';
      this.notifySafeZoneBreach?.();
    } else {
      statusEl.textContent = 'Within Safe Zone';
      statusEl.style.color = '#28a745';
    }
  }

  /**
   * Calculate the distance between two coordinates using the Haversine formula.
   * @param {number} lat1 - Latitude of the first point.
   * @param {number} lon1 - Longitude of the first point.
   * @param {number} lat2 - Latitude of the second point.
   * @param {number} lon2 - Longitude of the second point.
   * @returns {number} Distance in meters.
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get the current device location using the Geolocation API.
   * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
   */
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
            timestamp: position.timestamp,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Update the UI with current location details.
   */
  updateLocationDetails() {
    if (!this.#currentLocation) {
      this.getCurrentLocation()
        .then(() => this.updateLocationDetails())
        .catch(() => {
          this.showStatus('❌ Unable to fetch location', 'danger');
        });
      return;
    }
    const { latitude, longitude, accuracy } = this.#currentLocation;
    document.getElementById('lat')?.setAttribute('data-lat', latitude.toFixed(6));
    document.getElementById('lng')?.setAttribute('data-lng', longitude.toFixed(6));
    document.getElementById('accuracy')?.setAttribute('data-accuracy', `±${accuracy}m`);
    const mapLinkEl = document.getElementById('view-map-link');
    if (mapLinkEl) mapLinkEl.href = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    this.updateMapLocation();
  }

  /**
   * Handle geolocation errors and display appropriate messages.
   * @param {GeolocationPositionError} err - The geolocation error object.
   */
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
  }

  /**
   * Display an error message to the user.
   * @param {string} message - The error message to display.
   */
  showError(message) {
    console.error(message);
    // TODO: Implement a proper UI notification system (e.g., toast or modal)
    //alert(`Error: ${message}`);
  }

  /**
   * Display a status message to the user.
   * @param {string} message - The status message to display.
   * @param {string} [type='info'] - The type of status ('info', 'success', 'warning', 'danger').
   */
  showStatus(message, type = 'info') {
    console.log(`Status (${type}): ${message}`);
    // TODO: Implement a proper UI notification system
  }

  /**
   * Send location data to the WebSocket server.
   * @param {{latitude: number, longitude: number, accuracy: number, timestamp: number}} location - The location data.
   */
  sendLocationToServer(location) {
    if (this.#websocket && this.#websocket.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: 'location_update',
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp || Date.now(),
        };
        this.#websocket.send(JSON.stringify(message));
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

  /**
   * Initialize the logging panel for debugging.
   */
  initializeLoggingPanel() {
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

    let isDragging = false,
      dragOffsetX = 0,
      dragOffsetY = 0,
      isMinimized = false;
    const header = logPanel.querySelector('#vigilia-log-header');
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - logPanel.offsetLeft;
      dragOffsetY = e.clientY - logPanel.offsetTop;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
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
      vigiliaLogHistory.forEach((entry) => {
        body.innerHTML += `<div class="log-msg log-${entry.type}" style="margin-bottom: 4px; white-space: pre-wrap; word-break: break-word; color: ${
          entry.type === 'log' ? '#1F2937' : entry.type === 'warn' ? '#D97706' : '#DC2626'
        };">[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.type.toUpperCase()}: ${
          entry.text
        }</div>`;
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
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F8') {
        logPanel.style.display = logPanel.style.display === 'none' ? 'block' : 'none';
        renderLogPanel();
        console.log(`Log panel ${logPanel.style.display === 'none' ? 'hidden' : 'shown'}`);
      }
    });

    const orig = { log: console.log, warn: console.warn, error: console.error };
    const appendLog = (type, args) => {
      const text = Array.from(args)
        .map((a) => {
          if (typeof a === 'object' && a !== null) {
            try {
              return JSON.stringify(a, null, 2);
            } catch {
              return '[Object]';
            }
          }
          return String(a);
        })
        .join(' ')
        .replace(/[<>&]/g, '');
      vigiliaLogHistory.push({ type, text, timestamp: new Date() });
      if (vigiliaLogHistory.length > MAX_LOG_ENTRIES) vigiliaLogHistory.shift();
      renderLogPanel();
      orig[type].apply(console, args);
    };
    console.log = (...args) => appendLog('log', args);
    console.warn = (...args) => appendLog('warn', args);
    console.error = (...args) => appendLog('error', args);
  }

  /**
   * Open the support contact options.
   */
  openSupport() {
    this.showStatus('Support feature is under development. Please contact support@example.com for assistance.', 'info');
  }

  /**
   * Open the account settings.
   */
  openAccount() {
    this.showStatus('Account feature is under development. Please check back later.', 'info');
  }

  /**
   * Open the app settings.
   */
  openSettings() {
    this.showStatus('Settings feature is under development. Please check back later.', 'info');
  }

  /**
   * Toggle the app language between English and Swahili.
   */
  toggleLanguage() {
    const currentLang = document.documentElement.lang;
    const newLang = currentLang === 'en' ? 'sw' : 'en';
    document.documentElement.lang = newLang;

    // Update UI text based on the new language
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.getTranslation(key, newLang);
    });

    this.showStatus(`Language switched to ${newLang === 'en' ? 'English' : 'Kiswahili'}.`, 'success');
  }

  /**
   * Get the translation for a given key and language.
   * @param {string} key - The translation key.
   * @param {string} lang - The language code (e.g., 'en' or 'sw').
   * @returns {string} The translated text.
   */
  getTranslation(key, lang) {
    const translations = {
      'app.title': {
        en: 'TrackPro - Real-time Tracking',
        sw: 'TrackPro - Ufuatiliaji wa Wakati Halisi',
      },
      'app.description': {
        en: 'Manage your real-time tracking settings and view your location history.',
        sw: 'S管理您的实时跟踪设置并查看您的位置历史记录。',
      },
      'button.start': {
        en: 'Start Tracking',
        sw: 'Anza Kufuatilia',
      },
      'button.stop': {
        en: 'Stop Tracking',
        sw: 'Acha Kufuatilia',
      },
      'status.connected': {
        en: 'Connected to tracking server.',
        sw: '已连接到跟踪服务器。',
      },
      'status.disconnected': {
        en: 'Disconnected from tracking server.',
        sw: '与跟踪服务器断开连接。',
      },
      'status.error': {
        en: 'An error occurred. Please try again.',
        sw: '发生错误。请再试一次。',
      },
      'geofence.active': {
        en: 'Geofence Active',
        sw: '地理围栏已激活',
      },
      'geofence.inactive': {
        en: 'Geofence Inactive',
        sw: '地理围栏未激活',
      },
      'language.english': {
        en: 'English',
        sw: '英语',
      },
      'language.swahili': {
        en: 'Swahili',
        sw: '斯瓦希里语',
      },
    };

    return translations[key]?.[lang] || key;
  }

  /**
   * Start route optimization process.
   */
  startRouteOptimization() {
    this.showStatus('Route optimization feature is under development. Please check back later.', 'info');
  }

  /**
   * Initialize the geofencing map and display sample geofence zones.
   */
  initGeofenceMap() {
    const mapEl = document.getElementById('geofence-map');
    if (!mapEl) {
      console.error('Geofence map element #geofence-map not found.');
      return;
    }

    // Only initialize once
    if (this._geofenceMap) return;

    // Sample geofence data: circles and polygons
    const geofences = [
      {
        id: 'zone1',
        name: 'Office Zone',
        type: 'circle',
        center: { lat: -1.286389, lng: 36.817223 },
        radius: 300,
        color: '#28a745'
      },
      {
        id: 'zone2',
        name: 'Warehouse Area',
        type: 'polygon',
        path: [
          { lat: -1.287, lng: 36.816 },
          { lat: -1.288, lng: 36.818 },
          { lat: -1.289, lng: 36.817 },
          { lat: -1.288, lng: 36.815 }
        ],
        color: '#ff6b9d'
      }
    ];

    // Center map on first geofence
    const center = geofences[0].type === 'circle'
      ? geofences[0].center
      : geofences[0].path[0];

    this._geofenceMap = new google.maps.Map(mapEl, {
      center,
      zoom: 15,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      zoomControl: true,
    });

    // Draw geofences
    this._geofenceOverlays = [];
    geofences.forEach(zone => {
      if (zone.type === 'circle') {
        const circle = new google.maps.Circle({
          strokeColor: zone.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.18,
          map: this._geofenceMap,
          center: zone.center,
          radius: zone.radius
        });
        this._geofenceOverlays.push(circle);
      } else if (zone.type === 'polygon') {
        const polygon = new google.maps.Polygon({
          paths: zone.path,
          strokeColor: zone.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.18,
          map: this._geofenceMap
        });
        this._geofenceOverlays.push(polygon);
      }
    });

    // Optional: Add info windows on click
    this._geofenceOverlays.forEach((overlay, i) => {
      overlay.addListener('click', (e) => {
        const zone = geofences[i];
        const info = new google.maps.InfoWindow({
          content: `<strong>${zone.name}</strong><br>Type: ${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)}`
        });
        info.setPosition(e.latLng || (zone.type === 'circle' ? zone.center : zone.path[0]));
        info.open(this._geofenceMap);
      });
    });

    document.getElementById('geofence-select')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val || val === 'Select Geofence') return;
      const idx = geofences.findIndex(z => z.id === val);
      if (idx !== -1) {
        const zone = geofences[idx];
        if (zone.type === 'circle') {
          this._geofenceMap.setCenter(zone.center);
          this._geofenceMap.setZoom(16);
        } else if (zone.type === 'polygon') {
          this._geofenceMap.setCenter(zone.path[0]);
          this._geofenceMap.setZoom(16);
        }
      }
    });
  }

  /**
   * Initialize the AI route optimization map.
   */
  initAiRouteOptimizationMap() {
    const mapEl = document.getElementById('ai-route-optimization-map');
    if (!mapEl) {
      console.error('AI Route Optimization map element not found.');
      return;
    }
    if (this._aiRouteMap) return;

    // Center on Nairobi or your preferred default
    const center = { lat: -1.286389, lng: 36.817223 };
    this._aiRouteMap = new google.maps.Map(mapEl, {
      center,
      zoom: 13,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      zoomControl: true,
    });

    // Optionally: Add route drawing logic here
  }
}

// Add this utility function above or below the TrackProApp class
function toggleHeader(screenId) {
  const mainHeader = document.getElementById('header');
  const screenHeader = document.getElementById('screen-header');
  const navbar = document.getElementById('navbar');
  const screen = document.getElementById(screenId);

  if (!screen) return;

  // Always hide all .screen .header elements
  document.querySelectorAll('.screen .header').forEach(h => h.style.display = 'none');

  if (screenId === 'home') {
    if (mainHeader) mainHeader.style.display = '';
    if (navbar) navbar.style.display = '';
    if (screenHeader) {
      screenHeader.style.display = 'none';
      screenHeader.innerHTML = '';
      screenHeader.style.opacity = 0;
    }
  } else {
    if (mainHeader) mainHeader.style.display = 'none';
    if (navbar) navbar.style.display = 'none';

    if (screenHeader) {
      const screenHeaderDiv = screen.querySelector('.header');
      if (screenHeaderDiv) {
        screenHeader.innerHTML = screenHeaderDiv.innerHTML;
        screenHeader.style.display = '';
        screenHeader.style.opacity = 1;
        // No need to show the original header, it's already hidden above
      } else {
        screenHeader.style.display = 'none';
        screenHeader.innerHTML = '';
        screenHeader.style.opacity = 0;
      }
    }
  }

  // Ensure all back-to-home buttons are accessible and functional
  document.querySelectorAll('button.back-btn[data-btn="home"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.showScreen('home');
    });
    btn.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        window.showScreen('home');
      }
    });
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');
  });
}

// Initialize the app when the window loads
window.addEventListener('load', () => {
  const app = TrackProApp.getInstance();
  app.onDeviceReady();
});

window.showScreen = function(screenId) {
  TrackProApp.getInstance().showScreen(screenId);
};
window['ai-route-optimization'] = function() {
  window.showScreen('ai-route-optimization');
};
window['alerts'] = function() {
  window.showScreen('alerts');
};
window['support'] = function() {
  window.showScreen('support');
};

/**
 * Sets up click and keyboard accessibility for quick action cards.
 * Call this after DOM is ready or after adding new .action-card elements.
 */
function setupQuickActionCards() {
  function handleActionCard(e) {
    const screenId = this.getAttribute('data-screen');
    const action = this.getAttribute('data-action');
    if (screenId) {
      window.showScreen(screenId);
    } else if (action && typeof window[action] === 'function') {
      window[action]();
    }
  }

  document.querySelectorAll('.action-card').forEach(function (card) {
    card.addEventListener('click', handleActionCard);
    card.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        handleActionCard.call(this, e);
      }
    });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
  });

}

/**
 * Render 5 trip histories as polylines on the history-map.
 */
function renderTripHistoriesOnHistoryMap() {
    const mapEl = document.getElementById('history-map');
    if (!mapEl) return;

    // Only initialize once
    if (window._historyMap) return;

    // Example trip data (replace with real data as needed)
    const trips = [
        [
            { lat: -1.286389, lng: 36.817223 },
            { lat: -1.287, lng: 36.818 },
            { lat: -1.288, lng: 36.819 },
            { lat: -1.289, lng: 36.820 }
        ],
        [
            { lat: -1.286389, lng: 36.817223 },
            { lat: -1.285, lng: 36.816 },
            { lat: -1.284, lng: 36.815 },
            { lat: -1.283, lng: 36.814 }
        ],
        [
            { lat: -1.286389, lng: 36.817223 },
            { lat: -1.287, lng: 36.816 },
            { lat: -1.288, lng: 36.815 },
            { lat: -1.289, lng: 36.814 }
        ],
        [
            { lat: -1.286389, lng: 36.817223 },
            { lat: -1.286, lng: 36.818 },
            { lat: -1.285, lng: 36.819 },
            { lat: -1.284, lng: 36.820 }
        ],
        [
            { lat: -1.286389, lng: 36.817223 },
            { lat: -1.287, lng: 36.817 },
            { lat: -1.288, lng: 36.817 },
            { lat: -1.289, lng: 36.817 }
        ]
    ];

    const colors = ['#ff6b9d', '#ffd93d', '#28a745', '#4a0a3f', '#00bcd4'];

    // Center map on Nairobi
    window._historyMap = new google.maps.Map(mapEl, {
        center: { lat: -1.286389, lng: 36.817223 },
        zoom: 14,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
    });

    // Draw each trip as a polyline
    trips.forEach((trip, idx) => {
        new google.maps.Polyline({
            path: trip,
            geodesic: true,
            strokeColor: colors[idx % colors.length],
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map: window._historyMap
        });

        // Optionally, add a marker at the start and end
        new google.maps.Marker({
            position: trip[0],
            map: window._historyMap,
            label: `${idx + 1}`,
            title: `Trip ${idx + 1} Start`
        });
        new google.maps.Marker({
            position: trip[trip.length - 1],
            map: window._historyMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: colors[idx % colors.length],
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#fff'
            },
            title: `Trip ${idx + 1} End`
        });
    });
}

// Call this when the history screen is shown
function initHistoryMapIfNeeded() {
    if (document.getElementById('history-map') && typeof google !== 'undefined' && google.maps) {
        renderTripHistoriesOnHistoryMap();
    }
}

// Hook into your screen switching logic
const originalShowScreen = window.showScreen;
window.showScreen = function(screenId) {
    originalShowScreen(screenId);
    if (screenId === 'history') {
        setTimeout(initHistoryMapIfNeeded, 400); // Wait for screen animation
    }
};

/**
 * Configure alert settings based on user selection.
 */
function configureAlert() {
    const type = document.getElementById('alert-type').value;
    if (type === "geofence") {
        alert("Configure Geofence Entry/Exit alert.");
    } else if (type === "speed") {
        alert("Configure Speeding alert.");
    } else if (type === "maintenance") {
        alert("Configure Maintenance alert.");
    } else {
        alert("Please select an alert type.");
    }
}