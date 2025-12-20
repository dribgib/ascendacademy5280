import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'success' | 'error' | 'info';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ModalType;
  // If set, shows confirm buttons. Resolves promise with true/false
  resolveConfirm?: (value: boolean) => void;
}

interface ModalContextType {
  showAlert: (title: string, message: string, type?: ModalType) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  closeModal: () => void;
  modalState: ModalState;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const closeModal = () => {
    // If it was a confirmation, resolve false if dismissed
    if (modalState.resolveConfirm) {
      modalState.resolveConfirm(false);
    }
    setModalState(prev => ({ ...prev, isOpen: false, resolveConfirm: undefined }));
  };

  const showAlert = (title: string, message: string, type: ModalType = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'info', // Confirms generally look neutral or warning
        resolveConfirm: resolve
      });
    });
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal, modalState }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};