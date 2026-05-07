declare module '@/lib/supabase-service' {
  // minimal declarations to satisfy TypeScript during incremental fixes
  export function getServiceSupabase(...args: any[]): any;
  export function fetchSystemTheme(...args: any[]): any;
}

declare module '@supabase/auth-helpers-nextjs' {
  // provide minimal any-typed exports used in dynamic import
  export function createRouteHandlerClient(opts?: any): any;
  export function createServerComponentClient(opts?: any, config?: any): any;
  export function createServerActionClient(opts?: any): any;
  const _default: any;
  export default _default;
}

declare module '*.module.css';
declare module '*.svg';
