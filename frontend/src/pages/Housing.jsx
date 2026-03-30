import { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Home, MapPin, DollarSign, Calendar, Search, ExternalLink, Phone, Bed, Bath, Maximize, Filter, AlertCircle, Activity, Users, Shield, Briefcase, GraduationCap } from 'lucide-react';
import L from 'leaflet';
import { getZillowListings, saveHousingContext } from '../services/routes';

const DEFAULT_LOCATION = {
  zipcode: '97123',
  county: 'Washington County',
  state: 'OR'
};

const FIRE_CENTER = { lat: 45.52, lng: -122.95 };
const JOB_CENTER = { lat: 45.518, lng: -122.98 };
const SCHOOL_CENTER = { lat: 45.523, lng: -122.92 };

const markerIconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
const markerIconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
const markerShadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();

const listingMarkerIcon = L.icon({
  iconRetinaUrl: markerIconRetinaUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -32],
  shadowSize: [41, 41]
});

const milesBetween = (a, b) => {
  if (!a || !b) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const r = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * r * Math.asin(Math.sqrt(h));
};

export default function Housing({ userProfile }) {
  const [searchZip, setSearchZip] = useState(DEFAULT_LOCATION.zipcode);
  const [housingType, setHousingType] = useState('all');
  const [showMap, setShowMap] = useState(true);
  const [houses, setHouses] = useState([]);
  const [zillowListings, setZillowListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const [filters, setFilters] = useState({
    accessibility: false,
    petFriendly: false,
    nearHealth: false
  });

  // Determine user's housing situation from profile data
  const needsRelocation = !!userProfile?.needsHousing;
  const hasHealthConcerns = false; // Could be derived from additional intake questions
  const needsAccessibility = (userProfile?.caregivingNeeds || []).length > 0 || userProfile?.hasDisabilities;
  const hasInsurance = userProfile?.hasInsurance;
  const homeBurned = needsRelocation; // Simplified - could be more specific

  useEffect(() => {
    const loadListings = async () => {
      if (!userProfile?.uid) return;
      setListingsLoading(true);
      setListingsError('');
      try {
        const data = await getZillowListings({
          userId: userProfile.uid,
          zipcode: DEFAULT_LOCATION.zipcode,
          state: DEFAULT_LOCATION.state
        });
        setZillowListings(data?.listings || []);
      } catch (err) {
        console.error('Error loading Zillow listings:', err);
        setListingsError('Unable to load Zillow listings. Please try again.');
      } finally {
        setListingsLoading(false);
      }
    };

    loadListings();
  }, [userProfile?.uid]);

  const mapListing = (listing) => {
    const lat = listing.location?.latitude;
    const lng = listing.location?.longitude;
    const fireDistance = milesBetween({ lat, lng }, FIRE_CENTER);
    const jobDistance = milesBetween({ lat, lng }, JOB_CENTER);
    const schoolDistance = milesBetween({ lat, lng }, SCHOOL_CENTER);
    const riskLevel = fireDistance == null
      ? 'Unknown'
      : fireDistance < 2
      ? 'High'
      : fireDistance < 5
      ? 'Moderate'
      : 'Low';
    const riskClass = riskLevel === 'High'
      ? 'bg-red-100 text-red-700'
      : riskLevel === 'Moderate'
      ? 'bg-yellow-100 text-yellow-700'
      : riskLevel === 'Low'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
    const commuteFactor = (jobDistance || 0) + (schoolDistance || 0);
    const tradeoff = riskLevel === 'High' && commuteFactor < 20
      ? 'Closer to job/school, higher exposure'
      : riskLevel === 'Low' && commuteFactor > 24
      ? 'Safer, longer commute'
      : 'Balanced access vs safety';

    return {
      id: listing.id,
      name: listing.title,
      lat,
      lng,
      address: `${listing.address?.street || ''}, ${listing.address?.city || ''}, ${listing.address?.state || ''} ${listing.address?.zipcode || ''}`.trim(),
      rent: listing.price || listing.minPrice,
      rentRange: listing.minPrice && listing.maxPrice ? `${listing.minPrice}-${listing.maxPrice}` : null,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      sqft: listing.sqft,
      image: listing.photo,
      available: listing.listingStatus === 'forRent' ? 'Available' : listing.listingStatus || 'Status pending',
      propertyType: listing.propertyType,
      fireDistance,
      jobDistance,
      schoolDistance,
      riskLevel,
      riskClass,
      tradeoff,
      url: listing.detailsUrl
        ? listing.detailsUrl.startsWith('http')
          ? listing.detailsUrl
          : `https://www.zillow.com${listing.detailsUrl}`
        : null
    };
  };

  // Mock backend call to fetch housing based on user's situation
  useEffect(() => {
    fetchHousingOptions();
  }, [filters, needsRelocation, searchZip, housingType, zillowListings]);

  const fetchHousingOptions = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredHouses = zillowListings
      .filter((listing) => {
        if (searchZip && listing.address?.zipcode && listing.address.zipcode !== searchZip) {
          return false;
        }
        return true;
      })
      .map(mapListing);

    if (housingType !== 'all') {
      filteredHouses = filteredHouses.filter((house) => (house.propertyType || '').toLowerCase().includes(housingType));
    }

    // Apply health radius logic
    if (filters.nearHealth || hasHealthConcerns) {
      filteredHouses = filteredHouses.filter(house => house.fireDistance != null && house.fireDistance >= 6);
    }
    
    // Apply accessibility filters (placeholder until data available)
    if (filters.accessibility || needsAccessibility) {
      filteredHouses = filteredHouses.filter(house => house.propertyType !== 'apartment');
    }
    
    // Apply pet-friendly filter (placeholder until data available)
    if (filters.petFriendly) {
      filteredHouses = filteredHouses;
    }
    
    setHouses(filteredHouses);

    if (userProfile?.uid) {
      const contextListings = filteredHouses.slice(0, 15).map((house) => ({
        id: house.id,
        name: house.name,
        address: house.address,
        rent: house.rent,
        bedrooms: house.bedrooms,
        bathrooms: house.bathrooms,
        riskLevel: house.riskLevel,
        fireDistance: house.fireDistance,
        jobDistance: house.jobDistance,
        schoolDistance: house.schoolDistance,
        tradeoff: house.tradeoff,
        url: house.url,
      }));

      try {
        await saveHousingContext({
          userId: userProfile.uid,
          searchZip,
          housingType,
          filters,
          listings: contextListings,
        });
      } catch (err) {
        console.error('Error saving housing context:', err);
      }
    }

    setLoading(false);
  };

  // Determine personalized guidance message
  const getGuidanceMessage = () => {
    if (!userProfile) {
      return {
        title: 'Income Assessment Needed',
        message: 'We recommend completing your financial assessment first to better understand your housing budget.',
        type: 'warning',
        icon: AlertCircle
      };
    }
    
    if (needsRelocation && homeBurned && hasInsurance) {
      return {
        title: 'Home Reconstruction & Temporary Housing',
        message: 'Your insurance may cover temporary housing while your home is being rebuilt. Check your ALE (Additional Living Expenses) coverage.',
        type: 'success',
        icon: Home
      };
    }
    
    if (needsRelocation && !hasInsurance) {
      return {
        title: 'Permanent Relocation Assistance',
        message: 'We\'ll help you find affordable long-term housing and connect you with financial assistance programs.',
        type: 'info',
        icon: MapPin
      };
    }
    
    if (hasHealthConcerns || filters.nearHealth) {
      return {
        title: 'Health-Focused Housing Search',
        message: 'Showing housing options near healthcare facilities and outside health risk zones.',
        type: 'info',
        icon: Activity
      };
    }
    
    if (needsAccessibility) {
      return {
        title: 'Accessible Housing Options',
        message: 'Filtering for wheelchair-accessible and caregiver-friendly housing.',
        type: 'info',
        icon: Users
      };
    }
    
    return {
      title: 'Personalized Housing Search',
      message: 'We\'ve customized your search based on your needs and situation.',
      type: 'info',
      icon: Home
    };
  };

  const guidance = getGuidanceMessage();
  const GuidanceIcon = guidance.icon;
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkersRef = useRef(null);
  const mapZonesRef = useRef(null);

  const mapPoints = useMemo(() => (
    houses.filter((house) => Number.isFinite(house.lat) && Number.isFinite(house.lng))
  ), [houses]);

  const mapBounds = useMemo(() => {
    if (!mapPoints.length) return null;
    const lats = mapPoints.map((point) => point.lat);
    const lngs = mapPoints.map((point) => point.lng);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
  }, [mapPoints]);

  const mapCenter = useMemo(() => {
    if (!mapPoints.length) return [FIRE_CENTER.lat, FIRE_CENTER.lng];
    const latSum = mapPoints.reduce((sum, point) => sum + point.lat, 0);
    const lngSum = mapPoints.reduce((sum, point) => sum + point.lng, 0);
    return [latSum / mapPoints.length, lngSum / mapPoints.length];
  }, [mapPoints]);

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: mapPoints.length ? 12 : 10,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    if (mapMarkersRef.current) {
      mapMarkersRef.current.clearLayers();
    } else {
      mapMarkersRef.current = L.layerGroup().addTo(map);
    }

    if (mapZonesRef.current) {
      mapZonesRef.current.clearLayers();
    } else {
      mapZonesRef.current = L.layerGroup().addTo(map);
    }

    const metersPerMile = 1609.34;
    const zoneDefinitions = [
      { radiusMiles: 2, color: '#dc2626', label: 'High exposure zone' },
      { radiusMiles: 5, color: '#f59e0b', label: 'Moderate exposure zone' }
    ];

    zoneDefinitions.forEach((zone) => {
      const circle = L.circle([FIRE_CENTER.lat, FIRE_CENTER.lng], {
        radius: zone.radiusMiles * metersPerMile,
        color: zone.color,
        weight: 2,
        fillColor: zone.color,
        fillOpacity: 0.12
      });
      circle.bindPopup(zone.label);
      circle.addTo(mapZonesRef.current);
    });

    mapPoints.forEach((house) => {
      const marker = L.marker([house.lat, house.lng], { icon: listingMarkerIcon });
      const popupHtml = `
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${house.name || 'Listing'}</div>
          <div style="font-size: 12px; color: #4b5563;">${house.address || ''}</div>
          <div style="font-size: 12px; margin-top: 4px;">Exposure: ${house.riskLevel || 'Unknown'}</div>
          ${house.rent ? `<div style=\"font-size: 12px;\">$${house.rent.toLocaleString()}/mo</div>` : ''}
          ${house.url ? `<a style=\"font-size: 12px; color: #16a34a;\" href=\"${house.url}\" target=\"_blank\" rel=\"noreferrer\">View listing</a>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.addTo(mapMarkersRef.current);
    });

    if (mapBounds) {
      map.fitBounds(mapBounds, { padding: [24, 24] });
    } else {
      map.setView(mapCenter, mapPoints.length ? 12 : 10);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [showMap, mapPoints, mapBounds, mapCenter]);

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-linear-to-r from-green-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <Home className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Housing Assistance</h1>
          </div>
          <p className="text-green-50 text-lg">
            {needsRelocation && hasInsurance
              ? 'Temporary housing while your home is being rebuilt'
              : 'Find housing options tailored to your situation'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1 bg-white/20 rounded-full">{DEFAULT_LOCATION.county}, {DEFAULT_LOCATION.state} {DEFAULT_LOCATION.zipcode}</span>
            <span className="px-3 py-1 bg-white/20 rounded-full">Safe vs risky zones included</span>
            <span className="px-3 py-1 bg-white/20 rounded-full">Distance tradeoffs shown</span>
          </div>
        </div>

        {/* Personalized Guidance Alert */}
        <div className={`rounded-xl shadow-sm p-6 border-2 ${
          guidance.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
          guidance.type === 'success' ? 'bg-green-50 border-green-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start space-x-4">
            <GuidanceIcon className={`w-6 h-6 shrink-0 mt-1 ${
              guidance.type === 'warning' ? 'text-yellow-600' :
              guidance.type === 'success' ? 'text-green-600' :
              'text-blue-600'
            }`} />
            <div>
              <h3 className={`text-lg font-semibold mb-2 ${
                guidance.type === 'warning' ? 'text-yellow-900' :
                guidance.type === 'success' ? 'text-green-900' :
                'text-blue-900'
              }`}>{guidance.title}</h3>
              <p className={`${
                guidance.type === 'warning' ? 'text-yellow-800' :
                guidance.type === 'success' ? 'text-green-800' :
                'text-blue-800'
              }`}>{guidance.message}</p>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Your Search</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filters.accessibility}
                  onChange={(e) => setFilters({...filters, accessibility: e.target.checked})}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-sm font-medium text-gray-700">Wheelchair Accessible</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filters.petFriendly}
                  onChange={(e) => setFilters({...filters, petFriendly: e.target.checked})}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-sm font-medium text-gray-700">Pet-Friendly</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filters.nearHealth}
                  onChange={(e) => setFilters({...filters, nearHealth: e.target.checked})}
                  className="w-5 h-5 text-green-600"
                />
                <span className="text-sm font-medium text-gray-700">Near Healthcare</span>
              </label>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                placeholder="Enter ZIP code"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={housingType}
              onChange={(e) => setHousingType(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Rentals</option>
              <option value="apartment">Apartments</option>
              <option value="singlefamily">Single Family</option>
              <option value="townhome">Townhomes</option>
            </select>
            <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Search</span>
            </button>
            <button 
              onClick={() => setShowMap(!showMap)}
              className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-xl hover:bg-green-50 transition-colors flex items-center space-x-2"
            >
              <MapPin className="w-5 h-5" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Safety legend:</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">Low exposure</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Moderate exposure</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">High exposure</span>
            <span className="text-gray-500">Tradeoff highlights job/school distance vs safety.</span>
          </div>
        </div>

        {listingsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">{listingsError}</p>
          </div>
        )}

        {/* Map Section */}
        {showMap && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-96" ref={mapContainerRef} />
            <div className="px-4 py-3 bg-gray-50 text-xs text-gray-600 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span>
                {mapPoints.length
                  ? `Showing ${mapPoints.length} listing locations near ${searchZip || DEFAULT_LOCATION.zipcode}.`
                  : 'No listing coordinates available yet.'}
              </span>
            </div>
          </div>
        )}

        {/* Housing Listings - Dynamic based on filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {needsRelocation ? 'Housing Options for Your Situation' : 'Available Housing'}
              </h2>
              <p className="text-gray-600 mt-1">
                {loading || listingsLoading ? 'Loading personalized options...' : 
                 `${houses.length} options matching your criteria`}
              </p>
            </div>
          </div>
          
          {loading || listingsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Finding the best options for you...</p>
            </div>
          ) : houses.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No housing found matching your criteria</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {houses.map((housing) => (
                <div key={housing.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-green-500 hover:shadow-lg transition-all duration-200">
                  <div className="h-48 bg-gray-200 relative overflow-hidden">
                    <img 
                      src={housing.image} 
                      alt={housing.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                      {housing.type && (
                        <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                          {housing.type}
                        </span>
                      )}
                      {housing.rent && (
                        <span className="px-3 py-2 bg-white text-gray-800 text-lg font-bold rounded-lg shadow-lg">
                          ${housing.rent.toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{housing.name}</h3>
                    <p className="text-gray-600 flex items-center space-x-2 mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{housing.address}</span>
                    </p>

                    {/* Accessibility & Health Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${housing.riskClass}`}>
                        <Shield className="w-3 h-3 inline mr-1" />
                        {housing.riskLevel} exposure
                      </span>
                      {housing.jobDistance != null && (
                        <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded-full">
                          <Briefcase className="w-3 h-3 inline mr-1" />
                          {housing.jobDistance.toFixed(1)} mi to job
                        </span>
                      )}
                      {housing.schoolDistance != null && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                          <GraduationCap className="w-3 h-3 inline mr-1" />
                          {housing.schoolDistance.toFixed(1)} mi to school
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Tradeoff: {housing.tradeoff}
                    </div>
                    
                    {housing.bedrooms && (
                      <div className="flex items-center space-x-4 mb-4 text-gray-700">
                        <span className="flex items-center space-x-1">
                          <Bed className="w-4 h-4" />
                          <span className="text-sm font-medium">{housing.bedrooms} Bed</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Bath className="w-4 h-4" />
                          <span className="text-sm font-medium">{housing.bathrooms} Bath</span>
                        </span>
                        {housing.sqft && (
                          <span className="flex items-center space-x-1">
                            <Maximize className="w-4 h-4" />
                            <span className="text-sm font-medium">{housing.sqft} sqft</span>
                          </span>
                        )}
                      </div>
                    )}

                    {(housing.amenities || housing.features) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(housing.amenities || housing.features)?.slice(0, 3).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {item}
                          </span>
                        ))}
                        {(housing.amenities || housing.features)?.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            +{(housing.amenities || housing.features).length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{housing.available || housing.availability}</span>
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {housing.url && (
                          <a
                            href={housing.url}
                            className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center space-x-1"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View</span>
                          </a>
                        )}
                        {housing.url ? (
                          <a
                            href={housing.url}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View listing
                          </a>
                        ) : (
                          <button
                            className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                            disabled
                          >
                            Link unavailable
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="bg-linear-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Housing Assistance Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <DollarSign className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">FEMA Housing Assistance</h3>
              <p className="text-sm text-gray-600 mb-3">Direct financial assistance for temporary housing expenses</p>
              <a href="#" className="text-green-600 text-sm font-medium flex items-center space-x-1 hover:text-green-700">
                <span>Learn More</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <Home className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">Section 8 Emergency Vouchers</h3>
              <p className="text-sm text-gray-600 mb-3">Expedited housing vouchers for disaster victims</p>
              <a href="#" className="text-green-600 text-sm font-medium flex items-center space-x-1 hover:text-green-700">
                <span>Apply Now</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <Phone className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-800 mb-2">211 Housing Hotline</h3>
              <p className="text-sm text-gray-600 mb-3">24/7 support for housing resources and assistance</p>
              <a href="tel:211" className="text-green-600 text-sm font-medium flex items-center space-x-1 hover:text-green-700">
                <span>Call 2-1-1</span>
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}