import React from 'react';
import { AppSettings, Customer, ServiceOrder } from '../../types';
import { NfseManager } from '../NfseManager';

interface NfseSectionProps {
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  serviceOrders: ServiceOrder[];
  customers: Customer[];
  tenantId?: string;
  onBack?: () => void;
}

export const NfseSection: React.FC<NfseSectionProps> = ({
  settings,
  setSettings,
  serviceOrders,
  customers,
  tenantId,
  onBack = () => {}
}) => {
  return (
    <div className="space-y-4">
      <NfseManager
        settings={settings}
        setSettings={setSettings}
        serviceOrders={serviceOrders}
        customers={customers}
        tenantId={tenantId}
        onBack={onBack}
      />
    </div>
  );
};
