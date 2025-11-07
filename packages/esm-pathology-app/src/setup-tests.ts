// Polyfills required for @react-pdf/renderer in Jest environment
import { TextEncoder, TextDecoder } from 'util';
import React from 'react';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock PDFDownloadLink to prevent PDF generation during tests
jest.mock('@react-pdf/renderer', () => ({
  ...jest.requireActual('@react-pdf/renderer'),
  PDFDownloadLink: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pdf-download-link' }, children),
}));
