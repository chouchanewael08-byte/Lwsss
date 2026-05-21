import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد الإجراء',
  cancelText = 'إلغاء التراجع',
  type = 'warning',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            id="modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-[#0d1527] border border-slate-800/80 rounded-2xl w-full max-w-md p-6 text-right shadow-2xl overflow-hidden z-10"
            id="modal-card"
          >
            {/* Glow Accent */}
            <div className={`absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r ${
              type === 'danger' ? 'from-rose-500 to-red-650' : 
              type === 'info' ? 'from-sky-500 to-blue-650' : 
              'from-amber-500 to-orange-600'
            }`} />

            <div className="flex flex-row-reverse items-start gap-4 mb-4">
              {/* Icon Container */}
              <div className={`p-3 rounded-xl shrink-0 ${
                type === 'danger' ? 'bg-rose-500/10 text-rose-450' :
                type === 'info' ? 'bg-sky-500/10 text-sky-450' :
                'bg-amber-500/10 text-amber-450'
              }`}>
                {type === 'danger' && <AlertTriangle className="w-6 h-6" />}
                {type === 'info' && <CheckCircle className="w-6 h-6" />}
                {type === 'warning' && <HelpCircle className="w-6 h-6" />}
              </div>

              {/* Title & Body */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-rose-50 sm:text-lg">
                  {title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-row-reverse gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black text-white hover:brightness-110 active:scale-95 transition-all duration-200 shadow-lg cursor-pointer ${
                  type === 'danger' ? 'bg-gradient-to-r from-rose-600 to-red-500 shadow-rose-950/20' :
                  type === 'info' ? 'bg-gradient-to-r from-sky-600 to-blue-500 shadow-sky-950/20' :
                  'bg-gradient-to-r from-amber-600 to-orange-500 shadow-amber-950/20'
                }`}
                id="modal-confirm-btn"
              >
                {confirmText}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 bg-slate-905 hover:bg-slate-850 hover:text-slate-200 text-slate-450 text-xs sm:text-sm font-bold border border-slate-800 rounded-xl transition-all active:scale-95 cursor-pointer"
                id="modal-cancel-btn"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
