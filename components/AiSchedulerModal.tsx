import React, { useState, useMemo, useEffect } from 'react';
import { Workbook } from '../types';
import { generateWeeksForWorkbook } from '../lib/utils';

interface AiSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (workbook: Workbook, week: string) => void;
  workbooks: Workbook[];
  scheduledWeeks: string[];
  isGenerating: boolean;
}

const AiSchedulerModal: React.FC<AiSchedulerModalProps> = ({ isOpen, onClose, onGenerate, workbooks, scheduledWeeks, isGenerating }) => {
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  
  // Ordena as apostilas pela data de upload (mais recente primeiro) para auto-seleção
  const sortedWorkbooks = useMemo(() => {
      return [...workbooks].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [workbooks]);

  // Auto-seleciona a apostila mais recente ao abrir
  useEffect(() => {
      if (isOpen && sortedWorkbooks.length > 0 && !selectedWorkbookId) {
          setSelectedWorkbookId(sortedWorkbooks[0].id);
      }
  }, [isOpen, sortedWorkbooks, selectedWorkbookId]);

  const availableWeeks = useMemo(() => {
    if (!selectedWorkbookId) return [];
    const workbook = workbooks.find(w => w.id === selectedWorkbookId);
    if (!workbook) return [];
    
    // Agora retorna objetos { id: string (ISO), label: string (Friendly) }
    const allWeeks = generateWeeksForWorkbook(workbook.name);
    
    // Normaliza para comparação
    const scheduledWeeksSet = new Set(scheduledWeeks);
    
    // Filtra as semanas que já foram agendadas
    return allWeeks.filter(weekObj => !scheduledWeeksSet.has(weekObj.id) && !scheduledWeeksSet.has(weekObj.label));
  }, [selectedWorkbookId, workbooks, scheduledWeeks]);

  useEffect(() => {
    if (availableWeeks.length > 0) {
       // Verifica se a seleção atual ainda é válida
       const currentSelectionExists = availableWeeks.some(w => w.id === selectedWeek);
       if (!currentSelectionExists) {
           setSelectedWeek(availableWeeks[0].id); 
       }
    } else {
        setSelectedWeek('');
    }
  }, [availableWeeks, selectedWeek]);


  const handleGenerate = () => {
    const workbook = workbooks.find(w => w.id === selectedWorkbookId);
    if (workbook && selectedWeek) {
      onGenerate(workbook, selectedWeek);
    } else {
      alert("Por favor, selecione uma apostila e uma semana.");
    }
  };
  
  const formatDate = (isoString: string) => {
      try {
          return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch {
          return '';
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gerar Pauta com IA</h2>
        </div>
        <div className="p-6 flex-grow overflow-y-auto space-y-4">
          <div>
            <label htmlFor="workbook-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Selecione a Apostila
            </label>
            <select
              id="workbook-select"
              value={selectedWorkbookId}
              onChange={(e) => {
                setSelectedWorkbookId(e.target.value);
                setSelectedWeek(''); // Reset week on workbook change
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
            >
              <option value="" disabled>Escolha uma apostila...</option>
              {sortedWorkbooks.map(w => (
                <option key={w.id} value={w.id}>
                    {w.name} {w.uploadDate ? `(${formatDate(w.uploadDate)})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Dica: A apostila mais recente é selecionada automaticamente.</p>
          </div>
           {selectedWorkbookId && (
             <div>
                <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Selecione a Semana
                </label>
                <select
                id="week-select"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm rounded-md"
                >
                {availableWeeks.length > 0 ? (
                    <>
                        <option value="ALL">Gerar para todas as semanas disponíveis ({availableWeeks.length})</option>
                        {availableWeeks.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </>
                ) : (
                    <option value="" disabled>Nenhuma semana disponível nesta apostila</option>
                )}
                </select>
            </div>
           )}
          {isGenerating && (
            <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-300">Gerando designações... Isso pode levar um momento.</p>
            </div>
          )}
        </div>
        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end space-x-3">
          <button type="button" onClick={onClose} disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleGenerate} disabled={!selectedWorkbookId || !selectedWeek || isGenerating} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300 disabled:cursor-not-allowed">
            {isGenerating ? 'Processando...' : 'Gerar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSchedulerModal;