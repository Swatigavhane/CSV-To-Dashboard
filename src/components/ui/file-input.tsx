import * as React from 'react';

export interface FileInputProps {
    accept?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement>;
}

export function FileInput({ accept, onChange, inputRef }: FileInputProps) {
    return (
        <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onChange}
            className="hidden"
        />
    );
}
