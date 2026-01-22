import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IntakeForm = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [aiResponse, setAiResponse] = useState('');
  const navigate = useNavigate();

  const questions = [
    {
      id: 'name',
      question: 'What is your name?',
      type: 'text',
      placeholder: 'Enter your full name',
      aiPrompt: 'Please introduce yourself'
    },
    {
      id: 'familySize',
      question: 'How many people are in your household?',
      type: 'number',
      placeholder: 'Number of people',
      aiPrompt: 'Tell me about your household size'
    },
    {
      id: 'hasChildren',
      question: 'Do you have children or dependents?',
      type: 'radio',
      options: ['Yes', 'No'],
      followUp: 'hasChildren',
      aiPrompt: 'Do you have any children or dependents?'
    },
    {
      id: 'childrenAges',
      question: 'What are the ages of your children?',
      type: 'text',
      placeholder: 'e.g., 5, 8, 12',
      showIf: (resp) => resp.hasChildren === 'Yes',
      aiPrompt: 'What ages are your children?'
    },
    {
      id: 'housingStatus',
      question: 'What is your current housing situation?',
      type: 'radio',
      options: [
        'Lost my home completely',
        'Home damaged but standing',
        'Evacuated but home intact',
        'Staying with family/friends',
        'In temporary shelter',
        'Other'
      ],
      aiPrompt: 'Describe your current housing situation'
    },
    {
      id: 'employmentStatus',
      question: 'What is your current employment status?',
      type: 'radio',
      options: [
        'Currently employed',
        'Lost job due to evacuation',
        'Self-employed',
        'Unemployed',
        'Retired',
        'Unable to work'
      ],
      aiPrompt: 'What is your employment status?'
    },
    {
      id: 'hasInsurance',
      question: 'Do you have homeowners or renters insurance?',
      type: 'radio',
      options: ['Yes - Homeowners', 'Yes - Renters', 'No'],
      aiPrompt: 'Do you have insurance coverage?'
    },
    {
      id: 'financialConcerns',
      question: 'What are your biggest financial concerns right now?',
      type: 'checkbox',
      options: [
        'Immediate housing costs',
        'Lost income',
        'Medical expenses',
        'Childcare costs',
        'Food and essentials',
        'Insurance deductibles',
        'Rebuilding costs'
      ],
      aiPrompt: 'What financial challenges are you facing?'
    },
    {
      id: 'priorityNeeds',
      question: 'What support do you need most urgently?',
      type: 'checkbox',
      options: [
        'Permanent housing',
        'Temporary shelter',
        'School enrollment for children',
        'Childcare services',
        'Job placement',
        'Insurance guidance',
        'Mental health support',
        'Legal assistance'
      ],
      aiPrompt: 'What are your most urgent needs?'
    },
    {
      id: 'additionalInfo',
      question: 'Is there anything else you\'d like us to know about your situation?',
      type: 'textarea',
      placeholder: 'Share any additional details that might help us support you better...',
      aiPrompt: 'Is there anything else important we should know?'
    }
  ];

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
        name: `Thank you, ${value}. I'm here to help guide you through this difficult time.`,
        familySize: value > 1 
          ? `I understand you have ${value} people in your household. We'll make sure to consider everyone's needs.`
          : `I'll help you find the support you need during this recovery.`,
        hasChildren: value === 'Yes'
          ? `I see you have children. We'll make sure to connect you with school enrollment and childcare resources.`
          : `Understood. We'll focus on your specific recovery needs.`,
        housingStatus: `Thank you for sharing. ${value === 'Lost my home completely' ? 'I\'m so sorry for your loss. We have resources to help you find both temporary and permanent housing.' : 'We\'ll help you navigate your housing options.'}`,
        default: `Thank you for sharing that information. This helps me understand how to best support you.`
      };
      
      setAiResponse(aiResponses[currentQuestion.id] || aiResponses.default);
    }, 500);
  };

  const handleNext = () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
      setAiResponse('');
    } else {
      // Complete intake and generate user profile
      const profile = generateUserProfile(responses);
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

  const generateUserProfile = (responses) => {
    return {
      name: responses.name,
      familySize: responses.familySize,
      hasChildren: responses.hasChildren === 'Yes',
      childrenAges: responses.childrenAges,
      housingStatus: responses.housingStatus,
      needsHousing: ['Lost my home completely', 'Home damaged but standing', 'In temporary shelter', 'Staying with family/friends'].includes(responses.housingStatus),
      needsEmployment: ['Lost job due to evacuation', 'Unemployed'].includes(responses.employmentStatus),
      hasInsurance: responses.hasInsurance?.includes('Yes'),
      insuranceType: responses.hasInsurance,
      financialConcerns: responses.financialConcerns || [],
      priorityNeeds: responses.priorityNeeds || [],
      additionalInfo: responses.additionalInfo,
      completedAt: new Date().toISOString()
    };
  };

  const canProceed = () => {
    const answer = responses[currentQuestion.id];
    if (!answer) return false;
    if (currentQuestion.type === 'checkbox') return answer.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
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
              placeholder={currentQuestion.placeholder}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
          )}

          {currentQuestion.type === 'number' && (
            <input
              type="number"
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              min="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
          )}

          {currentQuestion.type === 'textarea' && (
            <textarea
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
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
                  onClick={() => handleAnswer(option)}
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