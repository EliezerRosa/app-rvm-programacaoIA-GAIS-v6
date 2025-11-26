import React, { useState, useEffect } from 'react';
import { EventTemplate, EventImpact, ParticipationType } from '../types';
import { generateUUID } from '../lib/utils';
import { TrashIcon } from './icons';

interface EventTemplateManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: EventTemplate[];
    onSave: (template: EventTemplate) => Promise<void>;
    onDelete: (id: string) => void;
}

const initialFormData: Omit<EventTemplate, 'id'> = {
    name: '',
    description: '',
    impact: {
        action: 'ADD_PART',
        targetType: ParticipationType.VIDA_CRISTA,
    },
    defaults: {
        duration: 15,
        requiresTheme: true,
        requiresAssignee: true,
    },
};

const EventTemplateManagerModal: React.FC<EventTemplateManagerModalProps> = ({ isOpen, onClose, templates, onSave, onDelete }) => {
    const [formData, setFormData] = useState<Omit<EventTemplate, 'id'>>(initialFormData);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setFormData(initialFormData);
        setEditingId(null);
    };

    const handleEdit = (template: EventTemplate) => {
        setEditingId(template.id);
        setFormData({
            name: template.name,
            description: template.description,
            impact: template.impact,
            defaults: template.defaults,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const templateData: EventTemplate = {
            id: editingId || generateUUID(),
            ...formData,
        };
        await onSave(templateData);
        resetForm();
    };
    
    const handleImpactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            impact: { ...prev.impact, [name]: value }
        }));
    };
    
    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            defaults: {
                ...prev.defaults,
                [name]: isCheckbox ? checked : (type === 'number' ? parseInt(value, 10) : value),
            }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gerenciar Modelos de Evento</h2>
                </div>

                <div className="flex-grow flex md:flex-row flex-col overflow-hidden">
                    {/* Lista de Modelos */}
                    <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
                        <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Modelos Existentes</h3>
                        <div className="space-y-2">
                            {templates.map(template => (
                                <div key={template.id} className={`p-3 rounded-md cursor-pointer ${editingId === template.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`} onClick={() => handleEdit(template)}>
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{template.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="w-full md:w-2/3 p-6 space-y-4 overflow-y-auto">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{editingId ? 'Editando Modelo' : 'Novo Modelo'}</h3>
                        
                        <div>
                            <label className="block text-sm font-medium">Nome do Modelo</label>
                            <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required className="mt-1 block w-full input-class" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium">Descrição (Exibida no assistente)</label>
                            <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} required className="mt-1 block w-full input-class" rows={3}></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium">Impacto Padrão na Pauta</label>
                                <select name="action" value={formData.impact.action} onChange={handleImpactChange} className="mt-1 block w-full input-class">
                                    <option value="ADD_PART">Adicionar Nova Parte</option>
                                    <option value="REPLACE_PART">Substituir Parte Específica</option>
                                    <option value="REPLACE_SECTION">Substituir Seção Inteira</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Parte/Seção Alvo</label>
                                <select name="targetType" value={formData.impact.targetType} onChange={handleImpactChange} disabled={formData.impact.action === 'ADD_PART'} className="mt-1 block w-full input-class disabled:opacity-50">
                                    <option value={ParticipationType.VIDA_CRISTA}>Nossa Vida Cristã</option>
                                    <option value={ParticipationType.DIRIGENTE}>Estudo Bíblico de Congregação</option>
                                    <option value={ParticipationType.MINISTERIO}>Faça Seu Melhor no Ministério</option>
                                    <option value={ParticipationType.TESOUROS}>Tesouros da Palavra de Deus</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Duração Padrão (min)</label>
                                <input type="number" name="duration" value={formData.defaults.duration} onChange={handleDefaultChange} className="mt-1 block w-full input-class" />
                            </div>
                             <div className="space-y-2 pt-5">
                                <div className="flex items-center">
                                    <input type="checkbox" name="requiresTheme" checked={formData.defaults.requiresTheme} onChange={handleDefaultChange} className="h-4 w-4 rounded" />
                                    <label className="ml-2 block text-sm">Requer Tema Específico</label>
                                </div>
                                 <div className="flex items-center">
                                    <input type="checkbox" name="requiresAssignee" checked={formData.defaults.requiresAssignee} onChange={handleDefaultChange} className="h-4 w-4 rounded" />
                                    <label className="ml-2 block text-sm">Requer Designado</label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                            {editingId && <>
                                <button type="button" onClick={() => onDelete(editingId)} className="btn-danger-outline">Excluir</button>
                                <button type="button" onClick={resetForm} className="btn-secondary">Cancelar Edição</button>
                            </>}
                            <button type="submit" className="btn-primary">{editingId ? 'Atualizar Modelo' : 'Salvar Novo Modelo'}</button>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button type="button" onClick={onClose} className="btn-primary">Fechar</button>
                </div>
            </div>
            {/* FIX: Removed 'jsx' attribute from style tag to fix TypeScript error. */}
            <style>{`
                .input-class {
                    background-color: white;
                    color: black;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                }
                .dark .input-class {
                    background-color: #374151;
                    color: white;
                    border-color: #4b5563;
                }
                .btn-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { background-color: #6b7280; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
                .btn-danger-outline { border: 1px solid #dc2626; color: #dc2626; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </div>
    );
};

export default EventTemplateManagerModal;