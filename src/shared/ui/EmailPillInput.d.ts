import { FC } from "react";

export interface EmailPillInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  mode?: "light" | "dark";
  className?: string;
}

declare const EmailPillInput: FC<EmailPillInputProps>;
export default EmailPillInput;
