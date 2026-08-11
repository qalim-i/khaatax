import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Party } from '@/types/db';

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('parties')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setParties((data as Party[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { parties, loading };
}
