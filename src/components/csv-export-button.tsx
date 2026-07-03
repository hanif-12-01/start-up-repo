'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

type ExportType = 'electricity';

export function CsvExportButton({ type, label }: { type: ExportType; label: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/export/csv?type=' + type);
      if (!res.ok) throw new Error('Gagal ekspor CSV.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wattwise-' + type + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('CSV berhasil diunduh.', 'success');
    } catch (error: any) {
      toast(error.message ?? 'Gagal ekspor CSV.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type='button' onClick={handleExport} disabled={loading} className='btn-outline'>
      {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
      {loading ? 'Mengunduh...' : label}
    </button>
  );
}
