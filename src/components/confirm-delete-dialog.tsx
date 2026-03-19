"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  requireValidationText?: string;
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you absolutely sure?",
  description,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  isLoading = false,
  requireValidationText,
}: ConfirmDeleteDialogProps) {
  const [validationInput, setValidationInput] = useState("");

  // Reset input when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setValidationInput("");
    }
  }, [isOpen]);

  const isConfirmDisabled =
    isLoading ||
    (requireValidationText ? validationInput !== requireValidationText : false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-red-500/10 p-6 flex justify-center">
          <div className="bg-red-500/20 p-3 rounded-full border border-red-500/30">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="text-zinc-400 text-center text-sm leading-relaxed">
            {description}
          </div>

          {requireValidationText && (
            <div className="pt-2">
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block text-center">
                Type{" "}
                <span className="text-zinc-100 font-bold select-all bg-zinc-800 px-1 py-0.5 rounded">
                  {requireValidationText}
                </span>{" "}
                to continue
              </label>
              <Input
                value={validationInput}
                onChange={(e) => setValidationInput(e.target.value)}
                className="bg-zinc-950/50 border-zinc-800 text-center h-10 tracking-widest font-semibold placeholder:text-zinc-600 focus-visible:ring-red-500"
                placeholder={requireValidationText}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button
              className="bg-red-600 hover:bg-red-500 cursor-pointer text-white font-bold h-11 transition-all disabled:opacity-50"
              onClick={onConfirm}
              disabled={isConfirmDisabled}
            >
              {isLoading ? "Deleting..." : confirmText}
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-400 cursor-pointer hover:text-zinc-100 hover:bg-zinc-800 h-11"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
