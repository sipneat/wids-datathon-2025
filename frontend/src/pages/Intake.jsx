import { IntakeForm } from '../components/IntakeForm';

export default function Intake({ onComplete }) {
  const handleIntakeComplete = (profile) => {
    if (onComplete) {
      onComplete(profile);
    }
  };

  return <IntakeForm onComplete={handleIntakeComplete} />;
}