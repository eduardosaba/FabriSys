import { describe, it, expect } from 'vitest';

// Simulação da lógica de verificação de permissões do Sidebar
const MENU_HIERARCHY: Record<string, string[]> = {
  acertos_rapidos: [
    'lancar_turno',
    'auditoria_geral',
    'fechamento_diario',
    'conciliacao_bancaria',
    'ranking_produtos',
  ],
  producao: [
    'fabrica_dashboard',
    'producao_kanban',
    'ordens_producao',
    'produtos',
    'ficha_tecnica',
    'estoque_fabrica',
  ],
  pdv: ['pdv_caixa', 'pdv_controle_caixa', 'pdv_recebimento', 'pdv_inventario'],
  configuracoes: [
    'configuracoes_sistema',
    'configuracoes_permissoes',
    'configuracoes_customizacao',
    'configuracoes_lojas',
    'configuracoes_promocoes',
    'configuracoes_usuarios',
    'configuracoes_metas',
    'configuracoes_fidelidade',
  ],
};

const DEFAULT_PERMISSOES: Record<string, string[]> = {
  master: ['all'],
  admin: ['all'],
  express: [
    'acertos_rapidos',
    'lancar_turno',
    'fechamento_diario',
    'auditoria_geral',
    'conciliacao_bancaria',
    'ranking_produtos',
    'produtos',
    'agenda',
    'ajuda',
  ],
  pdv_simples: ['acertos_rapidos', 'lancar_turno', 'pdv', 'pdv_caixa', 'agenda'],
  user: [],
};

interface TestItem {
  id: string;
  name: string;
  href: string;
  allowedRoles?: string[];
  children?: Array<{ id: string; name: string; href: string; allowedRoles?: string[] }>;
}

const mockSidebarItems: TestItem[] = [
  {
    id: 'acertos_rapidos',
    name: 'Acertos & PDVs',
    href: '/dashboard/acerto-diario/auditoria',
    children: [
      { id: 'auditoria_geral', name: 'Painel', href: '/dashboard/acerto-diario/auditoria' },
      { id: 'lancar_turno', name: 'Controles PDV', href: '/dashboard/acerto-diario' },
    ],
  },
  {
    id: 'producao',
    name: 'Fábrica',
    href: '/dashboard/producao',
    allowedRoles: ['fabrica', 'admin', 'master', 'express'],
    children: [
      { id: 'produtos', name: 'Produtos Finais', href: '/dashboard/producao/produtos' },
      { id: 'ficha_tecnica', name: 'Fichas', href: '/dashboard/producao/fichas-tecnicas' },
    ],
  },
  {
    id: 'pdv',
    name: 'PDV & Lojas',
    href: '/dashboard/pdv',
    allowedRoles: ['pdv', 'admin', 'master', 'express', 'pdv_simples'],
    children: [
      { id: 'pdv_caixa', name: 'Frente de Caixa', href: '/dashboard/pdv/caixa' },
      {
        id: 'pdv_controle_caixa',
        name: 'Controle de Caixa',
        href: '/dashboard/pdv/controle-caixa',
      },
    ],
  },
  {
    id: 'configuracoes',
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    allowedRoles: ['admin', 'master', 'express', 'pdv_simples', 'gerente'],
    children: [
      {
        id: 'configuracoes_lojas',
        name: 'Cadastro de Lojas',
        href: '/dashboard/configuracoes/lojas',
      },
      { id: 'configuracoes_sistema', name: 'Sistema', href: '/dashboard/configuracoes/sistema' },
    ],
  },
];

