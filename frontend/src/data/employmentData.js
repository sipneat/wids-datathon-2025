export const defaultEmploymentPageConfig = {
  title: 'Employment Support',
  description: 'Understand your job options, timelines, and support after a wildfire',
};

export const defaultEmploymentInputs = {
  jobStatusOptions: [
    { value: 'open', label: 'My workplace is open and operating' },
    { value: 'uncertain', label: 'My workplace is in a smoky / closed area, future is uncertain' },
    { value: 'closed', label: 'My workplace is closed due to the fire' },
  ],
  healthConstraintOptions: [
    { value: 'none', label: 'No major health constraints' },
    { value: 'moderate', label: 'Some conditions; smoke/air quality is a concern' },
    { value: 'high', label: 'Serious health constraints; must avoid smoke / poor air' },
  ],
  caregivingOptions: [
    { value: 'none', label: 'No major caregiving responsibilities' },
    { value: 'moderate', label: 'Some caregiving (children, elders, others)' },
    { value: 'high', label: 'High caregiving load or single caregiver' },
  ],
};

export const defaultEmploymentResources = {
  workplaceClosed: [
    {
      title: 'Immediate Job Search',
      description:
        'Connect with local workforce centers and online job boards focused on disaster-affected workers.',
      links: [
        'State workforce agency job portal',
        'Local workforce development board',
        'National job boards with remote filters enabled',
      ],
    },
    {
      title: 'Income Bridge Programs',
      description:
        'Explore unemployment insurance, disaster unemployment assistance, and short-term grant programs.',
      links: [
        'Disaster Unemployment Assistance (DUA)',
        'State unemployment insurance office',
        'Local nonprofit emergency cash assistance',
      ],
    },
  ],
  retraining: [
    {
      title: 'Short-Term Retraining',
      description:
        'Programs that help you learn new skills in weeks to months, often with tuition assistance for disaster survivors.',
      links: [
        'Community college certificate programs',
        'Online bootcamps with scholarships',
        'State-funded rapid retraining initiatives',
      ],
    },
    {
      title: 'Interview & Resume Support',
      description:
        'Free coaching for updating your resume, practicing interviews, and explaining wildfire-related gaps.',
      links: [
        'Workforce center resume workshop',
        'Nonprofit career coaching',
        'Online resume and interview prep tools',
      ],
    },
  ],
  accommodations: [
    {
      title: 'Workplace Flexibility & Accommodations',
      description:
        'Guidance on requesting remote work, flexible hours, or temporary reassignment due to caregiving or health constraints.',
      bullets: [
        'Document your needs (health notes, caregiving schedule, evacuation orders).',
        'Ask about temporary remote work, flexible shifts, or alternate worksites.',
        'If applicable, reference ADA / state disability rights when requesting accommodations.',
      ],
    },
    {
      title: 'Caregiver Pressure',
      description:
        'Strategies to talk with employers about flexible schedules, job sharing, or temporary leave when caring for family.',
      bullets: [
        'Clarify what hours you are realistically available.',
        'Ask about temporary schedule changes or part-time options.',
        'Explore job-protected leave options if available in your region.',
      ],
    },
  ],
};

export const defaultReopeningInference = {
  open: {
    label: 'Likely to stay open, but disruptions possible',
    description:
      'Your workplace is currently operating. Expect occasional closures for air quality or safety checks, but long-term closure is less likely unless directly damaged.',
  },
  uncertain: {
    label: 'Uncertain reopening window',
    description:
      'If your workplace is inside a smoky or closed area, reopenings often follow neighborhood access and air-quality improvements. This can range from a few weeks to several months.',
  },
  closed: {
    label: 'High risk of prolonged closure',
    description:
      'Workplaces directly damaged by fire or in heavily restricted zones may take many months to rebuild or may not reopen. It may be safer to plan for transition while monitoring updates.',
  },
};

