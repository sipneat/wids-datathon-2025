import { School, MapPin, Users, Star, Calendar, Phone, Mail, Clock, Award, CheckCircle } from 'lucide-react';

export const defaultSchools = [
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

export const defaultEnrollmentSteps = [
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

export const defaultResources = [
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

export const defaultOnlineOptions = [
  {
    title: 'District Virtual Learning Academy',
    type: 'Local District Program',
    description: 'Full-time online option run by your public school district, with live classes and support for displaced students.',
    gradeLevels: 'K-12',
    cost: 'Free for in-district students',
    timeline: 'Can usually start within 3–7 days of enrollment',
    techSupport: 'Device and hotspot assistance may be available'
  },
  {
    title: 'Statewide Online School',
    type: 'State-Approved Program',
    description: 'Accredited statewide online school for students who cannot immediately return to a physical classroom.',
    gradeLevels: '3-12',
    cost: 'Varies by state; often free for residents',
    timeline: 'Enrollment windows typically every 2–4 weeks',
    techSupport: 'Self-paced with virtual teacher support'
  },
  {
    title: 'Short-Term Online Bridge',
    type: 'Temporary Option',
    description: 'Short-term online coursework to keep students on track while families sort out housing and school placement.',
    gradeLevels: '6-12',
    cost: 'Low-cost or scholarship-based',
    timeline: 'Start within 1–3 days; lasts 4–12 weeks',
    techSupport: 'Focus on core subjects and credit recovery'
  }
];

export const defaultRecoveryPlans = [
  {
    phase: 'First 0–2 weeks',
    focus: 'Safety checks & temporary learning',
    description:
      'District inspects buildings, confirms structural safety, checks air quality, and coordinates with fire officials. Students may be in emergency shelters, community centers, or online only.',
    typicalActions: [
      'District communicates initial status for each school (safe, damaged, closed)',
      'Short-term online learning or learning packets while sites are evaluated',
      'Transportation plans paused or rerouted around closure zones'
    ]
  },
  {
    phase: 'Weeks 2–8',
    focus: 'Temporary relocation & stable routines',
    description:
      'For schools inside the fire radius or with major smoke/water damage, districts often relocate students and teachers to undamaged campuses, shared double sessions, or temporary modular buildings.',
    typicalActions: [
      'Announce which schools are relocating and where (host campuses or temporary sites)',
      'Pair your child’s current school with a “host” school for the rest of the term',
      'Set approximate target date for reopening or re-evaluation'
    ]
  },
  {
    phase: '2–12+ months',
    focus: 'Rebuild & long‑term stability',
    description:
      'Damaged schools are repaired or rebuilt. Districts may keep students at temporary sites for the full school year to avoid multiple moves.',
    typicalActions: [
      'Publish rebuild / major repair timelines by campus',
      'Offer transfers to other local schools outside the fire radius',
      'Coordinate transportation from temporary housing areas to stable “receiving” schools'
    ]
  }
];