function evaluateVisibleMenu(role: string, permissoes: Record<string, string[]>): TestItem[] {
  const rolePerms =
    permissoes[role] !== undefined ? permissoes[role] : DEFAULT_PERMISSOES[role] || [];

  const hasAccess = (item: TestItem): boolean => {
    if (role === 'admin' || role === 'master') return true;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    if (rolePerms.includes('all')) return true;

    const moduleId = item.id;
    const hasDirectAccess = rolePerms.includes(moduleId);

    if (item.children && item.children.length > 0) {
      const hasVisibleChild = item.children.some((child) => {
        if (child.allowedRoles && !child.allowedRoles.includes(role)) return false;
        return rolePerms.includes(child.id);
      });

      if (moduleId === 'pdv') {
        return hasDirectAccess && hasVisibleChild;
      }

      return hasDirectAccess || hasVisibleChild;
    }

    return hasDirectAccess;
  };

  return mockSidebarItems
    .filter(hasAccess)
    .map((item) => {
      const filteredChildren = item.children?.filter((child) => {
        if (role === 'admin' || role === 'master') return true;
        if (child.allowedRoles && !child.allowedRoles.includes(role)) return false;
        if (rolePerms.includes('all')) return true;
        return rolePerms.includes(child.id);
      });

      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter((item) => {
      if (item.children && item.children.length === 0) {
        return false;
      }
      return true;
    });
}

// Simulação da função de toggle de permissões com hierarquia
function togglePermissao(
  perfil: string,
  moduloId: string,
  permissoesAtuais: Record<string, string[]>
): Record<string, string[]> {
  const acessosAtuais = permissoesAtuais[perfil] || [];
  const temAcesso = acessosAtuais.includes(moduloId);

  let novosAcessos: string[];
  if (moduloId in MENU_HIERARCHY) {
    const filhos = MENU_HIERARCHY[moduloId];
    if (temAcesso) {
      novosAcessos = acessosAtuais.filter((id) => id !== moduloId && !filhos.includes(id));
    } else {
      novosAcessos = [...acessosAtuais, moduloId];
    }
  } else {
    if (temAcesso) {
      novosAcessos = acessosAtuais.filter((id) => id !== moduloId);
    } else {
      novosAcessos = [...acessosAtuais, moduloId];
      for (const [pai, filhos] of Object.entries(MENU_HIERARCHY)) {
        if (filhos.includes(moduloId) && !novosAcessos.includes(pai)) {
          novosAcessos.push(pai);
        }
      }
    }
  }

  return { ...permissoesAtuais, [perfil]: novosAcessos };
}

describe('Sidebar Permissions para Perfil Express', () => {
  it('DEFAULT_PERMISSOES não deve conter pdv nem configuracoes_lojas para express', () => {
    expect(DEFAULT_PERMISSOES.express).not.toContain('pdv');
    expect(DEFAULT_PERMISSOES.express).not.toContain('pdv_caixa');
    expect(DEFAULT_PERMISSOES.express).not.toContain('pdv_controle_caixa');
    expect(DEFAULT_PERMISSOES.express).not.toContain('configuracoes_lojas');
    expect(DEFAULT_PERMISSOES.express).toContain('acertos_rapidos');
    expect(DEFAULT_PERMISSOES.express).toContain('produtos');
  });

  it('No perfil express padrão, PDV & Lojas e Configurações não devem aparecer no menu', () => {
    const visible = evaluateVisibleMenu('express', {});
    const ids = visible.map((v) => v.id);

    expect(ids).toContain('acertos_rapidos');
    expect(ids).toContain('producao');
    expect(ids).not.toContain('pdv');
    expect(ids).not.toContain('configuracoes');
  });

  it('Se o banco tiver customPerms para express sem pdv e sem lojas, não devem aparecer no menu', () => {
    const customDbPerms = {
      express: [
        'acertos_rapidos',
        'lancar_turno',
        'fechamento_diario',
        'auditoria_geral',
        'produtos',
        'agenda',
      ],
    };

    const visible = evaluateVisibleMenu('express', customDbPerms);
    const ids = visible.map((v) => v.id);

    expect(ids).not.toContain('pdv');
    expect(ids).not.toContain('configuracoes');
    expect(ids).toContain('acertos_rapidos');
  });

  it('Se o usuário desmarcar PDV (menu), cascade desmarca pdv e todos os seus filhos', () => {
    const estadoInicial = {
      express: ['acertos_rapidos', 'pdv', 'pdv_caixa', 'pdv_controle_caixa'],
    };

    const atualizado = togglePermissao('express', 'pdv', estadoInicial);
    expect(atualizado.express).not.toContain('pdv');
    expect(atualizado.express).not.toContain('pdv_caixa');
    expect(atualizado.express).not.toContain('pdv_controle_caixa');
    expect(atualizado.express).toContain('acertos_rapidos');

    const visible = evaluateVisibleMenu('express', atualizado);
    const ids = visible.map((v) => v.id);
    expect(ids).not.toContain('pdv');
  });

  it('Se o usuário marcar pdv_caixa, automaticamente inclui o menu pai pdv', () => {
    const estadoInicial = {
      express: ['acertos_rapidos'],
    };

    const atualizado = togglePermissao('express', 'pdv_caixa', estadoInicial);
    expect(atualizado.express).toContain('pdv_caixa');
    expect(atualizado.express).toContain('pdv');

    const visible = evaluateVisibleMenu('express', atualizado);
    const ids = visible.map((v) => v.id);
    expect(ids).toContain('pdv');
    const pdvItem = visible.find((v) => v.id === 'pdv');
    expect(pdvItem?.children?.map((c) => c.id)).toContain('pdv_caixa');
    expect(pdvItem?.children?.map((c) => c.id)).not.toContain('pdv_controle_caixa');
  });

  it('Se configuracoes_lojas estiver desmarcado, Configurações não deve aparecer para express', () => {
    const permissoesSemLojas = {
      express: ['acertos_rapidos', 'produtos'],
    };

    const visible = evaluateVisibleMenu('express', permissoesSemLojas);
    const ids = visible.map((v) => v.id);
    expect(ids).not.toContain('configuracoes');
  });

  it('Admin e Master continuam vendo todos os menus mesmo que desmarcados em express', () => {
    const permissoesRestritas = {
      express: ['acertos_rapidos'],
    };

    const visibleAdmin = evaluateVisibleMenu('admin', permissoesRestritas);
    const adminIds = visibleAdmin.map((v) => v.id);
    expect(adminIds).toContain('pdv');
    expect(adminIds).toContain('configuracoes');
    expect(adminIds).toContain('producao');
    expect(adminIds).toContain('acertos_rapidos');
  });
});
