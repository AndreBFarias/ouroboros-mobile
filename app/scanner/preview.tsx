// Sub-rota /scanner/preview. Recebe URIs deskewed (separadas por '|')
// via params e renderiza ScannerPreview com OCR + form de validacao.
import { ScannerPreview } from '@/components/screens/ScannerPreview';

export default function PreviewRoute() {
  return <ScannerPreview />;
}
