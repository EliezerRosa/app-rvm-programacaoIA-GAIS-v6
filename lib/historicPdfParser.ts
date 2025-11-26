// @ts-nocheck
import { HistoricalData } from '../components/HistoricalDataModal';
import { cleanString, parseWeekDate, formatWeekIdToLabel } from './utils';

declare const pdfjsLib: any;

const b64toUint8Array = (b64) => {
    const binStr = atob(b64.split(',')[1] || b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
};

const groupItemsByLines = (items) => {
    const lines = [];
    if (!items.length) return lines;

    let currentLine = { y: items[0].transform[5], items: [] };
    for (const item of items) {
        if (Math.abs(item.transform[5] - currentLine.y) > 5) {
            lines.push(currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]));
            currentLine = { y: item.transform[5], items: [] };
        }
        currentLine.items.push(item);
    }
    lines.push(currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]));
    return lines.map(lineItems => ({
        y: lineItems[0].transform[5],
        text: lineItems.map(item => item.str).join('').trim(),
        items: lineItems
    }));
};

const findLineContaining = (lines, text) => lines.find(line => line.text.toLowerCase().includes(text.toLowerCase()));
const findItemAfter = (line, text) => {
    const index = line.text.toLowerCase().indexOf(text.toLowerCase());
    if (index === -1) return null;
    const followingText = line.text.substring(index + text.length).trim();
    return followingText.startsWith(':') ? followingText.substring(1).trim() : followingText;
};

const extractNameFromLine = (line, xThreshold) => {
    const relevantItems = line.items.filter(item => item.transform[4] > xThreshold);
    return relevantItems.map(item => item.str).join('').trim();
};

const findNameInRegion = (lines, yTop, yBottom, xThreshold) => {
    const line = lines.find(l => l.y < yTop && l.y > yBottom && l.items.some(i => i.transform[4] > xThreshold));
    return line ? extractNameFromLine(line, xThreshold) : 'Não Designado';
}

