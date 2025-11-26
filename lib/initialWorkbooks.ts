import { Workbook } from '../types';
import { generateUUID } from './utils';

// This is a valid base64 encoded string for a simple, renderable PDF.
// The previous string was corrupted and caused decoding errors.
const validWorkbookPdfBase64 = "JVBERi0xLjcKJcPDgw0KMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L01lZGlhQm94WzAgMCA1OTUgODQyXS9Db250ZW50cyA1IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCA3MT4+CnN0cmVhbQpCVCAvRjEgMTIgVGYgNzIgNzcwIFRkIChBcG9zdGlsYSBkZSBFeGVtcGxvIC0gVmlkYSBlIE1pbmlzdGVyaW8pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE5IDAwMDAwIG4gCjAwMDAwMDAwNzQgMDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAwIG4gCjAwMDAwMDAyNzAgMDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDQxCiUlRU9GCg==";

export const initialWorkbooks: Workbook[] = [
  {
    id: generateUUID(),
    name: '[DEMO] Nossa Vida e Ministério Cristão - Mar/Abr 2026',
    fileData: validWorkbookPdfBase64,
    uploadDate: new Date('2026-03-01T10:00:00Z').toISOString()
  },
  {
    id: generateUUID(),
    name: '[DEMO] Nossa Vida e Ministério Cristão - Jan/Fev 2026',
    fileData: validWorkbookPdfBase64,
    uploadDate: new Date('2026-01-01T10:00:00Z').toISOString()
  },
  {
    id: generateUUID(),
    name: '[DEMO] Nossa Vida e Ministério Cristão - Nov/Dez 2025',
    fileData: validWorkbookPdfBase64,
    uploadDate: new Date('2025-11-01T10:00:00Z').toISOString()
  }
];