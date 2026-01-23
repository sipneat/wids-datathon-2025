import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Home, MapPin, DollarSign, Calendar, Search, ExternalLink, Phone, Heart, Bed, Bath, Maximize, Filter, AlertCircle, Briefcase, Activity, Users } from 'lucide-react';

export default function Housing({ userProfile }) {
  const [searchZip, setSearchZip] = useState('');
  const [housingType, setHousingType] = useState('all');
  const [showMap, setShowMap] = useState(true);
  const [savedHomes, setSavedHomes] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    maxCommute: 30, // minutes
    accessibility: false,
    petFriendly: false,
    nearHealth: false
  });

  // Determine user's housing situation from intake responses
  const intakeResponses = JSON.parse(localStorage.getItem('intakeResponses') || '{}');
  const hasJob = !intakeResponses.income_change || intakeResponses.income_change === 'No change';
  const needsRelocation = intakeResponses.displacement_status === 'Displaced' || intakeResponses.displacement_status === 'Temporary housing';
  const hasHealthConcerns = false; // Could be derived from additional intake questions
  const needsAccessibility = intakeResponses.caregiving_needs === 'Yes' || userProfile?.hasDisabilities;
  const hasInsurance = userProfile?.hasInsurance;
  const homeBurned = needsRelocation; // Simplified - could be more specific

  // Mock backend call to fetch housing based on user's situation
  useEffect(() => {
    fetchHousingOptions();
  }, [filters, hasJob, needsRelocation]);

  const fetchHousingOptions = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filteredHouses = [...temporaryHousing, ...permanentHousing];
    
    // Apply commute-based filtering if user has job
    if (hasJob && filters.maxCommute) {
      filteredHouses = filteredHouses.filter(house => 
        house.commuteTime ? house.commuteTime <= filters.maxCommute : true
      );
    }
    
    // Apply health radius logic
    if (filters.nearHealth || hasHealthConcerns) {
      filteredHouses = filteredHouses.filter(house => house.nearHealthcare);
    }
    
    // Apply accessibility filters
    if (filters.accessibility || needsAccessibility) {
      filteredHouses = filteredHouses.filter(house => house.accessible);
    }
    
    // Apply pet-friendly filter
    if (filters.petFriendly) {
      filteredHouses = filteredHouses.filter(house => 
        house.amenities?.includes('Pet-friendly') || house.features?.includes('Pet-friendly')
      );
    }
    
    setHouses(filteredHouses);
    setLoading(false);
  };

  const temporaryHousing = [
    {
      id: 1,
      name: 'Red Cross Emergency Shelter',
      address: '123 Main Street, Los Angeles, CA 90012',
      distance: '2.3 miles',
      type: 'Emergency Shelter',
      availability: 'Open Now',
      phone: '(555) 123-4567',
      amenities: ['Meals provided', 'Medical support', 'Pet-friendly'],
      lat: 34.0522,
      lng: -118.2437,
      image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400',
      commuteTime: 15,
      nearHealthcare: true,
      accessible: true
    },
    {
      id: 2,
      name: 'FEMA Temporary Housing',
      address: '456 Temporary Dr, Los Angeles, CA 90015',
      distance: '3.1 miles',
      type: 'Temporary Apartment',
      availability: 'Application Required',
      phone: '1-800-621-3362',
      amenities: ['Furnished', 'Utilities included', '3-18 month terms'],
      lat: 34.0407,
      lng: -118.2468,
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      commuteTime: 20,
      nearHealthcare: false,
      accessible: true
    }
  ];

  const permanentHousing = [
    {
      id: 3,
      name: 'Sunset Apartments',
      address: '789 Sunset Blvd, Los Angeles, CA 90028',
      rent: 2400,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1100,
      available: 'Feb 1, 2026',
      features: ['Pet-friendly', 'Near schools', 'Parking included', 'Laundry in unit'],
      lat: 34.0983,
      lng: -118.3267,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
      petDeposit: 500,
      securityDeposit: 2400,
      commuteTime: 25,
      nearHealthcare: true,
      accessible: false
    },
    {
      id: 4,
      name: 'Harbor View Complex',
      address: '321 Harbor Dr, Manhattan Beach, CA 90266',
      rent: 2800,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1350,
      available: 'Available Now',
      features: ['Family-friendly', 'Pool', 'Close to transit', 'Gym'],
      lat: 33.8847,
      lng: -118.4109,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
      petDeposit: 500,
      securityDeposit: 2800,
      commuteTime: 45,
      nearHealthcare: false,
      accessible: true
    },
    {
      id: 5,
      name: 'Oak Tree Residences',
      address: '555 Oak Street, Pasadena, CA 91101',
      rent: 2200,
      bedrooms: 2,
      bathrooms: 1.5,
      sqft: 950,
      available: 'Feb 15, 2026',
      features: ['Updated kitchen', 'Hardwood floors', 'Near parks', 'Bike storage'],
      lat: 34.1478,
      lng: -118.1445,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
      petDeposit: 300,
      securityDeposit: 2200,
      commuteTime: 30,
      nearHealthcare: true,
      accessible: false
    },
    {
      id: 6,
      name: 'Riverside Gardens',
      address: '888 River Rd, Glendale, CA 91204',
      rent: 2600,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1450,
      available: 'Available Now',
      features: ['Balcony', 'Central AC', 'Dishwasher', 'Walking distance to schools'],
      lat: 34.1425,
      lng: -118.2551,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
      petDeposit: 400,
      securityDeposit: 2600,
      commuteTime: 18,
      nearHealthcare: true,
      accessible: true
    }
  ];

  const toggleSave = (id) => {
    setSavedHomes(prev => 
      prev.includes(id) ? prev.filter(homeId => homeId !== id) : [...prev, id]
    );
  };

  // Determine personalized guidance message
  const getGuidanceMessage = () => {
    if (!hasJob && !intakeResponses.income_change) {
      return {
        title: 'Income Assessment Needed',
        message: 'We recommend completing your financial assessment first to better understand your housing budget.',
        type: 'warning',
        icon: AlertCircle
      };
    }
    
    if (hasJob && !needsRelocation) {
      return {
        title: 'Temporary Housing Near Your Job',
        message: 'Finding housing close to your current workplace will help you maintain employment continuity.',
        type: 'info',
        icon: Briefcase
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

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <Home className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Housing Assistance</h1>
          </div>
          <p className="text-green-50 text-lg">
            {hasJob && !needsRelocation 
              ? 'Find temporary housing close to your workplace'
              : needsRelocation && hasInsurance
              ? 'Temporary housing while your home is being rebuilt'
              : 'Find housing options tailored to your situation'}
          </p>
        </div>

        {/* Personalized Guidance Alert */}
        <div className={`rounded-xl shadow-sm p-6 border-2 ${
          guidance.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
          guidance.type === 'success' ? 'bg-green-50 border-green-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start space-x-4">
            <GuidanceIcon className={`w-6 h-6 flex-shrink-0 mt-1 ${
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

        {/* Priority Checklist for Job Holders */}
        {hasJob && !needsRelocation && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-green-600" />
              <span>Your Housing Continuity Checklist</span>
            </h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <input type="checkbox" className="mt-1 w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-800">Find housing within {filters.maxCommute} min commute</p>
                  <p className="text-sm text-gray-600">Keep your job by staying close to work</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <input type="checkbox" className="mt-1 w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-800">Apply for short-term rental (3-6 months)</p>
                  <p className="text-sm text-gray-600">Flexibility while you assess long-term options</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                <input type="checkbox" className="mt-1 w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-800">Contact FEMA for temporary housing assistance</p>
                  <p className="text-sm text-gray-600">Financial support may be available</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Relocation Support for Home Loss */}
        {needsRelocation && homeBurned && hasInsurance && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm p-6 border border-orange-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Home className="w-5 h-5 text-orange-600" />
              <span>Home Reconstruction Path</span>
            </h2>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="font-semibold text-gray-800 mb-2">Would you like to return to your home after rebuilding?</p>
                <div className="flex space-x-4">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Yes, temporary housing only
                  </button>
                  <button className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-green-500">
                    No, relocating permanently
                  </button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Insurance Coverage:</strong> Your ALE (Additional Living Expenses) may cover temporary housing for 12-24 months.
                  <a href="/insurance" className="text-green-600 hover:text-green-700 ml-2">View your coverage details →</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Your Search</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hasJob && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Commute Time
                </label>
                <select 
                  value={filters.maxCommute}
                  onChange={(e) => setFilters({...filters, maxCommute: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            )}
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
                placeholder="Enter ZIP code or city"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={housingType}
              onChange={(e) => setHousingType(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              <option value="emergency">Emergency Shelter</option>
              <option value="temporary">Temporary Housing</option>
              <option value="permanent">Permanent Housing</option>
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
        </div>

        {/* Map Section */}
        {showMap && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-96 bg-gradient-to-br from-blue-100 to-green-100 relative">
              {/* Placeholder for actual map - you would integrate Google Maps or Mapbox here */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">Interactive Map View</p>
                  <p className="text-gray-500 text-sm mt-2">Integrate Google Maps API or Mapbox</p>
                </div>
              </div>
              
              {/* Sample Map Markers - these would be actual markers on a real map */}
              <div className="absolute top-20 left-32 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                1
              </div>
              <div className="absolute top-40 left-64 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                2
              </div>
              <div className="absolute top-32 right-48 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                3
              </div>
              <div className="absolute bottom-32 right-32 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                4
              </div>
            </div>
          </div>
        )}

        {/* Housing Listings - Dynamic based on filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {hasJob && !needsRelocation ? 'Commute-Friendly Housing' : 
                 needsRelocation ? 'Housing Options for Your Situation' : 
                 'Available Housing'}
              </h2>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading personalized options...' : 
                 `${houses.length} options matching your criteria`}
              </p>
            </div>
          </div>
          
          {loading ? (
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
                    <div className="absolute top-3 right-3">
                      <button 
                        onClick={() => toggleSave(housing.id)}
                        className={`p-2 rounded-full shadow-lg transition-colors ${
                          savedHomes.includes(housing.id) 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white text-gray-400 hover:bg-red-50'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${savedHomes.includes(housing.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
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

                    {/* Commute Time Badge */}
                    {hasJob && housing.commuteTime && (
                      <div className="mb-3">
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                          <Briefcase className="w-3 h-3" />
                          <span>{housing.commuteTime} min commute</span>
                        </span>
                      </div>
                    )}

                    {/* Accessibility & Health Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {housing.accessible && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          ♿ Accessible
                        </span>
                      )}
                      {housing.nearHealthcare && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          🏥 Near Healthcare
                        </span>
                      )}
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
                        {housing.phone && (
                          <button className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>Call</span>
                          </button>
                        )}
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                          {housing.type === 'Emergency Shelter' ? 'Details' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
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