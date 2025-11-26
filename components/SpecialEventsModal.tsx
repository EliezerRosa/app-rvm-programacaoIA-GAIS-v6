import React, { useState, useEffect } from 'react';
import { SpecialEvent, SpecialEventsModalProps, EventTemplate, ParticipationType, SpecialEventConfiguration } from '../types';
import { generateUUID } from '../lib/utils';
import { TrashIcon, InformationCircleIcon, CogIcon } from './icons';

const SpecialEventsModal: React.FC<SpecialEventsModalProps> = ({ isOpen, onClose, specialEvents, eventTemplates, onSave, onDelete, onManageTemplates }) => {
    const [templateId, setTemplateId] = useState<string>('');
    const [theme, setTheme] = useState('');
    const [week, setWeek] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [duration, setDuration] = useState(0);
    const [configuration, setConfiguration] = useState<SpecialEventConfiguration>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const selectedTemplate = eventTemplates.find(t => t.id === templateId);

    useEffect(() => {
        if (templateId && selectedTemplate && !editingId) {
            setTheme(selectedTemplate.defaults.theme || '');
            setDuration(selectedTemplate.defaults.duration);
            setConfiguration({}); // Reset config on template change
        }
    }, [templateId, selectedTemplate, editingId]);
    
    const resetForm = () => {
        setTemplateId('');
        setTheme('');
        setWeek('');
        setAssignedTo('');
        setDuration(0);
        setConfiguration({});
        setEditingId(null);
    }
    
    const handleEdit = (event: SpecialEvent) => {
        setEditingId(event.id);
        setTemplateId(event.templateId);
        setTheme(event.theme);
        setWeek(event.week);
        setAssignedTo(event.assignedTo || '');
        setDuration(event.duration || 30);
        setConfiguration(event.configuration || {});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateId || !week.trim()) {
            alert("Modelo de Evento e Semana são obrigatórios.");
            return;
        }
        if (selectedTemplate?.defaults.requiresAssignee && !assignedTo.trim()){
             alert("O campo 'Designado' é obrigatório para este tipo de evento.");
            return;
        }
        if (selectedTemplate?.defaults.requiresTheme && !theme.trim()){
             alert("O campo 'Tema' é obrigatório para este tipo de evento.");
            return;
        }

        const eventData: SpecialEvent = {
            id: editingId || generateUUID(),
            templateId,
            week,
            theme,
            assignedTo,
            duration,
            configuration
        };
        await onSave(eventData);
        resetForm();
    };
    
    const handleConfigChange = (field: keyof SpecialEventConfiguration, value: any) => {
        setConfiguration(prev => ({ ...prev, [field]: value }));
    };
    
    const handleTimeReductionChange = <K extends keyof NonNullable<SpecialEventConfiguration['timeReduction']>>(
        field: K, 
        value: NonNullable<SpecialEventConfiguration['timeReduction']>[K]
    ) => {
        handleConfigChange('timeReduction', {
            ...configuration.timeReduction,
            [field]: value,
        });
    };

    useEffect(() => {
      if(!isOpen) resetForm();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
                <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gerenciar Eventos Especiais</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie eventos que ajustam a pauta padrão.</p>
                    </div>
                    <button onClick={onManageTemplates} className="flex items-center text-sm text-indigo-600 hover:underline" title="Gerenciar Modelos de Evento">
                        <CogIcon className="w-5 h-5 mr-1" /> Gerenciar Modelos
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-6 space-y-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{editingId ? 'Editando Evento' : 'Novo Evento'}</h3>
                        <div>
                            <label className="block text-sm font-medium">Modelo de Evento</label>
                            <select value={templateId} onChange={e => setTemplateId(e.target.value)} required className="mt-1 block w-full input-class">
                                <option value="" disabled>Selecione um modelo...</option>
                                {eventTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        
                        {selectedTemplate && (
                            <>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md">
                                    <div className="flex"><div className="flex-shrink-0"><InformationCircleIcon className="h-5 w-5 text-indigo-400" /></div><div className="ml-3"><p className="text-sm text-indigo-700 dark:text-indigo-200">{selectedTemplate.description}</p></div></div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Semana (ex: 1-7 de JAN, 2025)</label>
                                    <input type="text" value={week} onChange={e => setWeek(e.target.value)} required className="mt-1 block w-full input-class"/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Tema da Parte</label>
                                        <input type="text" value={theme} onChange={e => setTheme(e.target.value)} disabled={!selectedTemplate.defaults.requiresTheme} required={selectedTemplate.defaults.requiresTheme} className="mt-1 block w-full input-class"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Designado</label>
                                        <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={!selectedTemplate.defaults.requiresAssignee} required={selectedTemplate.defaults.requiresAssignee} className="mt-1 block w-full input-class"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Duração (minutos)</label>
                                    <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value, 10) || 0)} required className="mt-1 block w-full input-class"/>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-md font-semibold">Ajustes Adicionais na Pauta</h4>
                                    <div className="flex items-center mt-2">
                                        <input id="reduceTime" type="checkbox" checked={!!configuration.timeReduction} onChange={e => handleConfigChange('timeReduction', e.target.checked ? { targetType: ParticipationType.DIRIGENTE, minutes: 15 } : undefined)} className="h-4 w-4 rounded" />
                                        <label htmlFor="reduceTime" className="ml-2 block text-sm font-medium">Reduzir o tempo de outra parte?</label>
                                    </div>
                                    {configuration.timeReduction && (
                                        <div className="grid grid-cols-2 gap-4 mt-2 pl-6">
                                            <div>
                                                <label className="block text-xs font-medium">Parte a ser Reduzida</label>
                                                <select value={configuration.timeReduction.targetType} onChange={e => handleTimeReductionChange('targetType', e.target.value as ParticipationType)} className="mt-1 block w-full input-class text-sm">
                                                    <option value={ParticipationType.DIRIGENTE}>Estudo Bíblico de Congregação</option>
                                                    <option value={ParticipationType.VIDA_CRISTA}>Nossa Vida Cristã</option>
                                                    <option value={ParticipationType.TESOUROS}>Tesouros da Palavra</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium">Minutos a Reduzir</label>
                                                <input type="number" value={configuration.timeReduction.minutes} onChange={e => handleTimeReductionChange('minutes', parseInt(e.target.value, 10) || 0)} className="mt-1 block w-full input-class text-sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                    {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancelar Edição</button>}
                                    <button type="submit" className="btn-primary">{editingId ? 'Atualizar Evento' : 'Salvar Evento'}</button>
                                </div>
                            </>
                        )}
                    </form>

                    {/* Event List */}
                    <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Eventos Programados</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {specialEvents.length === 0 ? <p className="text-sm text-gray-500">Nenhum evento especial criado.</p> : specialEvents.map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{eventTemplates.find(t=>t.id === event.templateId)?.name || 'Modelo Desconhecido'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{event.week} - {event.theme}</p>
                            </div>
                            <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                                <button onClick={() => handleEdit(event)} className="text-sm text-indigo-600 hover:underline">Editar</button>
                                <button onClick={() => onDelete(event.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
                <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end">
                    <button type="button" onClick={onClose} className="btn-primary">Fechar</button>
                </div>
                {/* FIX: Removed 'jsx' attribute from style tag to fix TypeScript error. */}
                <style>{`
                    .input-class { background-color: white; color: black; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem; }
                    .dark .input-class { background-color: #374151; color: white; border-color: #4b5563; }
                    .input-class:disabled { background-color: #f3f4f6; opacity: 0.7; }
                    .dark .input-class:disabled { background-color: #4b5563; }
                    .btn-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
                    .btn-secondary { background-color: #6b7280; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
                `}</style>
            </div>
        </div>
    );
};

export default SpecialEventsModal;