document.addEventListener("DOMContentLoaded", function () {
    const socket = io();
    console.log("hey there!");

    let userCount = 0;
    const userNames = {};
    let initialFocusDone = false; // Flag to check if the map has been centered initially
    let userLocation = { latitude: 0, longitude: 0 }; // Store the user's current location

    function createCustomIcon(color) {
        return L.divIcon({
            className: 'custom-icon',
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${color}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    const colors = ['red', 'blue', 'green', 'orange', 'purple'];
    const getUserColor = (id) => colors[userNames[id] % colors.length] || 'gray';

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                userLocation = { latitude, longitude }; // Update the user's current location
                socket.emit('send-location', { latitude, longitude });
            },
            (error) => {
                console.error(error);
                if (error.code === error.TIMEOUT) {
                    console.error("Geolocation timed out.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    const map = L.map('map').setView([26.2124, 78.1772], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add a custom control button for focusing on the user's location
    L.Control.FocusButton = L.Control.extend({
        onAdd: function (map) {
            const btn = L.DomUtil.create('button', 'focus-button');
            btn.innerHTML = 'Focus on Me';
            btn.style.backgroundColor = 'white';
            btn.style.border = 'none';
            btn.style.padding = '10px';
            btn.style.cursor = 'pointer';

            L.DomEvent.on(btn, 'click', () => {
                // Ensure the user's marker exists and then open its popup
                const socketId = this.options.socket.id;
                if (markers[socketId]) {
                    const marker = markers[socketId];
                    map.setView(marker.getLatLng(), 16); // Center map on the marker
                    marker.openPopup(); // Open popup for the current user
                }
            });

            return btn;
        },
        onRemove: function (map) {
            // Nothing to do here
        }
    });

    L.control.focusButton = function (opts) {
        return new L.Control.FocusButton(opts);
    }

    L.control.focusButton({ position: 'topleft', socket: socket }).addTo(map);

    const markers = {};
    const markerOffsets = {}; // Store the offsets for each marker

    function getMarkerOffset(id) {
        if (!markerOffsets[id]) {
            // Generate a small random offset for the marker
            const offsetLat = (Math.random() - 0.5) * 0.0002;
            const offsetLng = (Math.random() - 0.5) * 0.0002;
            markerOffsets[id] = [offsetLat, offsetLng];
        }
        return markerOffsets[id];
    }

    socket.on('receive-location', (data) => {
        const { id, latitude, longitude } = data;
        if (!userNames[id]) {
            userCount++;
            userNames[id] = userCount;
        }
        const userName = (id === socket.id) ? 'Me' : `User ${userNames[id]}`;
        const userColor = getUserColor(id);
        const [offsetLat, offsetLng] = getMarkerOffset(id);

        if (!markers[id]) {
            markers[id] = L.marker([latitude + offsetLat, longitude + offsetLng], { icon: createCustomIcon(userColor) })
                .addTo(map);
        } else {
            markers[id].setLatLng([latitude + offsetLat, longitude + offsetLng]);
        }

        // Update popup content if the marker represents the current user
        if (id === socket.id) {
            markers[id].bindPopup('Me'); // Set or update popup content
            if (!initialFocusDone) {
                map.setView([latitude, longitude], 16);
                markers[id].openPopup(); // Open popup for the current user
                initialFocusDone = true;
            }
        } else {
            markers[id].bindPopup(userName); // Set popup content for other users
        }
    });

    socket.on('user-disconnected', (id) => {
        console.log('User disconnected:', id);
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
            delete userNames[id];
            delete markerOffsets[id];
        }
    });
});
