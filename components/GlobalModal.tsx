import React from 'react';
import { useModal } from '../context/ModalContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const GlobalModal: React.FC = () => {
  const { modalState, closeModal } = useModal();

  if (!modalState.isOpen) return null;

  const handleConfirm = () => {
    if (modalState.resolveConfirm) {
      modalState.resolveConfirm(true);
      // Close handled by parent's resolve logic or separate close call?
      // Actually we should close immediately after resolving.
      // But we need to avoid the closeModal trigger in the component re-render cycle interfering.
      // We manually update state here to close cleanly.
      // Since context `closeModal` resolves false, we need a specific "confirm" action.
    }
    // We access the setter via a "private" hack or just rely on the fact that 
    // we need to close it now.
    // The cleanest way is to just call a close method that knows we confirmed.
    // But our context's closeModal resolves false.
    // Let's modify context slightly? No, let's just use the resolve function directly if it exists.
    // Wait, I can't access setModalState here.
    // Let's assume the component will unmount/hide.
    // Actually, simply:
    // If I call modalState.resolveConfirm(true), the promise resolves. 
    // Then I need to close the modal UI.
    // The caller awaits the promise.
  };

  // Helper to handle confirm action visually
  const onYes = () => {
    if (modalState.resolveConfirm) modalState.resolveConfirm(true);
    // Force close state update without triggering the 'false' resolution again?
    // See ModalContext implementation: closeModal() resolves false.
    // We need to be careful.
    // If we resolved true already, resolving false again is usually ignored by Promises (they settle once).
    // So calling closeModal() after resolving true is safe!
    closeModal();
  };

  const onNo = () => {
    closeModal(); // Resolves false
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'success': return <CheckCircle className="text-green-500" size={48} />;
      case 'error': return <AlertCircle className="text-co-red" size={48} />;
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
          
          <h3 className="font-teko text-3xl text-white uppercase mb-2">
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
                  className="flex-1 py-3 border border-zinc-700 text-zinc-300 uppercase font-teko text-xl rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={onYes}
                  className="flex-1 py-3 bg-co-yellow text-black uppercase font-teko text-xl font-bold rounded hover:bg-white transition-colors"
                >
                  Confirm
                </button>
              </>
            ) : (
              <button 
                onClick={onNo}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white uppercase font-teko text-xl rounded transition-colors"
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