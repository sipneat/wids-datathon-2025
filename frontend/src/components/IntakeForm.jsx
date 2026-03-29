import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { submitIntake } from '../services/routes';
import { INTAKE_QUESTIONS, buildProfileFromResponses } from '../shared/intakeConfig';

export const IntakeForm = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [aiResponse, setAiResponse] = useState('');
  const navigate = useNavigate();

  const questions = INTAKE_QUESTIONS;

  const visibleQuestions = questions.filter(q => {
    if (!q.showIf) return true;
    return q.showIf(responses);
  });

  const currentQuestion = visibleQuestions[currentStep];
  const isLastStep = currentStep === visibleQuestions.length - 1;

  const handleAnswer = (value) => {
    setResponses({ ...responses, [currentQuestion.id]: value });
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponses = {
        name: `Thank you, ${value}. I'm here to help guide you.`,
        familySize: value > 1
          ? `Thanks — we’ll consider all ${value} household members.`
          : `Got it. We’ll tailor support to your situation.`,
        state: `Thanks. We’ll focus recommendations for ${value}.`,
        county: `Great. County-level context helps us localize wildfire recovery guidance.`,
        zip_code: `Perfect. ZIP-level detail helps us narrow nearby options when available.`,
        hasChildren: value === 'Yes'
          ? `Understood. We’ll include family-focused resources.`
          : `Okay. We’ll focus on your specific recovery needs.`,
        displacement_status: `Thanks. We’ll align guidance to your displacement stage (${value}).`,
        income_change: `Thanks. We’ll prioritize resources for your income change (${value}).`,
        hasInsurance: `Thanks. Insurance guidance will reflect your coverage.`,
        insurance_claim_status: `Thanks. We’ll tailor next steps to your claim status.`,
        caregiving_needs: `Thanks. We’ll factor caregiving and health constraints in recommendations.`,
        housing_budget: `Thanks. We’ll filter housing options to your budget.`,
        default: `Thanks for sharing — this helps us support you.`
      };
      
      setAiResponse(aiResponses[currentQuestion.id] || aiResponses.default);
    }, 500);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Enter') return;
      if (currentQuestion?.type === 'textarea' && e.shiftKey) return;
      if (!canProceed()) return;
      e.preventDefault();
      handleNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQuestion, responses, currentStep]);

  const handleRadioSelect = (option) => {
    handleAnswer(option);
  };

  const postResponsesToBackend = async (answers, userProfile) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('User must be logged in');
      }
      
      const payload = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        responses: answers,
        profile: userProfile,
        submittedAt: new Date().toISOString()
      };

      const data = await submitIntake({
        userId: user.uid,
        payload
      });
      console.log('Intake responses saved via backend:', data);
      return data;
    } catch (error) {
      console.error('Error saving to backend:', error);
      alert('There was an error saving your responses. Please try again.');
      throw error;
    }
  };

  const handleNext = async () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setAiResponse('');
    } else {
      // Complete intake and generate user profile
      const profile = buildProfileFromResponses(responses);
      
      // Send responses to backend and proceed
      await postResponsesToBackend(responses, profile);
      
      onComplete(profile);
      navigate('/dashboard');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAiResponse('');
    }
  };

  const canProceed = () => {
    const answer = responses[currentQuestion.id];
    if (currentQuestion.id === 'zip_code') return true;
    if (!answer) return false;
    if (currentQuestion.id === 'familySize') {
      const n = Number(answer);
      if (!Number.isFinite(n) || n < 1) return false;
    }
    if (currentQuestion.type === 'checkbox') return answer.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-green-600 to-blue-600 p-6 text-white">
          <h2 className="text-2xl font-semibold">Recovery Intake Assessment</h2>
          <p className="text-green-50 text-sm mt-2">
            Help us understand your needs so we can provide personalized support
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / visibleQuestions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {currentStep + 1} / {visibleQuestions.length}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            {currentQuestion.question}
          </h3>

          {/* Answer Input */}
          {currentQuestion.type === 'text' && (
            <input
              type="text"
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canProceed()) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              placeholder={currentQuestion.placeholder}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
          )}

          {currentQuestion.type === 'number' && (
            <>
              <input
                type="number"
                value={responses[currentQuestion.id] || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    handleAnswer('');
                    return;
                  }
                  const parsed = parseInt(raw, 10);
                  if (Number.isNaN(parsed)) {
                    return;
                  }
                  if (currentQuestion.id === 'familySize') {
                    handleAnswer(Math.max(1, parsed));
                  } else {
                    handleAnswer(Math.max(0, parsed));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canProceed()) {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                placeholder={currentQuestion.placeholder}
                min={currentQuestion.id === 'familySize' ? 1 : 0}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
              {currentQuestion.id === 'familySize' && (
                <p className="text-sm text-gray-500 mt-2">Include yourself in the count.</p>
              )}
            </>
          )}

          {currentQuestion.type === 'textarea' && (
            <textarea
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && canProceed()) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              placeholder={currentQuestion.placeholder}
              rows="5"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg resize-none"
            />
          )}

          {currentQuestion.type === 'radio' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleRadioSelect(option)}
                  className={`w-full px-6 py-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    responses[currentQuestion.id] === option
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-green-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {responses[currentQuestion.id] === option && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'checkbox' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const selected = responses[currentQuestion.id]?.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      const current = responses[currentQuestion.id] || [];
                      const updated = selected
                        ? current.filter(item => item !== option)
                        : [...current, option];
                      handleAnswer(updated);
                    }}
                    className={`w-full px-6 py-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      selected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-green-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {selected && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI Response */}
          {aiResponse && (
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{aiResponse}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Previous</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
              canProceed()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="font-medium">{isLastStep ? 'Complete' : 'Next'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
