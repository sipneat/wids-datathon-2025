import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { School, MapPin, Users, Star, Calendar, Phone, Mail, ExternalLink, Clock, Award, CheckCircle } from 'lucide-react';

export default function Schools({ userProfile }) {
  const [gradeLevel, setGradeLevel] = useState('all');
  const [searchZip, setSearchZip] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(null);

  const schools = [
    {
      id: 1,
      name: 'Pacific Elementary School',
      type: 'Public Elementary',
      grades: 'K-5',
      address: '456 Ocean Ave, Santa Monica, CA 90401',
      distance: '3.2 miles',
      rating: 4.5,
      enrollment: 'Open - Expedited Process',
      phone: '(555) 234-5678',
      email: 'info@pacific-elem.edu',
      students: 450,
      features: ['Trauma counseling', 'ESL support', 'Free lunch program', 'After-school care'],
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['Proof of residence', 'Previous school records (if available)', 'Immunization records'],
      startDate: 'Immediate enrollment available'
    },
    {
      id: 2,
      name: 'Lincoln Middle School',
      type: 'Public Middle School',
      grades: '6-8',
      address: '789 Lincoln Blvd, Venice, CA 90291',
      distance: '5.1 miles',
      rating: 4.2,
      enrollment: 'Open',
      phone: '(555) 345-6789',
      email: 'admin@lincoln-ms.edu',
      students: 680,
      features: ['Special education services', 'Sports programs', 'Band & arts', 'Counseling services'],
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['Birth certificate', 'Proof of address', 'Transcript (flexible requirement)'],
      startDate: 'Rolling admissions'
    },
    {
      id: 3,
      name: 'Washington High School',
      type: 'Public High School',
      grades: '9-12',
      address: '321 Washington St, Los Angeles, CA 90015',
      distance: '6.8 miles',
      rating: 4.7,
      enrollment: 'Open - Priority for Fire Victims',
      phone: '(555) 456-7890',
      email: 'office@washington-hs.edu',
      students: 1200,
      features: ['AP courses', 'College counseling', 'Mental health support', 'Career center'],
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['ID/Birth certificate', 'Proof of residency', 'Transcripts (can be obtained later)'],
      startDate: 'Enrollment within 48 hours'
    },
    {
      id: 4,
      name: 'Bright Futures Academy',
      type: 'Charter Elementary',
      grades: 'K-6',
      address: '555 Hope Street, Culver City, CA 90232',
      distance: '4.5 miles',
      rating: 4.6,
      enrollment: 'Application Required',
      phone: '(555) 567-8901',
      email: 'admissions@brightfutures.org',
      students: 320,
      features: ['Small class sizes', 'STEM focus', 'Bilingual programs', 'Extended day options'],
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['Application form', 'Parent interview', 'Proof of address'],
      startDate: 'Next session: Feb 1, 2026'
    },
    {
      id: 5,
      name: 'Riverside Prep',
      type: 'Private Middle/High School',
      grades: '6-12',
      address: '888 River Road, Pasadena, CA 91101',
      distance: '12.3 miles',
      rating: 4.8,
      enrollment: 'Scholarship Available for Fire Victims',
      phone: '(555) 678-9012',
      email: 'admissions@riversideprep.edu',
      students: 450,
      features: ['Tuition assistance', '1:10 teacher ratio', 'College prep', 'Mental health services'],
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['Application', 'Financial aid form', 'Previous transcripts', 'Interview'],
      startDate: 'Mid-year enrollment available'
    },
    {
      id: 6,
      name: 'Meadowbrook Elementary',
      type: 'Public Elementary',
      grades: 'K-5',
      address: '234 Meadow Lane, Glendale, CA 91201',
      distance: '8.9 miles',
      rating: 4.3,
      enrollment: 'Open',
      phone: '(555) 789-0123',
      email: 'contact@meadowbrook.edu',
      students: 520,
      features: ['Music program', 'Art classes', 'Library services', 'Parent involvement'],
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
      acceptingDisplaced: true,
      documentsRequired: ['Proof of residence', 'Health records', 'Emergency contacts'],
      startDate: 'Immediate placement possible'
    }
  ];

  const enrollmentSteps = [
    {
      step: 1,
      title: 'Contact School',
      description: 'Call or email to inform them of your situation',
      icon: Phone
    },
    {
      step: 2,
      title: 'Gather Documents',
      description: 'Most schools are flexible with documentation for fire victims',
      icon: CheckCircle
    },
    {
      step: 3,
      title: 'Schedule Visit',
      description: 'Tour the school and meet with counselors',
      icon: Calendar
    },
    {
      step: 4,
      title: 'Complete Enrollment',
      description: 'Fill out forms and discuss your child\'s needs',
      icon: Award
    }
  ];

  const resources = [
    {
      title: 'School Supplies Assistance',
      description: 'Free backpacks, supplies, and uniforms for displaced students',
      contact: '1-800-SUPPLIES',
      icon: School
    },
    {
      title: 'Transportation Help',
      description: 'Bus passes and temporary transportation solutions',
      contact: '(555) TRANSIT',
      icon: MapPin
    },
    {
      title: 'Tutoring & Academic Support',
      description: 'Free tutoring services to help with transition',
      contact: 'support@edhelp.org',
      icon: Award
    }
  ];

  const filteredSchools = gradeLevel === 'all' 
    ? schools 
    : schools.filter(school => {
        if (gradeLevel === 'elementary') return school.type.includes('Elementary');
        if (gradeLevel === 'middle') return school.type.includes('Middle');
        if (gradeLevel === 'high') return school.type.includes('High');
        return true;
      });

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <School className="w-8 h-8" />
            <h1 className="text-3xl font-bold">School Enrollment</h1>
          </div>
          <p className="text-purple-50 text-lg">
            Find schools accepting displaced students with expedited enrollment
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <School className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Schools Available</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{schools.length}</p>
            <p className="text-sm text-gray-600 mt-1">Accepting displaced students</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-800">Immediate Enrollment</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{schools.filter(s => s.startDate.includes('Immediate')).length}</p>
            <p className="text-sm text-gray-600 mt-1">Schools with immediate placement</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Support Services</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">100%</p>
            <p className="text-sm text-gray-600 mt-1">Offer counseling support</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                placeholder="Enter ZIP code or current location"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Grade Levels</option>
              <option value="elementary">Elementary (K-5)</option>
              <option value="middle">Middle School (6-8)</option>
              <option value="high">High School (9-12)</option>
            </select>
          </div>
        </div>

        {/* School Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSchools.map((school) => (
            <div key={school.id} className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all duration-200">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <img 
                  src={school.image} 
                  alt={school.name}
                  className="w-full h-full object-cover"
                />
                {school.acceptingDisplaced && (
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Accepting Displaced Students</span>
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-semibold text-gray-800">{school.rating}</span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{school.name}</h3>
                    <p className="text-purple-600 text-sm font-medium">{school.type}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                    {school.grades}
                  </span>
                </div>
                
                <p className="text-gray-600 flex items-center space-x-2 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{school.address}</span>
                  <span className="text-purple-600 text-sm">• {school.distance}</span>
                </p>

                <div className="mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{school.students} students</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium text-green-600">{school.enrollment}</span>
                    </span>
                  </div>
                </div>

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

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold">Start Date:</span> {school.startDate}
                  </p>
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

        {/* Enrollment Process */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Enrollment Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {enrollmentSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Additional Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <div key={index} className="bg-white p-5 rounded-xl shadow-sm">
                  <Icon className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-gray-800 mb-2">{resource.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                  <p className="text-purple-600 text-sm font-medium">{resource.contact}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* School Details Modal (if selected) */}
        {selectedSchool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSchool(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedSchool.name}</h2>
                    <p className="text-purple-600 font-medium">{selectedSchool.type}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSchool(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <img 
                  src={selectedSchool.image} 
                  alt={selectedSchool.name}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Contact Information</h3>
                    <p className="text-gray-600 flex items-center space-x-2 mb-1">
                      <Phone className="w-4 h-4" />
                      <span>{selectedSchool.phone}</span>
                    </p>
                    <p className="text-gray-600 flex items-center space-x-2 mb-1">
                      <Mail className="w-4 h-4" />
                      <span>{selectedSchool.email}</span>
                    </p>
                    <p className="text-gray-600 flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedSchool.address}</span>
                    </p>
                  </div>

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