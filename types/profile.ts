export type UserRole = 'master' | 'admin' | 'gerente' | 'compras' | 'fabrica' | 'pdv' | 'user';

export interface Profile {
  id: string;
  role: UserRole;
  local_id?: string;
  nome?: string;
  full_name?: string;
  email?: string;
  telefone?: string;
  organization_id?: string;
  ativo?: boolean;
  status_conta?: string;
  // Avatares e campos auxiliares
  avatar_url?: string;
  foto_url?: string;
  company_logo_url?: string;
  primary_color?: string;
  theme_primary_color?: string;
}

export default Profile;
