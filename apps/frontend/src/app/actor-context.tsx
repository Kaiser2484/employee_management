import { createContext, ReactNode, useContext, useCallback, useMemo, useState } from 'react';
import { Actor } from './actors';

interface ActorContextValue {
  actor: Actor | null;
  setActor: (actor: Actor) => void;
  logout: () => void;
}

const ActorContext = createContext<ActorContextValue | undefined>(undefined);
const ACTOR_STORAGE_KEY = 'hrm-auth-actor';

export function ActorProvider({ children }: { children: ReactNode }) {
  const [actor, setActorState] = useState<Actor | null>(() => {
    const stored = localStorage.getItem(ACTOR_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as Actor;
    } catch {
      return null;
    }
  });

  const setActor = useCallback((nextActor: Actor) => {
    localStorage.setItem(ACTOR_STORAGE_KEY, JSON.stringify(nextActor));
    setActorState(nextActor);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACTOR_STORAGE_KEY);
    setActorState(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<ActorContextValue>(() => ({
    actor,
    setActor,
    logout,
  }), [actor, setActor, logout]);

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor() {
  const context = useContext(ActorContext);

  if (!context) {
    throw new Error('useActor must be used within ActorProvider');
  }

  return context;
}