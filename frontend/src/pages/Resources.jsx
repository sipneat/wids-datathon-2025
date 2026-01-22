import React from 'react';
import { Calendar, TrendingUp, DollarSign, School } from 'lucide-react';
import { ResourceCard } from '../components/ResourceCard';
import { Layout } from '../components/Layout';

export default function Resources({ userProfile }) {
  const recoveryData = [
    {
      label: 'Estimated Return Home Date',
      value: 'March 15 - April 30, 2026',
      description: 'Based on infrastructure rebuilding timelines in your area'
    },
    {
      label: 'Neighborhood Access',
      value: 'Limited - Escorted visits only',
      description: 'Safety inspections in progress, full access expected in 4-6 weeks'
    },
    {
      label: 'Rebuilding Permit Status',
      value: 'Applications opening February 1',
      description: 'Expedited processing available for fire-affected properties'
    }
  ];

  const impactData = [
    {
      label: 'Area Fire Severity',
      value: 'High Impact Zone',
      description: '87% of structures affected in your neighborhood'
    },
    {
      label: 'Historical Fire Risk',
      value: 'Elevated',
      description: '3 major fires in the past 15 years within 5-mile radius'
    },
    {
      label: 'Recovery Progress',
      value: '23% Complete',
      description: 'Utilities: Partial | Roads: 60% | Services: Limited'
    }
  ];

  const financialData = [
    {
      label: 'Average Insurance Payout Timeline',
      value: '4-6 months',
      description: 'For similar wildfire claims in California (2023-2024 data)'
    },
    {
      label: 'FEMA Assistance Average',
      value: '$8,500 - $15,000',
      description: 'Temporary housing and immediate needs assistance'
    },
    {
      label: 'Rebuilding Cost Estimate',
      value: '$350-450 per sq ft',
      description: 'Current construction costs in affected regions'
    }
  ];

  const schoolData = [
    {
      label: 'Nearby Schools Accepting Transfers',
      value: '12 schools within 10 miles',
      description: 'Expedited enrollment available for displaced students'
    },
    {
      label: 'Temporary School Sites',
      value: '3 locations operational',
      description: 'Portable classrooms and community center partnerships'
    },
    {
      label: 'Counseling Support',
      value: 'Available at all locations',
      description: 'Trauma-informed care and academic transition support'
    }
  ];

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Recovery Resources & Insights</h2>
          <p className="text-gray-600">Data-driven insights to help you plan your recovery journey</p>
        </div>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResourceCard
            title="Recovery Timeline"
            data={recoveryData}
            type="timeline"
            icon={Calendar}
          />
          <ResourceCard
            title="Impact Assessment"
            data={impactData}
            type="impact"
            icon={TrendingUp}
          />
          <ResourceCard
            title="Financial Insights"
            data={financialData}
            type="financial"
            icon={DollarSign}
          />
          {userProfile?.hasChildren && (
            <ResourceCard
              title="School Information"
              data={schoolData}
              type="school"
              icon={School}
            />
          )}
        </div>

        {/* Additional Resources */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Important Updates</h3>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4">
              <p className="font-medium text-gray-800">Infrastructure Update</p>
              <p className="text-sm text-gray-600 mt-1">Power restoration expected in Zone A by January 28. Water services testing in progress.</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-medium text-gray-800">Community Meeting</p>
              <p className="text-sm text-gray-600 mt-1">Virtual town hall scheduled for January 25 at 6 PM. Register through your local emergency services portal.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}