import React from 'react';
import { IntakeForm } from '../components/IntakeForm';

export default function Intake({ onComplete }) {
  return <IntakeForm onComplete={onComplete} />;
}