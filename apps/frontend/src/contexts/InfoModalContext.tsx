"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface InfoModalContextType {
  isOpen: boolean;
  openInfoModal: () => void;
  closeInfoModal: () => void;
  toggleInfoModal: () => void;
}

const InfoModalContext = createContext<InfoModalContextType>({
  isOpen: false,
  openInfoModal: () => {},
  closeInfoModal: () => {},
  toggleInfoModal: () => {},
});

export function InfoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openInfoModal = () => setIsOpen(true);
  const closeInfoModal = () => setIsOpen(false);
  const toggleInfoModal = () => setIsOpen((prev) => !prev);

  return (
    <InfoModalContext.Provider
      value={{
        isOpen,
        openInfoModal,
        closeInfoModal,
        toggleInfoModal,
      }}
    >
      {children}
    </InfoModalContext.Provider>
  );
}

export function useInfoModal() {
  return useContext(InfoModalContext);
}
