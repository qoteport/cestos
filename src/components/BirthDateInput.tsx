'use client';
import AppDateTimePicker from './AppDateTimePicker';

export default function BirthDateInput({
  value,
  onChange,
  placeholder = 'Select date of birth...',
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <AppDateTimePicker
      mode="date"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}
