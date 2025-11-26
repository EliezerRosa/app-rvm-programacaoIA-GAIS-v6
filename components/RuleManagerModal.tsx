import React, { useState, useEffect } from 'react';
import { Rule } from '../types';
import { createRuleFromNaturalLanguage } from '../lib/inferenceEngine';
import { generateUUID } from '../lib/utils';
import { SparklesIcon, TrashIcon } from './icons';
import { factDictionary } from '../lib/ruleFacts';

interface RuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: Rule[];
  onSave: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

const RuleManagerModal: React.FC<RuleManagerModalProps> = ({ isOpen, onClose, rules, onSave, onDelete }) => {
    const [localRules, setLocalRules] = useState<Rule[]>([]);
    const [newRulePrompt, setNewRulePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showDictionary, setShowDictionary] = useState(false);


    useEffect(() => {
        if(isOpen) {
            setLocalRules(JSON.parse(JSON.stringify(rules))); // Deep copy
            setError('');
            setNewRulePrompt('');
            setShowDictionary(false);
        }
    }, [isOpen, rules]);

    const handleToggle = (ruleId: string) => {
        const updatedRule = rules.find(rule => rule.id === ruleId);
        if (updatedRule) {
            onSave({ ...updatedRule, isActive: !updatedRule.isActive });
        }
    };
    
    const handleGenerateRule = async () => {
        if (!newRulePrompt.trim()) {
            setError('Por favor, digite uma regra.');
            return;
        }
        setIsGenerating(true);
        setError('');
        try {
            const ruleLogic = await createRuleFromNaturalLanguage(newRulePrompt);
            const newRule: Rule = {
                id: generateUUID(),
                ...ruleLogic,
                isActive: true,
            };
            onSave(newRule);
            setNewRulePrompt('');
        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro desconhecido.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Gerenciador de Regras (IA)
            </h2>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6">
            {/* Rule Creation */}
            <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-6">
                <label htmlFor="new-rule-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Criar nova regra com linguagem natural
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                        type="text"
                        name="new-rule-prompt"
                        id="new-rule-prompt"
                        className="focus:ring-indigo-600 focus:border-indigo-600 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 dark:border-gray-600 bg-white text-black placeholder-gray-500"
                        placeholder="Ex: Apenas irmãos com Condição de Ancião podem presidir"
                        value={newRulePrompt}
                        onChange={(e) => setNewRulePrompt(e.target.value)}
                        disabled={isGenerating}
                    />
                    <button
                        type="button"
                        onClick={handleGenerateRule}
                        disabled={isGenerating}
                        className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 disabled:opacity-50"
                    >
                        <SparklesIcon className="h-5 w-5 text-indigo-600" />
                        <span>{isGenerating ? 'Gerando...' : 'Gerar com IA'}</span>
                    </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                 <div className="mt-3">
                    <button onClick={() => setShowDictionary(!showDictionary)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none">
                        {showDictionary ? 'Ocultar' : 'Mostrar'} Dicionário de Variáveis
                    </button>
                    {showDictionary && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                            <ul className="space-y-2">
                                {Object.entries(factDictionary).map(([key, { naturalName, singleWordName, description }]) => (
                                    <li key={key} className="text-xs">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                                            {naturalName}
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            {description} <br/>
                                            (Alternativa de nome único: <code className="text-xs bg-gray-200 dark:bg-gray-600 rounded px-1 py-0.5">{singleWordName}</code>)
                                            <span className="sr-only">Nome técnico: {key}</span>
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Rule List */}
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Regras Definidas</h3>
            <div className="space-y-3">
            {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-grow">{rule.description}</p>
                    <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                        <label htmlFor={`rule-toggle-${rule.id}`} className="inline-flex relative items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rule.isActive}
                                onChange={() => handleToggle(rule.id)}
                                id={`rule-toggle-${rule.id}`}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600"></div>
                        </label>
                        <button onClick={() => onDelete(rule.id)} className="text-gray-400 hover:text-red-500">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            ))}
            </div>
        </div>
        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Fechar
            </button>
          </div>
      </div>
    </div>
  );
};

export default RuleManagerModal;