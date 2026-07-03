"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { store, Barbershop } from "@/lib/store";

interface BarbershopContextType {
  barbershop: Barbershop | null;
  reload: () => void;
}

const BarbershopContext = createContext<BarbershopContextType>({
  barbershop: null,
  reload: () => {},
});

export function BarbershopProvider({ children }: { children: ReactNode }) {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);

  const load = () => {
    const shop = store.getCurrentShop();
    if (shop) setBarbershop(shop);
  };

  // Load immediately on client mount
  useEffect(() => { load(); }, []);

  return (
    <BarbershopContext.Provider value={{ barbershop, reload: load }}>
      {children}
    </BarbershopContext.Provider>
  );
}

export const useBarbershop = () => useContext(BarbershopContext);
