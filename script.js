// Alternative implementation using OpenStreetMap (completely free)
// This uses Leaflet.js (free and open-source) with OpenStreetMap

// Global variables
let map;
let userLocation;
let markers = [];

function findNearbyServices() {
    const locationStatus = document.getElementById('location-status');
    locationStatus.innerText = "🔍 Finding your location...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                locationStatus.innerText = "✅ Location found!";
                
                // Initialize map
                initMap();
                
                // Search for nearby medical services
                searchNearbyServices();
            },
            (error) => {
                locationStatus.innerText = `❌ Error getting location: ${error.message}`;
            }
        );
    } else {
        locationStatus.innerText = "❌ Geolocation is not supported by your browser.";
    }
}

function initMap() {
    // Create map element if it doesn't exist
    if (!document.getElementById('map').style.height) {
        document.getElementById('map').style.height = '400px';
        document.getElementById('map').style.marginTop = '20px';
        document.getElementById('map').style.borderRadius = '8px';
    }
    
    // Initialize Leaflet map centered at user location
    if (map) {
        map.remove(); // Remove existing map if any
    }
    
    map = L.map('map').setView([userLocation.lat, userLocation.lng], 14);
    
    // Add OpenStreetMap tile layer (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add marker for user location
    L.marker([userLocation.lat, userLocation.lng], {
        title: 'Your Location',
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map)
    .bindPopup('Your Location')
    .openPopup();
    
    // Search for nearby services using Overpass API (free)
    searchNearbyServices();
}

function searchNearbyServices() {
    const nearbyServices = document.getElementById('nearby-services');
    nearbyServices.innerHTML = "<p>🔍 Searching for nearby medical services...</p>";
    
    // Clear previous markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Use Overpass API to find pharmacies within 5km
    // Overpass API is free and works with OpenStreetMap data
    const radius = 5000; // 5km in meters
    
    // Find pharmacies
    fetchNearbyPlaces('pharmacy', radius, (pharmacies) => {
        // Find doctors/hospitals
        fetchNearbyPlaces('doctors', radius, (doctors) => {
            // Find hospitals
            fetchNearbyPlaces('hospital', radius, (hospitals) => {
                // Combine doctors and hospitals
                const medicalFacilities = [...doctors, ...hospitals];
                // Display results
                displayResults(pharmacies, medicalFacilities);
            });
        });
    });
}

function fetchNearbyPlaces(amenityType, radius, callback) {
    // Build Overpass API query
    const overpassAPI = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json];
        (
          node["amenity"="${amenityType}"](around:${radius},${userLocation.lat},${userLocation.lng});
          way["amenity"="${amenityType}"](around:${radius},${userLocation.lat},${userLocation.lng});
          relation["amenity"="${amenityType}"](around:${radius},${userLocation.lat},${userLocation.lng});
        );
        out center;
    `;
    
    // Fetch data using Overpass API
    fetch(overpassAPI, {
        method: 'POST',
        body: query,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => response.json())
    .then(data => {
        const places = [];
        
        // Process results
        data.elements.forEach(element => {
            // Extract location and details
            const place = {
                name: element.tags.name || `${amenityType.charAt(0).toUpperCase() + amenityType.slice(1)}`,
                lat: element.lat || element.center.lat,
                lng: element.lon || element.center.lon,
                address: element.tags.address || element.tags["addr:street"] || '',
                amenity: amenityType
            };
            
            places.push(place);
            
            // Add marker to map
            const markerIcon = amenityType === 'pharmacy' ? 
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png' : 
                'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
            
            const marker = L.marker([place.lat, place.lng], {
                title: place.name,
                icon: L.icon({
                    iconUrl: markerIcon,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            // Add popup with info
            marker.bindPopup(`<strong>${place.name}</strong><br>${place.address}`);
            
            // Store marker for later removal
            markers.push(marker);
        });
        
        // Return places via callback
        callback(places);
    })
    .catch(error => {
        console.error('Error fetching places:', error);
        document.getElementById('nearby-services').innerHTML = 
            "<p>❌ Error finding nearby services. Please try again later.</p>";
        callback([]);
    });
}

function displayResults(pharmacies, medicalFacilities) {
    const nearbyServices = document.getElementById('nearby-services');
    let resultsHTML = '';
    
    if (pharmacies.length > 0 || medicalFacilities.length > 0) {
        resultsHTML += '<h4>Medical Services Within 5km:</h4>';
        
        if (pharmacies.length > 0) {
            resultsHTML += '<div class="service-section"><h5>🏥 Pharmacies:</h5><ul>';
            pharmacies.slice(0, 5).forEach(pharmacy => {
                resultsHTML += `<li>${pharmacy.name} ${pharmacy.address ? '- ' + pharmacy.address : ''}</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        if (medicalFacilities.length > 0) {
            resultsHTML += '<div class="service-section"><h5>👨‍⚕️ Doctors/Hospitals:</h5><ul>';
            medicalFacilities.slice(0, 5).forEach(facility => {
                resultsHTML += `<li>${facility.name} ${facility.address ? '- ' + facility.address : ''}</li>`;
            });
            resultsHTML += '</ul></div>';
        }
        
        // Add disclaimer
        resultsHTML += '<p class="disclaimer">Data provided by OpenStreetMap contributors.</p>';
    } else {
        resultsHTML = '<p>No medical services found within 5km of your location.</p>';
    }
    
    nearbyServices.innerHTML = resultsHTML;
}
// Add this to your script.js file

