import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Zap, Plus, Trophy } from 'lucide-react';

interface BlitzTournament {
  id: string;
  name: string;
  status: string;
  players: any[];
  current_round: number;
  total_rounds: number;
  created_at: string;
}

export default function BlitzList() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<BlitzTournament[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('Saturday Blitz');
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('blitz_tournaments').select('*').order('created_at', { ascending: false });
    setTournaments((data || []) as unknown as BlitzTournament[]);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from('blitz_tournaments').insert({ name: name.trim() }).select().single();
    setCreating(false);
    if (!error && data) navigate(`/blitz/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> Blitz Tournaments
          </h1>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Tournament name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Blitz Tournament'}
              </Button>
            </CardContent>
          </Card>
        )}

        {tournaments.length === 0 && !showCreate && (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">⚡</div>
            <p className="text-muted-foreground">No blitz tournaments yet</p>
            <Button onClick={() => setShowCreate(true)}>Create your first one</Button>
          </div>
        )}

        {tournaments.map(t => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/blitz/${t.id}`)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.players.length} players · {t.status === 'finished' ? 'Finished' : t.status === 'live' ? `Round ${t.current_round}/${t.total_rounds}` : 'Setup'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === 'finished' && <Trophy className="h-5 w-5 text-primary" />}
                  {t.status === 'live' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium animate-pulse">LIVE</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/tournaments')}>
          ← Back to Tournaments
        </Button>
      </div>
    </div>
  );
}
