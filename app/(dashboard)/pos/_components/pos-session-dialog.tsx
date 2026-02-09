'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { openPOSSession } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function POSSessionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleOpenSession = async (formData: FormData) => {
    setLoading(true);
    try {
      const openingCash = parseFloat(formData.get('openingCash') as string);
      if (isNaN(openingCash) || openingCash < 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Amount',
          description: 'Please enter a valid opening cash amount.',
        });
        setLoading(false);
        return;
      }

      await openPOSSession(openingCash);

      toast({
        title: 'Session Opened',
        description: 'You can now start selling.',
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to open session. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">Start Shift</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start POS Session</DialogTitle>
          <DialogDescription>
            Enter the opening cash amount in the drawer to start your shift.
          </DialogDescription>
        </DialogHeader>
        <form action={handleOpenSession}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="openingCash" className="text-right">
                Opening Cash
              </Label>
              <Input
                id="openingCash"
                name="openingCash"
                type="number"
                step="0.01"
                defaultValue="0.00"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