function checkHealth() {
    // Get all selected symptoms
    const selectedSymptoms = [];
    const checkboxes = document.querySelectorAll('input[name="symptom"]:checked');
    checkboxes.forEach(checkbox => {
      selectedSymptoms.push(checkbox.value);
    });
    
    // Get selected values from dropdowns
    const feverCondition = document.getElementById('FC').value;
    const coughType = document.getElementById('CT').value;
    const headacheSeverity = document.getElementById('HS').value;
    const symptomDuration = document.getElementById('duration').value;
    
    // Check if user selected any symptoms
    if (selectedSymptoms.length === 0) {
      document.getElementById('result').innerHTML = "Please select at least one symptom.";
      document.getElementById('suggestions').innerHTML = "";
      return;
    }
    
    // Initialize variables for results
    let resultMessage = "";
    let suggestions = "";
    let severityLevel = "low";
    
    // Analyze symptoms
    if (selectedSymptoms.includes("fever")) {
      if (feverCondition === "high") {
        severityLevel = "high";
      } else if (feverCondition === "moderate") {
        severityLevel = "medium";
      }
    }
    
    // Check for combinations that suggest higher severity
    if ((selectedSymptoms.includes("fever") && selectedSymptoms.includes("cough")) || 
        (selectedSymptoms.includes("Breathing Difficulty")) || 
        (selectedSymptoms.includes("Chest Pain"))) {
      severityLevel = "high";
    }
    
    // Duration affects severity
    if (symptomDuration === "twoWeeks") {
      if (severityLevel === "low") severityLevel = "medium";
      if (severityLevel === "medium") severityLevel = "high";
    }
    
    // Generate result and suggestions based on severity
    if (severityLevel === "high") {
      resultMessage = "⚠️ Your symptoms may require immediate medical attention!";
      suggestions = "• Consider consulting a healthcare professional immediately\n";
      suggestions += "• Keep yourself hydrated and rested\n";
      
      if (selectedSymptoms.includes("fever")) {
        suggestions += "• Monitor your temperature regularly\n";
      }
      
      if (selectedSymptoms.includes("Breathing Difficulty") || selectedSymptoms.includes("Chest Pain")) {
        suggestions += "• If you're experiencing severe chest pain or difficulty breathing, call emergency services\n";
      }
    } else if (severityLevel === "medium") {
      resultMessage = "⚠️ Your symptoms suggest you should monitor your condition carefully.";
      suggestions = "• Consider scheduling an appointment with your doctor\n";
      suggestions += "• Rest and avoid strenuous activities\n";
      suggestions += "• Stay hydrated and monitor your symptoms\n";
      
      if (selectedSymptoms.includes("fever")) {
        suggestions += "• Take over-the-counter fever reducers as directed\n";
      }
      
      if (selectedSymptoms.includes("cough")) {
        suggestions += "• Consider using cough medicine appropriate for your cough type\n";
      }
    } else {
      resultMessage = "✅ Your symptoms appear to be mild.";
      suggestions = "• Rest and monitor your symptoms\n";
      suggestions += "• Stay hydrated\n";
      
      if (selectedSymptoms.includes("headache")) {
        suggestions += "• Consider taking appropriate pain relievers if needed\n";
      }
      
      if (selectedSymptoms.includes("Sore Throat")) {
        suggestions += "• Warm salt water gargles might provide relief\n";
      }
    }
    
    // Add disclaimer
    suggestions += "\n⚠️ IMPORTANT: This app provides general guidance only and is not a substitute for professional medical advice, diagnosis, or treatment.";
    
    // Display results
    document.getElementById('result').innerHTML = resultMessage;
    document.getElementById('suggestions').innerHTML = suggestions;
    
    // Scroll to results
    document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
  }