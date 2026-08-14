import { createContext, useContext, useState, type ReactNode } from 'react';

interface MockDataContextType {
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [useMockDataState, setUseMockDataState] = useState(false);

  return (
    <MockDataContext.Provider value={{ useMockData: useMockDataState, setUseMockData: setUseMockDataState }}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockDataContext() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockDataContext must be used within MockDataProvider');
  }
  return context;
}
