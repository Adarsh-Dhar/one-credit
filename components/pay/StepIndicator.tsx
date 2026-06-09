import { Step } from '@/hooks/usePayFlow';

export function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = [Step.CATEGORY, Step.MERCHANT, Step.AMOUNT, Step.ANALYZING, Step.APPROVAL, Step.SUCCESS];
  const current = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1 mb-10">
      {steps.slice(0, 5).map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`h-1.5 rounded-full w-full transition-all duration-500
            ${i <= current ? 'bg-[#C5AA67]' : 'bg-[#261B0E]'}`} />
        </div>
      ))}
    </div>
  );
}
