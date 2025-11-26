import React, { useState, useEffect } from 'react';
import { Publisher, PublisherPrivileges, PublisherPrivilegesBySection, PublisherAvailability, AgeGroup } from '../types';
import { generateUUID } from '../lib/utils';


interface PublisherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (publisher: Publisher) => void;
  publisherToEdit: Publisher | null;
  publishers: Publisher[]; // NOVO: Recebe a lista de todos os publicadores
}

const initialFormData: Omit<Publisher, 'id'> = {
    name: '',
    gender: 'brother',
    condition: 'Publicador',
    phone: '',
    isBaptized: true,
    isServing: true,
    ageGroup: 'Adulto',
    parentIds: [],
    isHelperOnly: false,
    canPairWithNonParent: false,
    privileges: {
        canGiveTalks: false,
        canConductCBS: false,
        canReadCBS: false,
        canPray: false,
        canPreside: false,
    },
    privilegesBySection: {
        canParticipateInTreasures: true,
        canParticipateInMinistry: true,
        canParticipateInLife: true,
    },
    availability: {
        mode: 'always',
        exceptionDates: [],
    },
    aliases: [],
};

const PublisherForm: React.FC<PublisherFormProps> = ({ isOpen, onClose, onSave, publisherToEdit, publishers }) => {
  const [formData, setFormData] = useState<Omit<Publisher, 'id'>>(initialFormData);
  const [availabilityDateStr, setAvailabilityDateStr] = useState('');
  const [parentId1, setParentId1] = useState<string>('');
  const [parentId2, setParentId2] = useState<string>('');
  const [aliasesStr, setAliasesStr] = useState('');


  useEffect(() => {
    if (publisherToEdit) {
      const fullData = { ...initialFormData, ...publisherToEdit };
      setFormData(fullData);
      setAvailabilityDateStr(fullData.availability.exceptionDates.join(', '));
      setParentId1(fullData.parentIds?.[0] || '');
      setParentId2(fullData.parentIds?.[1] || '');
      setAliasesStr(fullData.aliases?.join(', ') || '');
    } else {
      setFormData(initialFormData);
      setAvailabilityDateStr('');
      setParentId1('');
      setParentId2('');
      setAliasesStr('');
    }
  }, [publisherToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handlePrivilegeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          privileges: {
              ...prev.privileges,
              [name]: checked
          }
      }));
  }

  const handleSectionPrivilegeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          privilegesBySection: {
              ...prev.privilegesBySection,
              [name]: checked
          }
      }));
  }
  
  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = e.target;
      setFormData(prev => ({
          ...prev,
          availability: {
              ...prev.availability,
              mode: value as 'always' | 'never'
          }
      }));
  };
  
  const handleAvailabilityDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAvailabilityDateStr(e.target.value);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("O nome é obrigatório.");
      return;
    }
    
    const { gender, condition, isBaptized, privileges, privilegesBySection, ageGroup, isHelperOnly } = formData;
    const isAppointed = condition === 'Ancião' || condition === 'Servo Ministerial';

    // Novas validações
    if ((ageGroup === 'Criança' || ageGroup === 'Jovem') && isAppointed) {
        alert("Erro de Validação: Crianças e Jovens não podem ter a condição de Ancião ou Servo Ministerial.");
        return;
    }
    if (isHelperOnly && (privileges.canGiveTalks || privileges.canConductCBS || privileges.canPreside)) {
        alert("Erro de Validação: Publicadores 'Só Ajudante' não podem ter privilégios principais.");
        return;
    }

    // Validações existentes...
    if (gender === 'sister' && condition !== 'Publicador') {
        alert("Erro de Validação: Irmãs só podem ter a condição de 'Publicador'.");
        return;
    }

    if (!isBaptized && isAppointed) {
        alert("Erro de Validação: Publicadores não batizados devem ter a condição de 'Publicador'.");
        return;
    }
    
    if (gender === 'sister') {
        const hasBrotherPrivileges = Object.values(privileges).some(p => p);
        if (hasBrotherPrivileges) {
            alert("Erro de Validação: Irmãs não podem ter privilégios de irmão (presidir, orar, etc.).");
            return;
        }
        if (privilegesBySection.canParticipateInTreasures || privilegesBySection.canParticipateInLife) {
            alert("Erro de Validação: Irmãs com esta condição só podem ser designadas na seção 'Faça Seu Melhor no Ministério'.");
            return;
        }
    }

    if (gender === 'brother') {
        if (isAppointed && !isBaptized) {
            alert("Erro de Validação: Apenas irmãos batizados podem ser designados como Ancião ou Servo Ministerial.");
            return;
        }
        if (condition === 'Ancião' && (!privileges.canPreside || !privileges.canConductCBS)) {
            alert("Erro de Validação: Anciãos devem ter, no mínimo, os privilégios de presidir e dirigir o EBC.");
            return;
        }
        if (condition === 'Servo Ministerial' && privileges.canPreside) {
            alert("Erro de Validação: Servos Ministeriais não podem presidir a reunião.");
            return;
        }
        if (condition === 'Publicador' && (privileges.canPreside || privileges.canConductCBS || privileges.canGiveTalks)) {
            alert("Erro de Validação: Irmãos com a condição de 'Publicador' não podem ter privilégios de presidir, dirigir EBC ou fazer discursos.");
            return;
        }
    }

    if (!isBaptized) {
        const hasAnyPrivilege = Object.values(privileges).some(p => p);
        if (hasAnyPrivilege) {
             alert("Erro de Validação: Publicadores não batizados não podem ter privilégios gerais.");
            return;
        }
        if (privilegesBySection.canParticipateInTreasures || privilegesBySection.canParticipateInLife) {
             alert("Erro de Validação: Publicadores não batizados só podem participar na seção 'Faça Seu Melhor no Ministério'.");
            return;
        }
    }

    const exceptionDates = availabilityDateStr
        .split(',')
        .map(date => date.trim().match(/^\d{4}-\d{2}-\d{2}$/) ? date.trim() : null)
        .filter((date): date is string => date !== null);
        
    const parentIds = [parentId1, parentId2].filter(id => id);
    const aliases = aliasesStr.split(',').map(a => a.trim()).filter(Boolean);

    const publisherData = {
      id: publisherToEdit ? publisherToEdit.id : generateUUID(),
      ...formData,
      parentIds,
      aliases,
      availability: {
          ...formData.availability,
          exceptionDates,
      }
    };
    onSave(publisherData);
    onClose();
  };
  
  const privilegeLabels: Record<keyof PublisherPrivileges, string> = {
    canGiveTalks: 'Pode fazer discursos',
    canConductCBS: 'Pode dirigir EBC',
    canReadCBS: 'Pode ler EBC',
    canPray: 'Pode fazer oração',
    canPreside: 'Pode presidir reunião',
  };
  
   const sectionPrivilegeLabels: Record<keyof PublisherPrivilegesBySection, string> = {
    canParticipateInTreasures: 'Tesouros da Palavra de Deus',
    canParticipateInMinistry: 'Faça Seu Melhor no Ministério',
    canParticipateInLife: 'Nossa Vida Cristã',
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {publisherToEdit ? 'Editar Publicador' : 'Adicionar Publicador'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          <div className="p-6 flex-grow overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              {/* --- COLUNA 1: Informações Pessoais e Status --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2">Informações Pessoais</h3>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                  <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black"/>
                </div>
                <div>
                  <label htmlFor="aliases" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apelidos/Nomes Alternativos</label>
                  <input type="text" name="aliases" id="aliases" value={aliasesStr} onChange={(e) => setAliasesStr(e.target.value)} placeholder="Ex: Zé, Chico" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black"/>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use para nomes antigos ou apelidos. Separe com vírgulas.</p>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                  <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black"/>
                </div>
                 <div>
                  <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Faixa Etária</label>
                  <select name="ageGroup" id="ageGroup" value={formData.ageGroup} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                    <option>Adulto</option>
                    <option>Jovem</option>
                    <option>Criança</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="parent1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pai/Mãe 1 (Opcional)</label>
                  <select id="parent1" value={parentId1} onChange={e => setParentId1(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                    <option value="">Nenhum</option>
                    {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="parent2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pai/Mãe 2 (Opcional)</label>
                  <select id="parent2" value={parentId2} onChange={e => setParentId2(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                    <option value="">Nenhum</option>
                    {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2 pt-4">Condição e Status</h3>
                 <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gênero</label>
                  <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                    <option value="brother">Irmão</option>
                    <option value="sister">Irmã</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Condição</label>
                  <select name="condition" id="condition" value={formData.condition} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                    <option>Ancião</option>
                    <option>Servo Ministerial</option>
                    <option>Publicador</option>
                  </select>
                </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start"><div className="flex items-center h-5"><input id="isBaptized" name="isBaptized" type="checkbox" checked={formData.isBaptized} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-2 text-sm"><label htmlFor="isBaptized" className="font-medium text-gray-700 dark:text-gray-300">Batizado</label></div></div>
                    <div className="flex items-start"><div className="flex items-center h-5"><input id="isServing" name="isServing" type="checkbox" checked={formData.isServing} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-2 text-sm"><label htmlFor="isServing" className="font-medium text-gray-700 dark:text-gray-300">Atuante</label></div></div>
                    <div className="flex items-start"><div className="flex items-center h-5"><input id="isHelperOnly" name="isHelperOnly" type="checkbox" checked={formData.isHelperOnly} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-2 text-sm"><label htmlFor="isHelperOnly" className="font-medium text-gray-700 dark:text-gray-300">Só Ajudante</label></div></div>
                    {formData.ageGroup === 'Criança' && (<div className="flex items-start"><div className="flex items-center h-5"><input id="canPairWithNonParent" name="canPairWithNonParent" type="checkbox" checked={formData.canPairWithNonParent} onChange={handleChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-2 text-sm"><label htmlFor="canPairWithNonParent" className="font-medium text-gray-700 dark:text-gray-300">Pode ter ajudante terceiro</label></div></div>)}
                </div>
              </div>
              
              {/* --- COLUNA 2: Privilégios e Disponibilidade --- */}
               <div className="space-y-4">
                 <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2">Privilégios Gerais (Irmãos)</h3>
                  <div className="space-y-2">
                      {Object.keys(privilegeLabels).map((key) => (
                          <div className="flex items-start" key={key}><div className="flex items-center h-5"><input id={key} name={key} type="checkbox" checked={formData.privileges[key as keyof PublisherPrivileges]} onChange={handlePrivilegeChange} disabled={formData.gender === 'sister'} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded disabled:opacity-50"/></div><div className="ml-3 text-sm"><label htmlFor={key} className={`font-medium text-gray-700 dark:text-gray-300 ${formData.gender === 'sister' && 'opacity-50'}`}>{privilegeLabels[key as keyof PublisherPrivileges]}</label></div></div>
                      ))}
                  </div>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2 pt-4">Privilégios por Seção</h3>
                     <div className="space-y-2">
                      {Object.keys(sectionPrivilegeLabels).map((key) => (
                          <div className="flex items-start" key={key}><div className="flex items-center h-5"><input id={key} name={key} type="checkbox" checked={formData.privilegesBySection[key as keyof PublisherPrivilegesBySection]} onChange={handleSectionPrivilegeChange} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"/></div><div className="ml-3 text-sm"><label htmlFor={key} className={`font-medium text-gray-700 dark:text-gray-300`}>{sectionPrivilegeLabels[key as keyof PublisherPrivilegesBySection]}</label></div></div>
                      ))}
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2 pt-4">Disponibilidade</h3>
                   <div>
                        <label htmlFor="availabilityMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Modo</label>
                        <select name="availabilityMode" id="availabilityMode" value={formData.availability.mode} onChange={handleAvailabilityChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md">
                            <option value="always">Sempre disponível, exceto em...</option>
                            <option value="never">Geralmente indisponível, exceto em...</option>
                        </select>
                   </div>
                   <div>
                        <label htmlFor="availabilityDates" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Datas de Exceção</label>
                        <input type="text" name="availabilityDates" id="availabilityDates" value={availabilityDateStr} onChange={handleAvailabilityDateChange} placeholder="ex: 2025-12-25, 2026-01-01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black"/>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use o formato AAAA-MM-DD, separado por vírgulas.</p>
                   </div>
              </div>

            </div>
          </div>
          <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublisherForm;