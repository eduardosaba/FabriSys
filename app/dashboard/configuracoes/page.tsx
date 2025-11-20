'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/Button';
import CustomizacaoTab from './CustomizacaoTab';
import PageHeader from '@/components/ui/PageHeader';
import { Settings } from 'lucide-react';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'sistema' | 'customizacao'>('customizacao');

  return (
    <div className="container space-y-6 py-6">
      <PageHeader
        title="Configurações"
        description="Personalize a aparência e comportamento do sistema"
        icon={Settings}
      />

      <div className="flex gap-2 border-b pb-2">
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