export const parseHistoricPdf = async (file: File): Promise<HistoricalData[]> => {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('A biblioteca pdf.js não está carregada.');
    }
    
    const fileReader = new FileReader();
    const pdfData = await new Promise<string>((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(file);
    });
    
    const uint8array = b64toUint8Array(pdfData);
    const doc = await pdfjsLib.getDocument({ data: uint8array }).promise;
    
    const allWeeksData: HistoricalData[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        
        // 1. Detect Global Year in Page Context
        // Search the entire page text for a 4-digit year (e.g., 2024, 2025)
        // This helps when the specific week line lacks the year.
        const fullPageText = textContent.items.map(item => item.str).join(' ');
        const yearMatch = fullPageText.match(/\b(20\d{2})\b/);
        const pageContextYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        const sortedItems = textContent.items.sort((a, b) => b.transform[5] - a.transform[5]);
        const lines = groupItemsByLines(sortedItems);

        let weeklyBlocks = [];
        let currentBlock = [];
        for (const line of lines) {
            if (line.text.toUpperCase().startsWith('SEMANA')) {
                if (currentBlock.length > 0) weeklyBlocks.push(currentBlock);
                currentBlock = [line];
            } else {
                currentBlock.push(line);
            }
        }
        if (currentBlock.length > 0) weeklyBlocks.push(currentBlock);
        
        for (const block of weeklyBlocks) {
            const weekLine = block[0].text;
            
            // Match "SEMANA 15-21 DE DEZEMBRO"
            // Removed dependency on '|'
            const weekMatch = weekLine.match(/SEMANA\s+(.+?)(?:\s*\||$)/i) || weekLine.match(/SEMANA\s+(.+)/i);
            
            if (!weekMatch) continue;

            // Clean the week string aggressively
            const rawWeekString = cleanString(weekMatch[1]);
            
            // 2. Generate Stable ID
            // Use the pageContextYear as a fallback if the line itself doesn't have a year.
            const weekDate = parseWeekDate(rawWeekString, pageContextYear);
            
            // If parsing failed (epoch time), skip or warn
            if (weekDate.getTime() === 0) {
                console.warn(`Falha ao interpretar data da semana: "${rawWeekString}" (Contexto Ano: ${pageContextYear})`);
                continue;
            }

            const weekId = weekDate.toISOString().split('T')[0]; // YYYY-MM-DD (This is the stable ID)
            const weekDisplay = formatWeekIdToLabel(weekId); // "15-21 de DEZ, 2025"
            
            const participations = [];
            
            const presLine = findLineContaining(block, 'Presidente:');
            const president = presLine ? findItemAfter(presLine, 'Presidente:') : 'Não Designado';
            participations.push({ partTitle: 'Presidente', publisherName: president });

            const oracaoLines = block.filter(l => l.text.toLowerCase().includes('oração:'));
            if(oracaoLines.length > 0){
                participations.push({ partTitle: 'Oração Inicial', publisherName: findItemAfter(oracaoLines[0], 'Oração:') });
                if(oracaoLines.length > 1){
                     participations.push({ partTitle: 'Oração Final', publisherName: findItemAfter(oracaoLines[oracaoLines.length - 1], 'Oração:') });
                }
            }
            
            for (const line of block) {
                const text = line.text;
                const match = text.match(/^\s*(\d+)\.\s*(.*?)\s*\((\d+)\s*min\)/);
                if (match) {
                    const [, , partTitle, ] = match;
                    let publisherName = findNameInRegion(block, line.y + 5, line.y - 5, 300);

                    if (partTitle.toLowerCase().includes('leitura da bíblia')) {
                         publisherName = findNameInRegion(block, line.y + 15, line.y - 15, 300); // Larger search area for 'Estudante'
                    }
                     if (partTitle.toLowerCase().includes('estudo bíblico de congregação')) {
                        const conductor = findItemAfter(line, 'Dirigente:');
                        const reader = findItemAfter(line, 'Leitor:');
                        if (conductor) participations.push({ partTitle, publisherName: conductor });
                        if (reader) participations.push({ partTitle: 'Leitor do EBC', publisherName: reader });
                        continue;
                    }
                    participations.push({ partTitle, publisherName });
                }

                // Handle student/helper pairs
                const yPos = line.y;
                if(text.match(/^\s*(\d+)\./) && !text.toLowerCase().includes('estudo bíblico')){
                    const titleMatch = text.match(/^\s*(\d+)\.\s*(.*?)\s*\((\d+)\s*min\)/)
                    if(!titleMatch) continue;

                    const title = titleMatch[2];
                    const studentLine = block.find(l => l.y < yPos && l.y > yPos - 30 && l.items.some(i => i.transform[4] > 350 && i.transform[4] < 480));
                    const helperLine = block.find(l => l.y < yPos && l.y > yPos - 30 && l.items.some(i => i.transform[4] > 480));

                    if (studentLine) participations.push({ partTitle: title, publisherName: extractNameFromLine(studentLine, 350) });
                    if (helperLine) participations.push({ partTitle: 'Ajudante', publisherName: extractNameFromLine(helperLine, 480) });
                }
            }

            const finalCommentsLine = findLineContaining(block, 'Comentários finais');
            if (finalCommentsLine) {
                 participations.push({ partTitle: 'Comentários Finais', publisherName: president });
            }


            allWeeksData.push({ 
                weekId, // ID ISO estável (YYYY-MM-DD)
                weekDisplay, // Texto formatado
                participations: participations.filter(p => p.publisherName && p.publisherName !== 'Não Designado') 
            });
        }
    }

    // Deduplicate participations within each week
    for (const weekData of allWeeksData) {
        const uniqueParts = new Map();
        for (const p of weekData.participations) {
            const key = `${p.partTitle}-${p.publisherName}`;
            if (!uniqueParts.has(key)) {
                uniqueParts.set(key, p);
            }
        }
        weekData.participations = Array.from(uniqueParts.values());
    }

    return allWeeksData;
};