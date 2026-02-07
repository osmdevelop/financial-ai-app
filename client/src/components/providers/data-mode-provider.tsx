import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getDataMode, setDataMode as setStorage, type DataMode } from "@/lib/data-mode";

const DataModeContext = createContext<{
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
}>({ dataMode: "live", setDataMode: () => {} });

export function DataModeProvider({ children }: { children: React.ReactNode }) {
  const [dataMode, setState] = useState<DataMode>(getDataMode);

  const setDataMode = useCallback((mode: DataMode) => {
    setStorage(mode);
    setState(mode);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mrkt_data_mode_v1" && (e.newValue === "live" || e.newValue === "demo")) {
        setState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <DataModeContext.Provider value={{ dataMode, setDataMode }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataModeContext() {
  return useContext(DataModeContext);
}
