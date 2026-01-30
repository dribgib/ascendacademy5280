import React from 'react';
import { useModal } from '../context/ModalContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const GlobalModal: React.FC = () => {
  const { modalState, closeModal } = useModal();

  if (!modalState.isOpen) return null;

  const handleConfirm = () => {
    if (modalState.resolveConfirm) {
      modalState.resolveConfirm(true);
    }
  };

  // Helper to handle confirm action visually
  const onYes = () => {
    if (modalState.resolveConfirm) modalState.resolveConfirm(true);
    closeModal();
  };

  const onNo = () => {
    closeModal(); // Resolves false
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'success': return <CheckCircle className="text-green-500" size={48} />;
      case 'error': return <AlertCircle className="text-zinc-400" size={48} />;
      default: return <Info className="text-co-yellow" size={48} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onNo}>
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-w-sm w-full p-6 relative transform transition-all scale-100"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onNo}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {getIcon()}
          </div>
          
          <h3 className="font-shrikhand text-2xl text-white uppercase mb-2">
            {modalState.title}
          </h3>
          
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            {modalState.message}
          </p>

          <div className="flex gap-4 w-full">
            {modalState.resolveConfirm ? (
              <>
                <button 
                  onClick={onNo}
                  className="flex-1 py-3 border border-zinc-700 text-zinc-300 uppercase font-kanit text-base rounded hover:bg-zinc-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={onYes}
                  className="flex-1 py-3 bg-co-yellow text-black uppercase font-kanit text-base font-medium rounded hover:bg-white transition-colors"
                >
                  Confirm
                </button>
              </>
            ) : (
              <button 
                onClick={onNo}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white uppercase font-kanit text-base rounded transition-colors font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalModal;