"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
  // store.getCurrentShop() is safe to call on the server too — it's guarded
  // internally and returns null when there's no window/localStorage — so a
  // lazy initializer reads it immediately instead of only after a mount effect.
  const [barbershop, setBarbershop] = useState<Barbershop | null>(() => store.getCurrentShop());

  const load = () => {
    const shop = store.getCurrentShop();
    if (shop) setBarbershop(shop);
  };

  return (
    <BarbershopContext.Provider value={{ barbershop, reload: load }}>
      {children}
    </BarbershopContext.Provider>
  );
}

export const useBarbershop = () => useContext(BarbershopContext);
