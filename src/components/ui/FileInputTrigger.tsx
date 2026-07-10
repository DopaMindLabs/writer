import { useRef, type ChangeEvent, type ReactNode } from 'react';

export interface FileInputTriggerProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onPick: (files: File[]) => void;
  children: (open: () => void) => ReactNode;
  'data-testid'?: string;
}

export const FileInputTrigger = ({
  accept,
  multiple = false,
  disabled = false,
  onPick,
  children,
  'data-testid': testId,
}: FileInputTriggerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length > 0) onPick(files);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        data-testid={testId}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      {children(open)}
    </>
  );
};
