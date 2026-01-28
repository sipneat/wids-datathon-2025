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
