import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import {
  buildDocumentHtml,
  documentFileName,
  documentTitle,
  type DocumentKind,
} from '@/lib/pdf/documents';
import type { Party, Transaction } from '@/types/db';

/**
 * Renders an Invoice or Delivery Challan to PDF and hands it to the OS share
 * sheet (PRD INV-5, and Open Question #134 — sharing is the share sheet, which
 * already lists WhatsApp and SMS; no WhatsApp API or phone-number handling).
 *
 * Two platform paths, because they genuinely differ:
 *  - Native: `printToFileAsync` writes a PDF to the cache, then `shareAsync`
 *    opens the share sheet on that file.
 *  - Web: sharing a local file URI is not supported by the Web Share API, so we
 *    open the browser print dialog instead — "Save as PDF" there produces the
 *    same document.
 *
 * `exportDocument` returns a failure message, or null on success. Callers need
 * the message in the tick they triggered the export; reading it back off hook
 * state would hand them the previous render's value.
 */
export function useExportPdf() {
  const [exporting, setExporting] = useState(false);

  const exportDocument = useCallback(
    async (kind: DocumentKind, party: Party, tx: Transaction): Promise<string | null> => {
      setExporting(true);
      try {
        const html = buildDocumentHtml(kind, party, tx);

        if (Platform.OS === 'web') {
          await Print.printAsync({ html });
          return null;
        }

        const { uri } = await Print.printToFileAsync({ html });
        const shareUri = renameForSharing(uri, documentFileName(kind, tx));

        if (!(await Sharing.isAvailableAsync())) {
          return 'Sharing is not available on this device. The PDF was saved to app storage.';
        }

        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: documentTitle(kind, tx),
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Could not generate the PDF.';
      } finally {
        setExporting(false);
      }
    },
    []
  );

  return { exportDocument, exporting };
}

/**
 * `printToFileAsync` names its output with a random hash, which is what the
 * recipient would see in WhatsApp. Rename it to INV-201.pdf / DC-145.pdf.
 *
 * Cosmetic only — if the rename fails (most likely because the same document was
 * already exported this session and the name is taken), fall back to the
 * generated URI rather than failing an export that otherwise succeeded.
 */
function renameForSharing(uri: string, fileName: string): string {
  try {
    const existing = new File(Paths.cache, fileName);
    if (existing.exists) existing.delete();

    const generated = new File(uri);
    generated.rename(fileName);
    return generated.uri;
  } catch {
    return uri;
  }
}
