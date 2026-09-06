interface StepIndicatorProps {
  current: number
  steps: { label: string }[]
}

export function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isDone = stepNumber < current
        const isActive = stepNumber === current

        return (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                isActive
                  ? 'bg-sky-500 text-white'
                  : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isDone ? '✓' : stepNumber}
            </div>
            <span
              className={`text-sm font-bold ${
                isActive || isDone ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
            {stepNumber < steps.length && (
              <span className="mx-2 h-1 flex-1 rounded-full bg-slate-200">
                <span
                  className={`block h-1 rounded-full ${
                    isDone ? 'bg-emerald-500' : ''
                  }`}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}