import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Home as HomeIcon, School, Baby, DollarSign, MapPin, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../services/firebase';
import { getUserIntake, submitIntake } from '../services/routes';
import { INTAKE_QUESTIONS, buildProfileFromResponses } from '../shared/intakeConfig';

export default function Dashboard({ userProfile: initialUserProfile }) {
  const initialProfile = useMemo(() => initialUserProfile || {}, [initialUserProfile]);
  const [actionStatuses, setActionStatuses] = useState({});
  const [intakeResponses, setIntakeResponses] = useState(null);
  const [draftResponses, setDraftResponses] = useState({});
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [isSavingIntake, setIsSavingIntake] = useState(false);
  const [isLoadingIntake, setIsLoadingIntake] = useState(true);
  const [intakeError, setIntakeError] = useState('');

  const intakeQuestions = INTAKE_QUESTIONS;

  const derivedProfile = useMemo(() => buildProfileFromResponses(draftResponses), [draftResponses]);
  const userProfile = useMemo(() => ({ ...initialProfile, ...derivedProfile }), [initialProfile, derivedProfile]);

  useEffect(() => {
    const loadIntake = async () => {
      setIsLoadingIntake(true);
      setIntakeError('');
      try {
        const user = auth.currentUser;
        if (!user) {
          setIntakeResponses({});
          setDraftResponses({});
          return;
        }

        const data = await getUserIntake(user.uid);
        const responses = data?.responses || {};
        setIntakeResponses(responses);
        setDraftResponses(responses);
      } catch (error) {
        console.error('Error loading intake responses:', error);
        setIntakeError('Unable to load intake answers right now.');
      } finally {
        setIsLoadingIntake(false);
      }
    };

    loadIntake();
  }, []);

  const visibleIntakeQuestions = intakeQuestions.filter((q) => !q.showIf || q.showIf(draftResponses));

  const renderAnswer = (value) => {
    if (value == null || value === '') return 'Not answered';
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not answered';
    return String(value);
  };

  const handleDraftChange = (question, value) => {
    setDraftResponses((prev) => ({
      ...prev,
      [question.id]: value
    }));
  };

  const handleSaveIntake = async () => {
    try {
      setIsSavingIntake(true);
      const user = auth.currentUser;
      if (!user) {
        setIntakeError('Please log in again to save updates.');
        return;
      }

      await submitIntake({
        userId: user.uid,
        payload: {
          userId: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          responses: draftResponses,
          profile: userProfile,
          submittedAt: new Date().toISOString()
        }
      });

      setIntakeResponses(draftResponses);
      setIsEditingIntake(false);
      setIntakeError('');
    } catch (error) {
      console.error('Error saving intake updates:', error);
      setIntakeError('Unable to save your updated answers.');
    } finally {
      setIsSavingIntake(false);
    }
  };

  const handleCancelIntakeEdit = () => {
    setDraftResponses(intakeResponses || {});
    setIsEditingIntake(false);
    setIntakeError('');
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleActionClick = async (actionId, currentStatus) => {
    // Cycle through statuses: not-started -> in-progress -> completed
    const statusFlow = {
      'not-started': 'in-progress',
      'in-progress': 'completed',
      'completed': 'completed'
    };

    const newStatus = statusFlow[currentStatus || 'not-started'];

    setActionStatuses(prev => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        actionId,
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const getActionStatus = (actionId) => {
    return actionStatuses[actionId]?.status || 'not-started';
  };

  const priorityActions = [
    userProfile?.needsHousing && {
      id: 'housing',
      icon: MapPin,
      title: 'Find Housing',
      description: 'Explore temporary and permanent housing options',
      link: '/housing',
      priority: 'high'
    },
    userProfile?.hasChildren && {
      id: 'school-enrollment',
      icon: School,
      title: 'Enroll Children in School',
      description: 'Get help with school enrollment and transfers',
      link: '/schools',
      priority: 'high'
    },
    {
      id: 'insurance-claim',
      icon: DollarSign,
      title: 'File Insurance Claim',
      description: 'Navigate your insurance process',
      link: '/insurance',
      priority: 'high'
    },
    userProfile?.needsEmployment && {
      id: 'employment',
      icon: Briefcase,
      title: 'Employment Support',
      description: 'Find job placement and career resources',
      link: '/employment',
      priority: 'medium'
    },
    
  ].filter(Boolean);

  return (
    <Layout userProfile={userProfile}>
      <div className="dashboard-shell">
        {/* Welcome Section */}
        <div className="bg-linear-to-r from-green-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            {getWelcomeMessage()}, {userProfile?.name || userProfile?.displayName || 'there'}
          </h1>
          <p className="text-green-50 text-lg">
            We're here to support you through every step of your recovery journey.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="dashboard-stat-card">
            <div className="flex items-center space-x-3 mb-2">
              <HomeIcon className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-800">Household Size</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{userProfile?.familySize || 1}</p>
            <p className="text-sm text-gray-600 mt-1">
              {userProfile?.hasChildren ? 'Including children' : 'Adults only'}
            </p>
          </div>

          <div className="dashboard-stat-card">
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Priority Actions</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{priorityActions.filter(a => a.priority === 'high').length}</p>
            <p className="text-sm text-gray-600 mt-1">Items need attention</p>
          </div>

          <div className="dashboard-stat-card">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Insurance Status</h3>
            </div>
            <p className="text-lg font-bold text-gray-900">{userProfile?.insuranceType || 'Not specified'}</p>
            <p className="text-sm text-gray-600 mt-1">
              {userProfile?.hasInsurance ? 'Coverage active' : 'No coverage'}
            </p>
          </div>
        </div>

        {/* Priority Actions */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-title mb-6">Your Priority Actions</h2>
          <div className="space-y-4">
            {priorityActions.map((action, index) => {
              const Icon = action.icon;
              const status = getActionStatus(action.id);
              const isCompleted = status === 'completed';
              const isInProgress = status === 'in-progress';
              
              return (
                <div
                  key={index}
                  className={`block p-5 rounded-xl border-2 transition-all duration-200 ${
                    isCompleted
                      ? 'border-green-200 bg-green-50'
                      : action.priority === 'high'
                      ? 'border-red-200 bg-red-50 hover:border-red-300'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <Link to={action.link} className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-100'
                          : action.priority === 'high' 
                          ? 'bg-red-100' 
                          : 'bg-green-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          isCompleted
                            ? 'text-green-600'
                            : action.priority === 'high' 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{action.title}</h3>
                        <p className="text-gray-600 mt-1">{action.description}</p>
                      </div>
                    </Link>
                    <div className="flex items-center space-x-2 ml-4">
                      {action.priority === 'high' && !isCompleted && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          High Priority
                        </span>
                      )}
                      <button
                        onClick={() => handleActionClick(action.id, status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isCompleted
                            ? 'bg-green-600 text-white cursor-default'
                            : isInProgress
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isCompleted ? '✓ Done' : isInProgress ? 'In Progress' : 'Start'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Your Support Resources */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-title mb-4">Personalized Resources</h2>
          <p className="dashboard-card-subtitle mb-6">
            Based on your intake assessment, here are the support areas we've activated for you:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userProfile?.needsHousing && (
              <div className="dashboard-resource-item">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-gray-800">Housing Assistance</span>
              </div>
            )}
            {userProfile?.hasChildren && (
              <>
                <div className="dashboard-resource-item">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-medium text-gray-800">School Enrollment Support</span>
                </div>
              </>
            )}
            <div className="dashboard-resource-item">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-medium text-gray-800">Insurance Guidance</span>
            </div>
            {userProfile?.needsEmployment && (
              <div className="dashboard-resource-item">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-gray-800">Employment Services</span>
              </div>
            )}
            <div className="dashboard-resource-item">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="font-medium text-gray-800">Community Support</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="dashboard-card-title">Your Intake Answers</h2>
            {!isEditingIntake ? (
              <button
                onClick={() => setIsEditingIntake(true)}
                className="dashboard-btn dashboard-btn-primary"
              >
                Edit Answers
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelIntakeEdit}
                  className="dashboard-btn dashboard-btn-neutral"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIntake}
                  disabled={isSavingIntake}
                  className="dashboard-btn dashboard-btn-success"
                >
                  {isSavingIntake ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <p className="dashboard-card-subtitle mb-6">
            Review your intake form responses and update them anytime.
          </p>

          {isLoadingIntake ? (
            <p className="text-gray-600">Loading intake answers...</p>
          ) : (
            <div className="space-y-5">
              {visibleIntakeQuestions.map((question) => {
                const value = draftResponses[question.id];

                return (
                  <div key={question.id} className="dashboard-intake-item">
                    <p className="font-medium text-gray-900 mb-3">{question.question}</p>

                    {!isEditingIntake && (
                      <p className="text-gray-700">{renderAnswer(value)}</p>
                    )}

                    {isEditingIntake && question.type === 'text' && (
                      <input
                        type="text"
                        className="dashboard-input"
                        value={value || ''}
                        placeholder={question.placeholder || ''}
                        onChange={(e) => handleDraftChange(question, e.target.value)}
                      />
                    )}

                    {isEditingIntake && question.type === 'number' && (
                      <input
                        type="number"
                        className="dashboard-input"
                        value={value || ''}
                        placeholder={question.placeholder || ''}
                        onChange={(e) => handleDraftChange(question, e.target.value)}
                      />
                    )}

                    {isEditingIntake && question.type === 'radio' && (
                      <div className="space-y-2">
                        {(question.options || []).map((option) => (
                          <label key={option} className="flex items-center gap-2 text-gray-700">
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              checked={value === option}
                              onChange={(e) => handleDraftChange(question, e.target.value)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {isEditingIntake && question.type === 'checkbox' && (
                      <div className="space-y-2">
                        {(question.options || []).map((option) => {
                          const selected = Array.isArray(value) ? value : [];
                          return (
                            <label key={option} className="flex items-center gap-2 text-gray-700">
                              <input
                                type="checkbox"
                                value={option}
                                checked={selected.includes(option)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleDraftChange(question, [...selected, option]);
                                  } else {
                                    handleDraftChange(
                                      question,
                                      selected.filter((item) => item !== option)
                                    );
                                  }
                                }}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {!visibleIntakeQuestions.length && (
                <p className="text-gray-600">No intake answers available yet.</p>
              )}
            </div>
          )}

          {intakeError && (
            <p className="mt-4 text-sm text-red-600">{intakeError}</p>
          )}
        </div>

      </div>
    </Layout>
  );
}