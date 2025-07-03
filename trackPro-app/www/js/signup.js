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

class TrackProSignUp {
    constructor() {
        this.apiUrl = 'https://trackpro.arybit.co.ke/api/register'; // Replace with actual API endpoint
        this.timeUpdateInterval = null;
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        if (typeof cordova === 'undefined') {
            setTimeout(() => this.onDeviceReady(), 1000);
        }
        const form = document.getElementById('signup-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }

    onDeviceReady() {
        this.hideLoading();
        this.updateTime();
        this.timeUpdateInterval = setInterval(() => this.updateTime(), 1000);
        this.updateConnectionStatus();
        window.addEventListener('online', this.updateConnectionStatus.bind(this));
        window.addEventListener('offline', this.updateConnectionStatus.bind(this));
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
            setTimeout(() => loadingEl.remove(), 500);
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Nairobi' // EAT timezone
        });
        const timeEl = document.getElementById('time-display');
        if (timeEl) {
            timeEl.textContent = timeString;
            timeEl.setAttribute('aria-label', `Current time: ${timeString}`);
        }
    }

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        const statusText = isOnline ? '<i class="fas fa-circle text-success"></i> Online' : '<i class="fas fa-circle text-danger"></i> Offline';
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerHTML = statusText;
            statusEl.setAttribute('aria-label', `Connection status: ${isOnline ? 'Online' : 'Offline'}`);
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const formData = new FormData(form);
        const data = {
            full_name: formData.get('full-name'),
            email: formData.get('email'),
            password: formData.get('password'),
            company_name: formData.get('company-name') || null
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed.');
            }

            const result = await response.json();
            this.showSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.htm';
            }, 2000);
        } catch (error) {
            console.error('Sign-up error:', error);
            this.showError(error.message || 'Failed to register. Please try again.');
        }
    }

    showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.querySelector('.sign-up-section').prepend(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.querySelector('.sign-up-section').prepend(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Initialize the sign-up page
document.addEventListener('DOMContentLoaded', () => new TrackProSignUp());