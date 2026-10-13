"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AssistantUiContextType {
  isOpen: boolean;
  openAssistant: (initialPrompt?: string) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  initialPrompt: string;
  clearInitialPrompt: () => void;
}

const AssistantUiContext = createContext<AssistantUiContextType>({
  isOpen: false,
  openAssistant: () => {},
  closeAssistant: () => {},
  toggleAssistant: () => {},
  initialPrompt: "",
  clearInitialPrompt: () => {},
});

export function AssistantUiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");

  const openAssistant = (prompt?: string) => {
    if (prompt) setInitialPrompt(prompt);
    setIsOpen(true);
  };

  const closeAssistant = () => {
    setIsOpen(false);
    setInitialPrompt("");
  };

  const clearInitialPrompt = () => {
    setInitialPrompt("");
  };

  const toggleAssistant = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <AssistantUiContext.Provider
      value={{
        isOpen,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        initialPrompt,
        clearInitialPrompt,
      }}
    >
      {children}
    </AssistantUiContext.Provider>
  );
}

export function useAssistantUi() {
  return useContext(AssistantUiContext);
}
