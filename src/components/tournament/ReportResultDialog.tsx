import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ReportResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (setsA: number, setsB: number, isUnfinished: boolean, tiebreakWinner?: 'A' | 'B') => Promise<void>;
}

export function ReportResultDialog({ open, onOpenChange, onSubmit }: ReportResultDialogProps) {
  const { toast } = useToast();
  const [setsA, setSetsA] = useState('0');
  const [setsB, setSetsB] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTiebreak, setShowTiebreak] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSetsA('0');
      setSetsB('0');
      setShowTiebreak(false);
    }
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    const a = parseInt(setsA);
    const b = parseInt(setsB);

    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a > 3 || b > 3) {
      toast({ title: 'Invalid score', description: 'Sets must be between 0 and 3', variant: 'destructive' });
      return;
    }

    // Check if it's a draw
    if (a === b && a > 0) {
      // Show tiebreak picker
      setShowTiebreak(true);
      return;
    }

    // Normal result: one team must win
    const hasWinner = (a >= 2 && a > b) || (b >= 2 && b > a);
    if (!hasWinner) {
      toast({ title: 'Invalid score', description: 'One team must win 2 sets, or enter a draw for tiebreak', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(a, b, false);
      toast({ title: 'Risultato inviato', description: 'In attesa di conferma dall\'avversario.' });
    } catch (error: any) {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleTiebreakSubmit = async (winner: 'A' | 'B') => {
    const a = parseInt(setsA);
    const b = parseInt(setsB);

    setIsSubmitting(true);
    try {
      await onSubmit(a, b, false, winner);
      toast({ title: 'Risultato inviato', description: 'In attesa di conferma dall\'avversario.' });
    } catch (error: any) {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{showTiebreak ? 'Tiebreak Winner' : 'Report Match Result'}</DialogTitle>
        </DialogHeader>

        {!showTiebreak ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <Label className="text-xs text-muted-foreground mb-2 block">Your Team</Label>
                <Input type="number" min="0" max="3" value={setsA}
                  onChange={(e) => setSetsA(e.target.value)}
                  className="text-3xl font-bold text-center w-20 h-16" />
              </div>
              <span className="text-2xl text-muted-foreground">-</span>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground mb-2 block">Opponents</Label>
                <Input type="number" min="0" max="3" value={setsB}
                  onChange={(e) => setSetsB(e.target.value)}
                  className="text-3xl font-bold text-center w-20 h-16" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💰 Credits will be automatically distributed based on the score
            </p>

            <Button className="w-full touch-target bg-gradient-primary hover:opacity-90"
              onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Result'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold">{setsA} - {setsB}</div>
              <p className="text-sm text-muted-foreground">
                It's a draw! Did you play a tiebreak?
              </p>
              <p className="text-xs text-muted-foreground">
                🏆 The tiebreak winner's team gets an extra +€3 bonus
              </p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full touch-target bg-gradient-primary hover:opacity-90"
                onClick={() => handleTiebreakSubmit('A')}
                disabled={isSubmitting}
              >
                🎾 Your Team Won the Tiebreak
              </Button>
              <Button
                variant="secondary"
                className="w-full touch-target"
                onClick={() => handleTiebreakSubmit('B')}
                disabled={isSubmitting}
              >
                Opponents Won the Tiebreak
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowTiebreak(false)}
              disabled={isSubmitting}
            >
              ← Go back and change score
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
