import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { School, MapPin, Users, Star, Calendar, Phone, Mail, ExternalLink, Clock, Award, CheckCircle } from 'lucide-react';
import { defaultSchools, defaultEnrollmentSteps, defaultResources, defaultOnlineOptions, defaultRecoveryPlans } from '../data/schoolsData';
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
  onlineOptions: onlineOptionsProp,
  recoveryPlans: recoveryPlansProp,
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

  // Recommendation inputs (near parent jobs / outside fire radius)
  const [workZipsInput, setWorkZipsInput] = useState(() => {
    return localStorage.getItem('schools.workZipsInput') || '';
  });
  const [maxCommuteMinutes, setMaxCommuteMinutes] = useState(() => {
    const stored = localStorage.getItem('schools.maxCommuteMinutes');
    const num = stored ? Number(stored) : 30;
    return Number.isFinite(num) && num > 0 ? num : 30;
  });
  const [preferOutsideFireRadius, setPreferOutsideFireRadius] = useState(() => {
    const stored = localStorage.getItem('schools.preferOutsideFireRadius');
    return stored ? JSON.parse(stored) : true;
  });
  const [appliedQuery, setAppliedQuery] = useState(() => {
    const storedWorkZips = localStorage.getItem('schools.workZipsApplied') || '';
    const storedMaxCommute = localStorage.getItem('schools.maxCommuteApplied');
    const storedPreferOutside = localStorage.getItem('schools.preferOutsideFireRadiusApplied');

    const workZips = storedWorkZips
      .split(',')
      .map((z) => z.trim())
      .filter(Boolean);

    const maxCommute = storedMaxCommute ? Number(storedMaxCommute) : 30;
    const preferOutside =
      storedPreferOutside !== null ? JSON.parse(storedPreferOutside) : true;

    return {
      workZips,
      maxCommuteMinutes: Number.isFinite(maxCommute) && maxCommute > 0 ? maxCommute : 30,
      preferOutsideFireRadius: preferOutside
    };
  });

  // Insurance-style: internal data that can be loaded async
  const [loadedData, setLoadedData] = useState(null);

  const intakeResponses = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('intakeResponses') || '{}');
    } catch {
      return {};
    }
  }, []);

  const applyRecommendationFilters = () => {
    const workZips = workZipsInput
      .split(',')
      .map((z) => z.trim())
      .filter(Boolean);

    setAppliedQuery({
      workZips,
      maxCommuteMinutes: Number(maxCommuteMinutes) || 30,
      preferOutsideFireRadius: Boolean(preferOutsideFireRadius)
    });
  };

  // Persist user preferences locally
  useEffect(() => {
    localStorage.setItem('schools.workZipsInput', workZipsInput);
    localStorage.setItem('schools.maxCommuteMinutes', String(maxCommuteMinutes));
    localStorage.setItem(
      'schools.preferOutsideFireRadius',
      JSON.stringify(preferOutsideFireRadius)
    );
  }, [workZipsInput, maxCommuteMinutes, preferOutsideFireRadius]);

  // Persist last applied query for recommendations
  useEffect(() => {
    if (!appliedQuery) return;
    localStorage.setItem(
      'schools.workZipsApplied',
      (appliedQuery.workZips || []).join(', ')
    );
    localStorage.setItem(
      'schools.maxCommuteApplied',
      String(appliedQuery.maxCommuteMinutes ?? 30)
    );
    localStorage.setItem(
      'schools.preferOutsideFireRadiusApplied',
      JSON.stringify(appliedQuery.preferOutsideFireRadius ?? true)
    );
  }, [appliedQuery]);

  // Load schools data on mount (Insurance-style pattern)
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        // Use provided loader or default service
        const dataLoader = loadSchoolsData || schoolsService.getSchoolsData.bind(schoolsService);
        const data = await dataLoader(userProfile, {
          intakeResponses,
          // For DB-backed recommendations:
          homeZip: searchZip.trim() || userProfile?.zipCode || null,
          ...appliedQuery
        });
        
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
  }, [userProfile, loadSchoolsData, appliedQuery, intakeResponses]);

  // Decide final inputs (priority: loadedData > props > defaults)
  const effectivePageConfig = loadedData?.pageConfig || pageConfig;
  const effectiveFilterOptions = loadedData?.filterOptions || filterOptions;
  const effectiveStatsConfig = loadedData?.statsConfig || statsConfig;
  const schools = loadedData?.schools ?? schoolsProp ?? defaultSchools;
  const enrollmentSteps = loadedData?.enrollmentSteps ?? enrollmentStepsProp ?? defaultEnrollmentSteps;
  const resources = loadedData?.resources ?? resourcesProp ?? defaultResources;
  const onlineOptions = loadedData?.onlineOptions ?? onlineOptionsProp ?? defaultOnlineOptions;
  const recoveryPlans = loadedData?.recoveryPlans ?? recoveryPlansProp ?? defaultRecoveryPlans;

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

          {/* Recommendation filters (DB-backed when available) */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent work ZIPs (comma-separated)
                </label>
                <input
                  type="text"
                  value={workZipsInput}
                  onChange={(e) => setWorkZipsInput(e.target.value)}
                  placeholder="e.g. 95050, 94025"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to recommend schools near work and outside the fire radius (requires backend data).
                </p>
              </div>

              <div className="w-full lg:w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max commute (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={maxCommuteMinutes}
                  onChange={(e) => setMaxCommuteMinutes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="w-full lg:w-auto">
                <label className="inline-flex items-center space-x-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={preferOutsideFireRadius}
                    onChange={(e) => setPreferOutsideFireRadius(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Prefer schools outside fire radius</span>
                </label>
              </div>

              <button
                onClick={applyRecommendationFilters}
                className="w-full lg:w-auto px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
              >
                Apply
              </button>
            </div>
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
                    {school.enrollmentTimeline && (
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-semibold">Enrollment timeline:</span> {school.enrollmentTimeline}
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

        {/* Online Learning Options */}
        {onlineOptions && onlineOptions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Online Learning Options</h2>
            <p className="text-sm text-gray-600 mb-4">
              If returning to a physical school right away is hard, these online options can help your child stay on track while you sort out housing and school placement.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onlineOptions.map((option, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-5 flex flex-col h-full">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                      {option.type}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1">
                      {option.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-3 flex-1">
                    {option.description}
                  </p>
                  <div className="space-y-1 text-xs text-gray-700 mb-3">
                    {option.gradeLevels && (
                      <p>
                        <span className="font-semibold">Grades:</span> {option.gradeLevels}
                      </p>
                    )}
                    {option.cost && (
                      <p>
                        <span className="font-semibold">Cost:</span> {option.cost}
                      </p>
                    )}
                    {option.timeline && (
                      <p>
                        <span className="font-semibold">Timeline to start:</span> {option.timeline}
                      </p>
                    )}
                    {option.techSupport && (
                      <p>
                        <span className="font-semibold">Support:</span> {option.techSupport}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovery Timeline & District Plans */}
        {recoveryPlans && recoveryPlans.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Recovery Timeline for Affected Schools
            </h2>
            <p className="text-sm text-gray-700 mb-6">
              This is a typical pattern districts follow after a major fire. Your local district may be at a different phase, but this can help you plan school stability and ask the right questions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recoveryPlans.map((phase, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      {phase.focus}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {phase.phase}
                  </h3>
                  <p className="text-xs text-gray-700 mb-3 flex-1">
                    {phase.description}
                  </p>
                  {phase.typicalActions && phase.typicalActions.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-gray-800 mb-1">
                        What districts typically do:
                      </p>
                      <ul className="space-y-1 text-xs text-gray-700 list-disc ml-4">
                        {phase.typicalActions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white/70 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Questions to ask your district
              </h3>
              <ul className="space-y-1 text-xs text-gray-800 list-disc ml-4">
                <li>Is my child’s current school inside the fire impact zone or scheduled for relocation?</li>
                <li>Where will their teachers and classmates be learning in the next 1–3 months?</li>
                <li>Is there a plan to keep them at one “receiving” school for the rest of the year to avoid multiple moves?</li>
                <li>What transportation will be provided from our temporary housing to that school?</li>
              </ul>
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

                  {selectedSchool.enrollmentTimeline && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Enrollment Timeline</h3>
                      <p className="text-gray-600">{selectedSchool.enrollmentTimeline}</p>
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