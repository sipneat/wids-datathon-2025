import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Home, MapPin, DollarSign, Calendar, Search, ExternalLink, Phone, Heart, Bed, Bath, Maximize, Filter } from 'lucide-react';

export default function Housing({ userProfile }) {
  const [searchZip, setSearchZip] = useState('');
  const [housingType, setHousingType] = useState('all');
  const [showMap, setShowMap] = useState(true);
  const [savedHomes, setSavedHomes] = useState([]);

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
      image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400'
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
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'
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
      securityDeposit: 2400
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
      securityDeposit: 2800
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
      securityDeposit: 2200
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
      securityDeposit: 2600
    }
  ];

  const toggleSave = (id) => {
    setSavedHomes(prev => 
      prev.includes(id) ? prev.filter(homeId => homeId !== id) : [...prev, id]
    );
  };

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
            Find temporary shelter and explore permanent housing options
          </p>
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

        {/* Emergency/Temporary Housing */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Temporary Housing Options</h2>
              <p className="text-gray-600 mt-1">Immediate shelter and short-term solutions</p>
            </div>
            <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              {temporaryHousing.length} Available
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {temporaryHousing.map((housing) => (
              <div key={housing.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-green-500 hover:shadow-lg transition-all duration-200">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  <img 
                    src={housing.image} 
                    alt={housing.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <button className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors">
                      <Heart className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                      {housing.type}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{housing.name}</h3>
                  <p className="text-gray-600 flex items-center space-x-2 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{housing.address}</span>
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {housing.amenities.map((amenity, i) => (
                      <span key={i} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{housing.availability}</span>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permanent Housing Listings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Permanent Housing Listings</h2>
              <p className="text-gray-600 mt-1">Long-term rental options</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-green-500 transition-colors">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {permanentHousing.map((housing) => (
              <div key={housing.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-green-500 hover:shadow-lg transition-all duration-200">
                <div className="h-56 bg-gray-200 relative overflow-hidden">
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
                  <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-2 bg-white text-gray-800 text-lg font-bold rounded-lg shadow-lg">
                      ${housing.rent.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{housing.name}</h3>
                  <p className="text-gray-600 flex items-center space-x-2 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{housing.address}</span>
                  </p>
                  
                  <div className="flex items-center space-x-4 mb-4 text-gray-700">
                    <span className="flex items-center space-x-1">
                      <Bed className="w-4 h-4" />
                      <span className="text-sm font-medium">{housing.bedrooms} Bed</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Bath className="w-4 h-4" />
                      <span className="text-sm font-medium">{housing.bathrooms} Bath</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Maximize className="w-4 h-4" />
                      <span className="text-sm font-medium">{housing.sqft} sqft</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {housing.features.slice(0, 3).map((feature, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                    {housing.features.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{housing.features.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{housing.available}</span>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm">
                        Tour
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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