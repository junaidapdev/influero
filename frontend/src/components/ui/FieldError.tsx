type Props = {
  message?: string;
};

export function FieldError({ message }: Props) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-error-foreground">{message}</p>;
}
