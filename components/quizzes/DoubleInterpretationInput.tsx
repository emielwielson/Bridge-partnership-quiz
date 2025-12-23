'use client'

interface DoubleInterpretationInputProps {
  options: string[]
  value: { option: string } | null
  onChange: (value: { option: string }) => void
  disabled?: boolean
}

export default function DoubleInterpretationInput({
  options,
  value,
  onChange,
  disabled = false,
}: DoubleInterpretationInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {options.map((option) => (
        <label
          key={option}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            border: `2px solid ${value?.option === option ? '#0070f3' : '#ddd'}`,
            borderRadius: '8px',
            backgroundColor: value?.option === option ? '#e3f2fd' : '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <input
            type="radio"
            name="double-interpretation"
            value={option}
            checked={value?.option === option}
            onChange={() => onChange({ option })}
            disabled={disabled}
            style={{
              marginRight: '0.75rem',
              width: '1.2rem',
              height: '1.2rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
          <span style={{ fontSize: '1.1rem', fontWeight: value?.option === option ? 'bold' : 'normal' }}>
            {option}
          </span>
        </label>
      ))}
    </div>
  )
}

