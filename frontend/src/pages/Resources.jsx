import { useEffect, useRef, useState } from 'react';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { ResourceCard } from '../components/ResourceCard';
import { Layout } from '../components/Layout';
import { getResourceInsights } from '../services/routes';

export default function Resources({ userProfile }) {
  const [insights, setInsights] = useState({
    recoveryTimeline: [],
    impactAssessment: [],
    financialInsights: []
  });
  const [insightSource, setInsightSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const lastFetchRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!userProfile?.uid) {
      setIsLoading(false);
      return;
    }

    const loadInsights = async () => {
      if (inFlightRef.current && lastFetchRef.current === userProfile.uid) {
        return;
      }
      inFlightRef.current = true;
      lastFetchRef.current = userProfile.uid;
      setIsLoading(true);
      setError('');
      try {
        const data = await getResourceInsights({ userId: userProfile.uid });
        setInsights({
          recoveryTimeline: data?.recoveryTimeline || [],
          impactAssessment: data?.impactAssessment || [],
          financialInsights: data?.financialInsights || []
        });
        setInsightSource(data?.insightSource || '');
      } catch (err) {
        console.error('Error loading resource insights:', err);
        setError('Unable to load AI insights right now. Please refresh.');
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    };

    loadInsights();
  }, [userProfile?.uid]);


  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Recovery Resources & Insights</h2>
              <p className="text-gray-600">Data-driven insights to help you plan your recovery journey</p>
            </div>
            {insightSource && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                insightSource === 'ai'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {insightSource === 'ai' ? 'AI-generated' : 'Fallback insights'}
              </span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600">Loading AI insights...</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResourceCard
            title="Recovery Timeline"
            data={insights.recoveryTimeline}
            type="timeline"
            icon={Calendar}
          />
          <ResourceCard
            title="Impact Assessment"
            data={insights.impactAssessment}
            type="impact"
            icon={TrendingUp}
          />
          <ResourceCard
            title="Financial Insights"
            data={insights.financialInsights}
            type="financial"
            icon={DollarSign}
          />
        </div>

        {/* Additional Resources */}
        <div className="bg-linear-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
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