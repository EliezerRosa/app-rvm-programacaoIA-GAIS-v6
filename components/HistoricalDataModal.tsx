import React, { useState, useMemo } from 'react';
import { ArrowUpTrayIcon } from './icons';

export interface HistoricalData {
    weekId: string; // ISO YYYY-MM-DD (The stable ID)
    weekDisplay: string; // Texto amigável para exibição
    participations: {
        partTitle: string;
        publisherName: string;
    }[];
}

interface HistoricalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: HistoricalData[]) => Promise<void>;
  existingWeeks: string[];
  parsePdf: (file: File) => Promise<HistoricalData[]>;
}

const HistoricalDataModal: React.FC<HistoricalDataModalProps> = ({ isOpen, onClose, onImport, existingWeeks, parsePdf }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<HistoricalData[] | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState('');
    const MAX_SIZE_MB = 10;

    const sortedExistingWeeks = useMemo(() => {
        return existingWeeks;
    }, [existingWeeks]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            setError('Por favor, selecione um arquivo PDF.');
            return;
        }
        if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`O arquivo é muito grande. O limite é de ${MAX_SIZE_MB}MB.`);
            return;
        }

        setFile(selectedFile);
        setError('');
        setIsParsing(true);
        setPreviewData(null);

        try {
            const parsedData = await parsePdf(selectedFile);
            const existingWeeksSet = new Set(existingWeeks);
            // Filter checks against weekId (ISO) to prevent duplicates
            const newData = parsedData.filter(d => !existingWeeksSet.has(d.weekId));
            setPreviewData(newData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao analisar o PDF.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (!previewData || previewData.length === 0) return;
        await onImport(previewData);
        handleClose();
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData(null);
        setError('');
        setIsParsing(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
                <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold">Importar Histórico de Pautas (PDF)</h2>
                    <p className="text-sm text-gray-500 mt-1">Adicione pautas antigas para complementar as estatísticas de participação.</p>
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Coluna de Upload e Preview */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="pdf-upload" className="block text-sm font-medium">1. Selecione o arquivo PDF</label>
                                <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                            </div>

                            {isParsing && <p className="text-sm text-indigo-600">Analisando PDF...</p>}
                            {error && <p className="text-sm text-red-600">{error}</p>}

                            {previewData && (
                                <div className="space-y-2">
                                    <h3 className="text-md font-semibold">2. Confirme a Importação</h3>
                                    {previewData.length > 0 ? (
                                        <>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                Foram encontradas <span className="font-bold">{previewData.length}</span> nova(s) semana(s) para importar:
                                            </p>
                                            <ul className="text-xs list-disc list-inside bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-24 overflow-y-auto">
                                                {previewData.map(d => <li key={d.weekId}>{d.weekDisplay} <span className="text-gray-400">({d.weekId})</span></li>)}
                                            </ul>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Nenhuma semana nova foi encontrada no arquivo. Todas as pautas já existem no histórico.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Coluna de Semanas Existentes */}
                        <div className="space-y-2">
                            <h3 className="text-md font-semibold">Semanas já Cadastradas</h3>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700 h-48 overflow-y-auto">
                                {sortedExistingWeeks.length > 0 ? (
                                    <ul className="space-y-1">
                                        {sortedExistingWeeks.map(week => (
                                            <li key={week} className="text-xs text-gray-600 dark:text-gray-400">{week}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500">Nenhuma pauta no histórico.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md">Cancelar</button>
                    <button onClick={handleImport} disabled={!previewData || previewData.length === 0 || isParsing} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center">
                        <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                        Importar {previewData ? `(${previewData.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoricalDataModal;