export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
export type TextVariant = 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'small';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: React.ReactNode;
}

export interface TextProps {
  variant?: TextVariant;
  className?: string;
  children: React.ReactNode;
}

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export interface PanelProps {
  className?: string;
  children: React.ReactNode;
}

export interface StatusIconProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  size?: number;
}
