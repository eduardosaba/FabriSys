'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/Button';
import ThemeConfigurator from '@/components/ThemeConfigurator';
import CustomizacaoTab from './CustomizacaoTab';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'visual' | 'sistema' | 'customizacao'>('visual');

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'visual' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('visual')}
        >
          Visual
        </Button>
        <Button
          variant={activeTab === 'sistema' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('sistema')}
        >
          Sistema
        </Button>
        <Button
          variant={activeTab === 'customizacao' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('customizacao')}
        >
          Customização
        </Button>
      </div>

      <div className="grid gap-6">
        {activeTab === 'visual' && <ThemeConfigurator />}
        {activeTab === 'customizacao' && <CustomizacaoTab />}
        {activeTab === 'sistema' && (
          <Card>
            <Card.Header>
              <Card.Title>Configurações do Sistema</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-muted-foreground">
                Configure as opções gerais do sistema, como backup, integração com WhatsApp,
                e-mails, etc.
              </p>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
}
