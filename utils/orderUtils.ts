import { ServiceOrder } from '../types';

/**
 * Compara profundamente duas Ordens de Serviço para determinar se houve
 * alguma alteração real nos dados relevantes salvos na nuvem.
 * Evita tráfego e sincronizações redundantes com o Supabase quando
 * o usuário apenas abre a O.S. e salva sem alterar nada.
 */
export function areServiceOrdersEqual(a: ServiceOrder, b: ServiceOrder): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id) return false;

  // Strings principais
  if ((a.customerName || '').trim() !== (b.customerName || '').trim()) return false;
  if ((a.phoneNumber || '').trim() !== (b.phoneNumber || '').trim()) return false;
  if ((a.address || '').trim() !== (b.address || '').trim()) return false;
  if ((a.deviceBrand || '').trim() !== (b.deviceBrand || '').trim()) return false;
  if ((a.deviceModel || '').trim() !== (b.deviceModel || '').trim()) return false;
  if ((a.defect || '').trim() !== (b.defect || '').trim()) return false;
  if ((a.repairDetails || '').trim() !== (b.repairDetails || '').trim()) return false;
  if ((a.status || '') !== (b.status || '')) return false;
  if ((a.entryDate || '').trim() !== (b.entryDate || '').trim()) return false;
  if ((a.exitDate || '').trim() !== (b.exitDate || '').trim()) return false;
  if ((a.signature || '') !== (b.signature || '')) return false;
  if ((a.partSupplierId || '') !== (b.partSupplierId || '')) return false;
  if ((a.partSupplierWarranty || '') !== (b.partSupplierWarranty || '')) return false;
  if ((a.customerId || '') !== (b.customerId || '')) return false;
  if ((a.publicNotes || '').trim() !== (b.publicNotes || '').trim()) return false;
  if ((a.technicianId || '') !== (b.technicianId || '')) return false;
  if ((a.sellerId || '') !== (b.sellerId || '')) return false;
  if ((a.paymentMethod || '') !== (b.paymentMethod || '')) return false;

  // Numéricos (com coerção para garantir que '0' e 0 ou null e 0 sejam iguais)
  if (Number(a.partsCost || 0) !== Number(b.partsCost || 0)) return false;
  if (Number(a.serviceCost || 0) !== Number(b.serviceCost || 0)) return false;
  if (Number(a.total || 0) !== Number(b.total || 0)) return false;
  if (Number(a.paymentInstallments || 0) !== Number(b.paymentInstallments || 0)) return false;

  // Booleans
  if (Boolean(a.isTrackingEnabled !== false) !== Boolean(b.isTrackingEnabled !== false)) return false;
  if (Boolean(a.isDeleted) !== Boolean(b.isDeleted)) return false;

  // Arrays: Fotos
  const aPhotos = a.photos || [];
  const bPhotos = b.photos || [];
  if (aPhotos.length !== bPhotos.length) return false;
  for (let i = 0; i < aPhotos.length; i++) {
    if (aPhotos[i] !== bPhotos[i]) return false;
  }

  // Arrays: Fotos Finais
  const aFinPhotos = a.finishedPhotos || [];
  const bFinPhotos = b.finishedPhotos || [];
  if (aFinPhotos.length !== bFinPhotos.length) return false;
  for (let i = 0; i < aFinPhotos.length; i++) {
    if (aFinPhotos[i] !== bFinPhotos[i]) return false;
  }

  // Arrays: Checklist
  const aChecklist = a.checklist || [];
  const bChecklist = b.checklist || [];
  if (aChecklist.length !== bChecklist.length) return false;
  const sortedA = [...aChecklist].sort();
  const sortedB = [...bChecklist].sort();
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }

  // Testes diagnósticos (JSON)
  const aDiag = a.diagnosticTests ? JSON.stringify(a.diagnosticTests) : '';
  const bDiag = b.diagnosticTests ? JSON.stringify(b.diagnosticTests) : '';
  if (aDiag !== bDiag) return false;

  return true;
}

/**
 * Filtra de uma nova lista de ordens apenas as que realmente foram criadas ou alteradas
 * em comparação com a lista anterior.
 */
export function getChangedOrders(prevOrders: ServiceOrder[], nextOrders: ServiceOrder[]): ServiceOrder[] {
  const prevMap = new Map<string, ServiceOrder>();
  for (const o of prevOrders) {
    prevMap.set(o.id, o);
  }

  const changed: ServiceOrder[] = [];
  for (const newOrder of nextOrders) {
    const oldOrder = prevMap.get(newOrder.id);
    if (!oldOrder) {
      // Nova OS criada!
      changed.push(newOrder);
    } else if (!areServiceOrdersEqual(oldOrder, newOrder)) {
      // OS existente sofreu alterações reais!
      changed.push(newOrder);
    }
  }

  return changed;
}
