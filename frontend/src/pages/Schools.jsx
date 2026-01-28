import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { School, MapPin, Users, Star, Calendar, Phone, Mail, ExternalLink, Clock, Award, CheckCircle } from 'lucide-react';
import { defaultSchools, defaultEnrollmentSteps, defaultResources } from '../data/schoolsData';
import schoolsService from '../services/schoolsService';

export default function Schools({ 
  userProfile,
  /**
   * Optional async loader (Insurance-style). If provided, the page will call this on mount / when
   * userProfile changes, and use the returned data to render the same layout.
   * If not provided, will use schoolsService.getSchoolsData() by default.
   *
   * Expected return shape:
   * {
   *   schools?: Array,
   *   enrollmentSteps?: Array,
   *   resources?: Array,
   *   pageConfig?: Object,
   *   filterOptions?: Object,
   *   statsConfig?: Object
   * }
   */
  loadSchoolsData,
  // Page configuration
  pageConfig = {
    title: 'School Enrollment',
    description: 'Find schools accepting displaced students with expedited enrollment',
    icon: School
  },
  // Data arrays - optionally overridden by props (or by loadSchoolsData)
  schools: schoolsProp,
  enrollmentSteps: enrollmentStepsProp,
  resources: resourcesProp,
  // Filter options
  filterOptions = {
    gradeLevels: [
      { value: 'all', label: 'All Grade Levels' },
      { value: 'elementary', label: 'Elementary (K-5)' },
      { value: 'middle', label: 'Middle School (6-8)' },
      { value: 'high', label: 'High School (9-12)' }
    ],
    searchPlaceholder: 'Enter ZIP code or current location'
  },
  // Stats configuration
  statsConfig = {
    showStats: true,
    stats: [
      {
        label: 'Schools Available',
        value: null, // Will be calculated from schools.length
        description: 'Accepting displaced students',
        icon: School,
        iconColor: 'text-purple-600'
      },
      {
        label: 'Immediate Enrollment',
        value: null, // Will be calculated
        description: 'Schools with immediate placement',
        icon: Clock,
        iconColor: 'text-green-600',
        calculateValue: (schools) => schools.filter(s => s.startDate && s.startDate.toLowerCase().includes('immediate')).length
      },
      {
        label: 'Support Services',
        value: '100%',
        description: 'Offer counseling support',
        icon: Users,
        iconColor: 'text-blue-600'
      }
    ]
  }
}) {
  const [gradeLevel, setGradeLevel] = useState('all');
  const [searchZip, setSearchZip] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Insurance-style: internal data that can be loaded async
  const [loadedData, setLoadedData] = useState(null);

  // Load schools data on mount (Insurance-style pattern)
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        // Use provided loader or default service
        const dataLoader = loadSchoolsData || schoolsService.getSchoolsData.bind(schoolsService);
        const data = await dataLoader(userProfile);
        
        if (!cancelled) {
          setLoadedData(data || {});
        }
      } catch (err) {
        console.error('Error loading schools data:', err);
        if (!cancelled) {
          setLoadError('Failed to load schools. Please try again.');
          // Still set empty data so component can render with defaults
          setLoadedData({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [userProfile, loadSchoolsData]);

  // Decide final inputs (priority: loadedData > props > defaults)
  const effectivePageConfig = loadedData?.pageConfig || pageConfig;
  const effectiveFilterOptions = loadedData?.filterOptions || filterOptions;
  const effectiveStatsConfig = loadedData?.statsConfig || statsConfig;
  const schools = loadedData?.schools ?? schoolsProp ?? defaultSchools;
  const enrollmentSteps = loadedData?.enrollmentSteps ?? enrollmentStepsProp ?? defaultEnrollmentSteps;
  const resources = loadedData?.resources ?? resourcesProp ?? defaultResources;

  // Calculate stats dynamically
  const calculatedStats = useMemo(() => {
    if (!effectiveStatsConfig.showStats) return [];
    
    return effectiveStatsConfig.stats.map(stat => ({
      ...stat,
      value: stat.calculateValue 
        ? stat.calculateValue(schools)
        : (stat.value !== null ? stat.value : schools.length)
    }));
  }, [schools, effectiveStatsConfig]);

  // Filter schools by grade level and zip code
  const filteredSchools = useMemo(() => {
    let filtered = schools;

    // Filter by grade level
    if (gradeLevel !== 'all') {
      filtered = filtered.filter(school => {
        if (gradeLevel === 'elementary') return school.type && school.type.includes('Elementary');
        if (gradeLevel === 'middle') return school.type && school.type.includes('Middle');
        if (gradeLevel === 'high') return school.type && school.type.includes('High');
        return true;
      });
    }

    // Filter by zip code (if searchZip is provided and school has zip/address)
    if (searchZip.trim()) {
      filtered = filtered.filter(school => {
        const zip = searchZip.trim();
        return school.address?.includes(zip) || 
               school.zipCode?.includes(zip) ||
               school.location?.includes(zip);
      });
    }

    return filtered;
  }, [schools, gradeLevel, searchZip]);

  const PageIcon = effectivePageConfig.icon || School;

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <PageIcon className="w-8 h-8" />
            <h1 className="text-3xl font-bold">{effectivePageConfig.title}</h1>
          </div>
          <p className="text-purple-50 text-lg">
            {effectivePageConfig.description}
          </p>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">{loadError}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600">Loading schools…</p>
          </div>
        )}

        {/* Quick Stats */}
        {effectiveStatsConfig.showStats && calculatedStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {calculatedStats.map((stat, index) => {
              const StatIcon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center space-x-3 mb-2">
                    <StatIcon className={`w-6 h-6 ${stat.iconColor || 'text-purple-600'}`} />
                    <h3 className="font-semibold text-gray-800">{stat.label}</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                placeholder={effectiveFilterOptions.searchPlaceholder}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {effectiveFilterOptions.gradeLevels && effectiveFilterOptions.gradeLevels.length > 0 && (
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {effectiveFilterOptions.gradeLevels.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* School Listings */}
        {filteredSchools.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSchools.map((school) => (
              <div key={school.id || school.name} className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all duration-200">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {school.image && (
                    <img 
                      src={school.image} 
                      alt={school.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {school.acceptingDisplaced && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Accepting Displaced Students</span>
                      </span>
                    </div>
                  )}
                  {school.rating && (
                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-semibold text-gray-800">{school.rating}</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{school.name}</h3>
                      {school.type && (
                        <p className="text-purple-600 text-sm font-medium">{school.type}</p>
                      )}
                    </div>
                    {school.grades && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                        {school.grades}
                      </span>
                    )}
                  </div>
                  
                  {school.address && (
                    <p className="text-gray-600 flex items-center space-x-2 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{school.address}</span>
                      {school.distance && (
                        <span className="text-purple-600 text-sm">• {school.distance}</span>
                      )}
                    </p>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      {school.students && (
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{school.students} students</span>
                        </span>
                      )}
                      {school.enrollment && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium text-green-600">{school.enrollment}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {school.features && school.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {school.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                      {school.features.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{school.features.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    {school.startDate && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-semibold">Start Date:</span> {school.startDate}
                      </p>
                    )}
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedSchool(school)}
                        className="flex-1 px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>Contact</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <School className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No schools found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Enrollment Process */}
        {enrollmentSteps && enrollmentSteps.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Enrollment Process</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {enrollmentSteps.map((step, index) => {
                const Icon = step.icon || Award;
                const stepNumber = step.step !== undefined ? step.step : index + 1;
                return (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                      {stepNumber}
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resources */}
        {resources && resources.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Additional Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map((resource, index) => {
                const Icon = resource.icon || School;
                return (
                  <div key={index} className="bg-white p-5 rounded-xl shadow-sm">
                    <Icon className="w-8 h-8 text-purple-600 mb-3" />
                    <h3 className="font-semibold text-gray-800 mb-2">{resource.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                    {resource.contact && (
                      <p className="text-purple-600 text-sm font-medium">{resource.contact}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* School Details Modal (if selected) */}
        {selectedSchool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSchool(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedSchool.name}</h2>
                    {selectedSchool.type && (
                      <p className="text-purple-600 font-medium">{selectedSchool.type}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedSchool(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                {selectedSchool.image && (
                  <img 
                    src={selectedSchool.image} 
                    alt={selectedSchool.name}
                    className="w-full h-64 object-cover rounded-xl mb-6"
                  />
                )}

                <div className="space-y-4">
                  {(selectedSchool.phone || selectedSchool.email || selectedSchool.address) && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Contact Information</h3>
                      {selectedSchool.phone && (
                        <p className="text-gray-600 flex items-center space-x-2 mb-1">
                          <Phone className="w-4 h-4" />
                          <span>{selectedSchool.phone}</span>
                        </p>
                      )}
                      {selectedSchool.email && (
                        <p className="text-gray-600 flex items-center space-x-2 mb-1">
                          <Mail className="w-4 h-4" />
                          <span>{selectedSchool.email}</span>
                        </p>
                      )}
                      {selectedSchool.address && (
                        <p className="text-gray-600 flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedSchool.address}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {selectedSchool.features && selectedSchool.features.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Features & Services</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchool.features.map((feature, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSchool.documentsRequired && selectedSchool.documentsRequired.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Required Documents</h3>
                      <ul className="space-y-2">
                        {selectedSchool.documentsRequired.map((doc, i) => (
                          <li key={i} className="flex items-start space-x-2 text-gray-600">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4">
                    <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold">
                      Schedule Visit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}