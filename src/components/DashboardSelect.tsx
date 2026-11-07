 'use client';
import {Children, Fragment, isValidElement, type ReactNode} from 'react';
import SearchableSelect, {type SearchableSelectOption} from './SearchableSelect';

type OptionProps = { children?: ReactNode; label?: string; value?: string | number; disabled?: boolean };
function optionsFrom(children: ReactNode, group?: string): SearchableSelectOption[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<OptionProps>(child)) return [];
    const props = child.props;
    if (child.type === 'optgroup' || child.type === Fragment) return optionsFrom(props.children, props.label || group);
    if (child.type !== 'option') return [];
    const label = Children.toArray(props.children).join('');
    return [{value: String(props.value ?? label), label, sublabel: group, disabled: props.disabled}];
  });
}
export default function DashboardSelect({children, value, disabled, id, className, onChange, 'aria-label': ariaLabel}: {
  children: ReactNode; value?: string | number; disabled?: boolean; id?: string; className?: string; 'aria-label'?: string;
  onChange: (event: {target: {value: string}}) => void;
}) {
  const options = optionsFrom(children);
  return <SearchableSelect id={id} ariaLabel={ariaLabel} options={options} value={String(value ?? '')} disabled={disabled}
    className={className?.split(/\s+/).filter(c => /^(?:m[tlrbxy]?-|max-w-|min-w-)/.test(c)).join(' ')}
    onChange={selected => onChange({target: {value: selected}})}/>;
}
