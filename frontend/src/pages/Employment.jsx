import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Briefcase, Activity, HeartPulse, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { defaultEmploymentPageConfig, defaultEmploymentInputs, defaultEmploymentResources, defaultReopeningInference } from '../data/employmentData';
import employmentService from '../services/employmentService';

export default function Employment({
  userProfile,
  pageConfig = defaultEmploymentPageConfig,
  inputsConfig = defaultEmploymentInputs,
  resources: resourcesProp,
  reopeningInference: reopeningInferenceProp,
  loadEmploymentData,
}) {
  const [jobStatus, setJobStatus] = useState(
    () => localStorage.getItem('employment.jobStatus') || 'uncertain'
  );
  const [healthConstraint, setHealthConstraint] = useState(
    () => localStorage.getItem('employment.healthConstraint') || 'none'
  );
  const [caregivingLoad, setCaregivingLoad] = useState(
    () => localStorage.getItem('employment.caregivingLoad') || 'none'
  );

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadedData, setLoadedData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  const intakeResponses = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('intakeResponses') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('employment.jobStatus', jobStatus);
    localStorage.setItem('employment.healthConstraint', healthConstraint);
    localStorage.setItem('employment.caregivingLoad', caregivingLoad);
  }, [jobStatus, healthConstraint, caregivingLoad]);

  const appliedInputs = useMemo(
    () => ({
      jobStatus,
      healthConstraint,
      caregivingLoad,
      intakeResponses,
    }),
    [jobStatus, healthConstraint, caregivingLoad, intakeResponses]
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const loader = loadEmploymentData || employmentService.getEmploymentData.bind(employmentService);
        const data = await loader(userProfile, appliedInputs);
        if (cancelled) return;
        setLoadedData(data || {});
        setRecommendation(data?.recommendation || null);
      } catch (err) {
        console.error('Error loading employment data:', err);
        if (!cancelled) {
          setLoadError('Failed to load employment guidance. Please try again.');
          setLoadedData({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [userProfile, loadEmploymentData, appliedInputs]);

  const effectivePageConfig = loadedData?.pageConfig || pageConfig;
  const effectiveInputsConfig = loadedData?.inputsConfig || inputsConfig;
  const resources = loadedData?.resources || resourcesProp || defaultEmploymentResources;
  const reopeningInference = loadedData?.reopeningInference || reopeningInferenceProp || defaultReopeningInference;

  const reopeningKey = jobStatus === 'open' ? 'open' : jobStatus === 'closed' ? 'closed' : 'uncertain';
  const reopening = reopeningInference[reopeningKey] || reopeningInference.uncertain;

  const showTransitionResources =
    (jobStatus === 'closed' || jobStatus === 'uncertain') &&
    (healthConstraint === 'moderate' || healthConstraint === 'high');

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-3">
            <Briefcase className="w-8 h-8" />
            <h1 className="text-3xl font-bold">{effectivePageConfig.title}</h1>
          </div>
          <p className="text-emerald-50 text-lg">{effectivePageConfig.description}</p>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 text-sm">{loadError}</p>
          </div>
        )}

        {/* Inputs: job status, health, caregiving */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Work Situation</h2>
          <p className="text-sm text-gray-600 mb-4">
            Answer a few questions so we can tailor guidance about reopening likelihood, temporary work, and accommodations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Job status</p>
              <div className="space-y-2">
                {effectiveInputsConfig.jobStatusOptions.map((opt) => (
                  <label key={opt.value} className="flex items-start space-x-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="jobStatus"
                      value={opt.value}
                      checked={jobStatus === opt.value}
                      onChange={(e) => setJobStatus(e.target.value)}
                      className="mt-1 h-4 w-4 text-emerald-600 border-gray-300"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Health & air quality</p>
              <div className="space-y-2">
                {effectiveInputsConfig.healthConstraintOptions.map((opt) => (
                  <label key={opt.value} className="flex items-start space-x-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="healthConstraint"
                      value={opt.value}
                      checked={healthConstraint === opt.value}
                      onChange={(e) => setHealthConstraint(e.target.value)}
                      className="mt-1 h-4 w-4 text-emerald-600 border-gray-300"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Caregiving load</p>
              <div className="space-y-2">
                {effectiveInputsConfig.caregivingOptions.map((opt) => (
                  <label key={opt.value} className="flex items-start space-x-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="caregivingLoad"
                      value={opt.value}
                      checked={caregivingLoad === opt.value}
                      onChange={(e) => setCaregivingLoad(e.target.value)}
                      className="mt-1 h-4 w-4 text-emerald-600 border-gray-300"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 text-sm text-gray-600 flex items-center space-x-2">
              <Activity className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Updating guidance…</span>
            </div>
          )}
        </div>

        {/* Reopening likelihood + transition signal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">Reopening likelihood (static inference)</h2>
            </div>
            <p className="text-sm font-semibold text-emerald-700 mb-1">{reopening.label}</p>
            <p className="text-sm text-gray-700">{reopening.description}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Our high-level suggestion</h2>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Based on what you shared, here&apos;s how we suggest balancing waiting vs. transitioning:
            </p>
            <ul className="list-disc ml-4 text-sm text-gray-700 space-y-1">
              {showTransitionResources ? (
                <>
                  <li>
                    Prioritize <span className="font-semibold">transition resources</span> (temporary work,
                    retraining, and remote options) while monitoring updates from your employer.
                  </li>
                  <li>If your workplace is near the fire and air quality is poor, ask about remote or alternate worksites.</li>
                </>
              ) : (
                <>
                  <li>
                    It may be reasonable to <span className="font-semibold">wait and monitor</span> for a short
                    period while also exploring backup options.
                  </li>
                  <li>Use the resources below to line up a plan B in case recovery takes longer than expected.</li>
                </>
              )}
              {caregivingLoad === 'high' && (
                <li>
                  Your <span className="font-semibold">caregiving responsibilities</span> make flexibility extra
                  important—see the accommodations section for conversation starters with your employer.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Workplace closed & job search / income bridge */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Briefcase className="w-5 h-5 text-gray-800" />
            <h2 className="text-xl font-semibold text-gray-800">If your workplace is closed or uncertain</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.workplaceClosed?.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                {item.links && (
                  <ul className="text-xs text-gray-700 list-disc ml-4 space-y-1">
                    {item.links.map((link, i) => (
                      <li key={i}>{link}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Retraining & temp work resources */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-gray-800" />
            <h2 className="text-xl font-semibold text-gray-800">Retraining & temporary work resources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.retraining?.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                {item.links && (
                  <ul className="text-xs text-gray-700 list-disc ml-4 space-y-1">
                    {item.links.map((link, i) => (
                      <li key={i}>{link}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Accommodations & caregiver pressure */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center space-x-2 mb-4">
            <HeartPulse className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl font-semibold text-gray-800">
              Workplace flexibility, health, and caregiving accommodations
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.accommodations?.map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-emerald-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                {item.bullets && (
                  <ul className="text-xs text-gray-700 list-disc ml-4 space-y-1">
                    {item.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Note about future data-driven recommendations */}
        {recommendation && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start space-x-3">
            <ArrowRight className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-purple-900 mb-1">AI/Backend Recommendation</h3>
              <p className="text-sm text-purple-800">{recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

