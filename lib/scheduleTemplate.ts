import { MeetingData, ParticipationType, Publisher, SpecialEvent, EventTemplate } from '../types';
import { TimedEvent, getFullScheduleWithTimings } from './scheduleUtils';

const renderEventToHtml = (event: TimedEvent): string => {
    const { startTime, partTitle, publisherName, durationText, isCounseling } = event;

    const rowStyle = isCounseling ? 'color: #718096; font-style: italic;' : '';
    const titleStyle = isCounseling ? 'padding-left: 16px;' : '';
    
    return `
        <tr style="${rowStyle}">
            <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: left; width: 60px;">${startTime}</td>
            <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: left; ${titleStyle}">${partTitle}</td>
            <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #4a5568;">
                <span style="margin-right: 16px;">${publisherName}</span>
                <span style="color: #a0aec0; width: 50px; display: inline-block; text-align: right;">${durationText}</span>
            </td>
        </tr>
    `;
}

export const getScheduleHtml = (meetingData: MeetingData, congregationName: string, publishers: Publisher[], specialEvents: SpecialEvent[], eventTemplates: EventTemplate[]): string => {
    const timedSchedule = getFullScheduleWithTimings(meetingData, publishers, specialEvents, eventTemplates);
    const president = meetingData.parts.find(p => p.type === ParticipationType.PRESIDENTE);

    const openingParts = timedSchedule.filter(p => p.sectionType === 'OPENING' || p.sectionType === 'COMMENTS');
    const treasuresParts = timedSchedule.filter(p => p.sectionType === ParticipationType.TESOUROS);
    const transitionParts = timedSchedule.filter(p => p.sectionType === 'TRANSITION');
    const ministryParts = timedSchedule.filter(p => p.sectionType === ParticipationType.MINISTERIO);
    const lifeParts = timedSchedule.filter(p => p.sectionType === ParticipationType.VIDA_CRISTA || p.sectionType === ParticipationType.DIRIGENTE);
    const closingParts = timedSchedule.filter(p => p.sectionType === 'CLOSING');

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Pauta - ${meetingData.week}</title>
            <style>
                body { font-family: sans-serif; color: #2d3748; }
                .container { max-width: 800px; margin: auto; background: #fff; padding: 30px; }
                h1, h2 { text-align: center; }
                h3 { color: #fff; padding: 8px 12px; border-radius: 4px; }
                .treasures h3 { background-color: #4A5568; }
                .ministry h3 { background-color: #D69E2E; }
                .life h3 { background-color: #C53030; }
                table { width: 100%; border-collapse: collapse; }
                 @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="container">
                <button class="no-print" onclick="window.print()">Imprimir</button>
                <h1>${congregationName}</h1>
                <h2>Programação da reunião - ${meetingData.week}</h2>
                <p>Presidente: ${president ? president.publisherName : 'N/D'}</p>
                <table>
                    <tbody>
                        ${openingParts.map(renderEventToHtml).join('')}
                        ${treasuresParts.length > 0 ? `<tr><td colspan="3"><div class="treasures"><h3>TESOUROS DA PALAVRA DE DEUS</h3></div></td></tr>` : ''}
                        ${treasuresParts.map(renderEventToHtml).join('')}
                        ${transitionParts.map(renderEventToHtml).join('')}
                        ${ministryParts.length > 0 ? `<tr><td colspan="3"><div class="ministry"><h3>FAÇA SEU MELHOR NO MINISTÉRIO</h3></div></td></tr>` : ''}
                        ${ministryParts.map(renderEventToHtml).join('')}
                        ${lifeParts.length > 0 ? `<tr><td colspan="3"><div class="life"><h3>NOSSA VIDA CRISTÃ</h3></div></td></tr>` : ''}
                        ${lifeParts.map(renderEventToHtml).join('')}
                        ${closingParts.map(renderEventToHtml).join('')}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
};