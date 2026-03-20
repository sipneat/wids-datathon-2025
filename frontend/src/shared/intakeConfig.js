export const INTAKE_QUESTIONS = [
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
    id: 'displacement_status',
    question: 'What best describes your current displacement status?',
    type: 'radio',
    options: ['Evacuated', 'Returned home', 'Relocated temporarily', 'Relocated permanently', 'Unsure'],
    aiPrompt: 'Describe your current displacement status'
  },
  {
    id: 'fire_severity',
    question: 'How severe was the fire that affected you?',
    type: 'radio',
    options: [
      'Minor - minimal property damage',
      'Moderate - significant damage but structure intact',
      'Severe - structure destroyed or uninhabitable',
      'Catastrophic - total loss, multiple structures affected'
    ],
    aiPrompt: 'Describe the severity of the fire'
  },
  {
    id: 'fire_radius',
    question: 'What was the approximate radius of the fire (in miles)?',
    type: 'number',
    placeholder: 'e.g., 5',
    aiPrompt: 'Estimate the fire radius in miles'
  },
  {
    id: 'income_change',
    question: 'Has your income changed due to the fire?',
    type: 'radio',
    options: ['No change', 'Reduced hours', 'Temporarily laid off', 'Job lost', 'Self-employed revenue loss'],
    aiPrompt: 'Tell me about any income changes'
  },
  {
    id: 'hasChildren',
    question: 'Do you have children or dependents?',
    type: 'radio',
    options: ['Yes', 'No'],
    aiPrompt: 'Do you have any children or dependents?'
  },
  {
    id: 'school_status',
    question: "What is your children's current school status?",
    type: 'radio',
    options: ['No disruption', 'Enrolled but disrupted', 'Transferring', 'Online/temporary'],
    showIf: (resp) => resp.hasChildren === 'Yes',
    aiPrompt: "Tell me about your children's school status"
  },
  {
    id: 'hasInsurance',
    question: 'Do you have homeowners or renters insurance?',
    type: 'radio',
    options: ['Yes - Homeowners', 'Yes - Renters', 'No'],
    aiPrompt: 'Do you have insurance coverage?'
  },
  {
    id: 'insurance_claim_status',
    question: 'What is your insurance claim status?',
    type: 'radio',
    options: ['Not filed', 'Filed - pending', 'Approved', 'Denied', "Don't know"],
    showIf: (resp) => resp.hasInsurance && resp.hasInsurance !== 'No',
    aiPrompt: 'Have you filed an insurance claim?'
  },
  {
    id: 'caregiving_needs',
    question: 'Do you have caregiving or health constraints?',
    type: 'checkbox',
    options: ['Elder care', 'Disability support', 'Health constraints', 'None'],
    aiPrompt: 'Any caregiving or health constraints we should know?'
  },
  {
    id: 'housing_budget',
    question: 'What is your monthly housing budget (USD)?',
    type: 'number',
    placeholder: 'e.g., 1500',
    aiPrompt: 'What is your monthly housing budget?'
  }
];

export function buildProfileFromResponses(responses = {}) {
  const needsEmployment = ['Reduced hours', 'Temporarily laid off', 'Job lost', 'Self-employed revenue loss'].includes(
    responses.income_change || ''
  );
  const needsHousing = ['Evacuated', 'Relocated temporarily'].includes(responses.displacement_status || '');

  return {
    name: responses.name,
    familySize: responses.familySize,
    hasChildren: responses.hasChildren === 'Yes',
    childrenAges: responses.childrenAges,
    housingStatus: responses.displacement_status,
    needsHousing,
    needsEmployment,
    hasInsurance: typeof responses.hasInsurance === 'string' ? responses.hasInsurance.includes('Yes') : false,
    insuranceType: responses.hasInsurance,
    insuranceClaimStatus: responses.insurance_claim_status,
    caregivingNeeds: responses.caregiving_needs || [],
    housingBudget: responses.housing_budget,
    financialConcerns: responses.financialConcerns || [],
    priorityNeeds: responses.priorityNeeds || [],
    additionalInfo: responses.additionalInfo,
    completedAt: new Date().toISOString()
  };
}
