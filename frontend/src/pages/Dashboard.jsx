import React from 'react';
import { Layout } from '../components/Layout';
import { Home as HomeIcon, School, Baby, DollarSign, MapPin, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ userProfile }) {
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const priorityActions = [
    userProfile.needsHousing && {
      icon: MapPin,
      title: 'Find Housing',
      description: 'Explore temporary and permanent housing options',
      link: '/housing',
      priority: 'high'
    },
    userProfile.hasChildren && {
      icon: School,
      title: 'Enroll Children in School',
      description: 'Get help with school enrollment and transfers',
      link: '/schools',
      priority: 'high'
    },
    {
      icon: DollarSign,
      title: 'File Insurance Claim',
      description: 'Navigate your insurance process',
      link: '/insurance',
      priority: 'high'
    },
    userProfile.needsEmployment && {
      icon: Briefcase,
      title: 'Employment Support',
      description: 'Find job placement and career resources',
      link: '/employment',
      priority: 'medium'
    },
    userProfile.hasChildren && {
      icon: Baby,
      title: 'Childcare Services',
      description: 'Access childcare and family support',
      link: '/childcare',
      priority: 'medium'
    }
  ].filter(Boolean);

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            {getWelcomeMessage()}, {userProfile.name}
          </h1>
          <p className="text-green-50 text-lg">
            We're here to support you through every step of your recovery journey.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <HomeIcon className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-800">Household Size</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{userProfile.familySize}</p>
            <p className="text-sm text-gray-600 mt-1">
              {userProfile.hasChildren ? `Including ${userProfile.childrenAges?.split(',').length || 0} children` : 'Adults only'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Priority Actions</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{priorityActions.filter(a => a.priority === 'high').length}</p>
            <p className="text-sm text-gray-600 mt-1">Items need attention</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Insurance Status</h3>
            </div>
            <p className="text-lg font-bold text-gray-900">{userProfile.insuranceType || 'Not specified'}</p>
            <p className="text-sm text-gray-600 mt-1">
              {userProfile.hasInsurance ? 'Coverage active' : 'No coverage'}
            </p>
          </div>
        </div>

        {/* Priority Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Priority Actions</h2>
          <div className="space-y-4">
            {priorityActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.link}
                  className={`block p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                    action.priority === 'high'
                      ? 'border-red-200 bg-red-50 hover:border-red-300'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        action.priority === 'high' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          action.priority === 'high' ? 'text-red-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{action.title}</h3>
                        <p className="text-gray-600 mt-1">{action.description}</p>
                      </div>
                    </div>
                    {action.priority === 'high' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                        High Priority
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Your Support Resources */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Personalized Resources</h2>
          <p className="text-gray-600 mb-6">
            Based on your intake assessment, here are the support areas we've activated for you:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userProfile.needsHousing && (
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-gray-800">Housing Assistance</span>
              </div>
            )}
            {userProfile.hasChildren && (
              <>
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-gray-800">School Enrollment Support</span>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-gray-800">Childcare Resources</span>
                </div>
              </>
            )}
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-medium text-gray-800">Insurance Guidance</span>
            </div>
            {userProfile.needsEmployment && (
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-gray-800">Employment Services</span>
              </div>
            )}
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-medium text-gray-800">Community Support</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}