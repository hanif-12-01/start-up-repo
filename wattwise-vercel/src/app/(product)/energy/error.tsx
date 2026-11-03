'use client';
import { WorkspacePage, primaryButton } from '@/components/product/WorkspaceUI';
export default function Error({ reset }: { reset: () => void }) { return <WorkspacePage><h1 className="text-2xl font-bold">Data Energi belum dapat dimuat</h1><p role="alert">Data Anda tidak dihapus. Coba lagi atau masuk ulang jika sesi berakhir.</p><button type="button" onClick={reset} className={primaryButton}>Coba lagi</button></WorkspacePage>; }
