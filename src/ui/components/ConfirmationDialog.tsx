import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ai-elements/dialog';
import {dialogService} from './DialogService';

interface ConfirmationDialogProps {
  dialogId?: string;
  isOpen?: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmationDialog({
  dialogId,
  isOpen = true,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = 'Cancel',
}: ConfirmationDialogProps) {
  const handleClose = () => {
    if (onCancel) onCancel();
    if (dialogId) {
      dialogService.close(dialogId);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button className="btn-cancel" onClick={handleClose}>
              {cancelLabel}
            </button>
          </DialogClose>
          <button
            className="btn-danger"
            onClick={() => {
              onConfirm();
              handleClose();
            }}>
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
