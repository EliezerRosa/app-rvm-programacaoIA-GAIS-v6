
import React, { useState, useEffect } from 'react';
import { HARDCODED_STATE } from '../lib/devFixture';

interface DevToolsProps {
    onLoadState: (state: any) => void;
    currentState: any;
}

const DevTools: React.FC<DevToolsProps> = ({ onLoadState, currentState }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [autoLoad, setAutoLoad] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{text: string, type: 'success' | 'error'} | null>(null);

    // Auto-Load logic
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const shouldAutoLoad = localStorage.getItem('DEV_AUTO_LOAD') === 'true';
            setAutoLoad(shouldAutoLoad);
            if (shouldAutoLoad) {
                const saved = localStorage.getItem('DEV_STATE_SNAPSHOT');
                if (saved) {
                    try {
                        console.log("DevTools: Auto-loading state...");
                        setTimeout(() => onLoadState(JSON.parse(saved)), 100);
                    } catch (e) {
                        console.error("DevTools: Failed to auto-load", e);
                    }
                }
            }
        }
    }, []);

    // Limpa mensagem após 3 segundos
    useEffect(() => {
        if (statusMsg) {
            const timer = setTimeout(() => setStatusMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMsg]);

    const handleSaveSnapshot = () => {
        try {
            const stateToSave = {
                ...currentState,
                manualAssignmentState: {
                    ...currentState.manualAssignmentState,
                    file: null // Arquivos não são serializáveis
                }
            };
            
            const jsonString = JSON.stringify(stateToSave);
            
            if (jsonString.length > 5 * 1024 * 1024) {
                throw new Error("Estado muito grande para LocalStorage (>5MB). Remova PDFs grandes.");
            }

            localStorage.setItem('DEV_STATE_SNAPSHOT', jsonString);
            console.log("DevTools: Snapshot salvo com sucesso.", stateToSave);
            setStatusMsg({ text: "Snapshot salvo com sucesso!", type: "success" });
        } catch (e: any) {
            console.error("DevTools: Erro ao salvar snapshot", e);
            setStatusMsg({ text: "Erro ao salvar (ver console)", type: "error" });
        }
    };

    const handleLoadSnapshot = () => {
        const saved = localStorage.getItem('DEV_STATE_SNAPSHOT');
        if (saved) {
            try {
                onLoadState(JSON.parse(saved));
                setStatusMsg({ text: "Snapshot carregado!", type: "success" });
            } catch (e) {
                setStatusMsg({ text: "Snapshot corrompido", type: "error" });
            }
        } else {
            setStatusMsg({ text: "Nenhum snapshot encontrado", type: "error" });
        }
    };

    const handleLoadHardcoded = () => {
        onLoadState(HARDCODED_STATE);
        setStatusMsg({ text: "Estado de Teste carregado", type: "success" });
    };

    const toggleAutoLoad = (checked: boolean) => {
        setAutoLoad(checked);
        localStorage.setItem('DEV_AUTO_LOAD', String(checked));
        if (checked) {
            handleSaveSnapshot(); 
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
            
            {/* Status Toast - Feedback Visual Imediato */}
            {statusMsg && (
                <div className={`mb-3 px-4 py-2 rounded shadow-lg pointer-events-auto text-sm font-bold transition-opacity duration-300 ${statusMsg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {statusMsg.text}
                </div>
            )}

            {/* Menu */}
            {isOpen && (
                <div className="bg-gray-900 text-white p-4 rounded-lg shadow-2xl pointer-events-auto mb-3 w-64 border border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-yellow-400">🛠️ DevTools</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    
                    <div className="space-y-2">
                        <button onClick={handleSaveSnapshot} className="w-full text-left text-xs bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded flex items-center justify-between group transition-colors">
                            <span>💾 Salvar Snapshot</span>
                            <span className="text-[10px] text-blue-200 group-hover:text-white">LocalStorage</span>
                        </button>
                        <button onClick={handleLoadSnapshot} className="w-full text-left text-xs bg-green-600 hover:bg-green-700 px-3 py-2 rounded flex items-center transition-colors">
                            📂 <span className="ml-2">Carregar Snapshot</span>
                        </button>
                        <button onClick={handleLoadHardcoded} className="w-full text-left text-xs bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded flex items-center transition-colors">
                            🧪 <span className="ml-2">Carregar Teste (Hardcoded)</span>
                        </button>
                        
                        <div className="flex items-center pt-3 border-t border-gray-700 mt-2">
                            <input 
                                type="checkbox" 
                                id="dev-autoload" 
                                checked={autoLoad} 
                                onChange={e => toggleAutoLoad(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 cursor-pointer"
                            />
                            <label htmlFor="dev-autoload" className="ml-2 text-xs text-gray-300 cursor-pointer select-none">
                                Auto-Load ao recarregar (F5)
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg pointer-events-auto border border-gray-600 transition-transform ${isOpen ? 'rotate-45' : ''}`}
                title="Ferramentas de Desenvolvedor"
            >
                🛠️
            </button>
        </div>
    );
};

export default DevTools;
