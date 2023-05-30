import { createContext, MutableRefObject, ReactNode, useContext, useMemo, useRef, useState } from "react";
import type { State, Selector } from "./state.types";
import { connect } from "./connect";
import { Config, JellyfishClient } from "@jellyfish-dev/ts-client-sdk";
import { DEFAULT_STORE } from "./state";
import { disconnect } from "./disconnect";

export type JellyfishContextProviderProps = {
  children: ReactNode;
};

type JellyfishContextType<PeerMetadata, TrackMetadata> = {
  state: State<PeerMetadata, TrackMetadata>;
  setState: (value: (prevState: State<PeerMetadata, TrackMetadata>) => State<PeerMetadata, TrackMetadata>) => void;
  clientRef: MutableRefObject<JellyfishClient<PeerMetadata, TrackMetadata>>,
  // setState: (
  //   value:
  //     | ((
  //     prevState: LibraryPeersState<PeerMetadata, TrackMetadata>
  //   ) => LibraryPeersState<PeerMetadata, TrackMetadata>)
  //     | LibraryPeersState<PeerMetadata, TrackMetadata>
  // ) => void;
};

export type UseConnect<PeerMetadata> = (config: Config<PeerMetadata>) => () => void;

export const creteDefaultStore = <PeerMetadata, TrackMetadata>(): State<PeerMetadata, TrackMetadata> => {
  // console.log("Creating new jellyfish client")

  // return {
  //   ...DEFAULT_STORE,
  //   connectivity: { ...DEFAULT_STORE.connectivity, client: new JellyfishClient<PeerMetadata, TrackMetadata>() },
  // };
  return DEFAULT_STORE
};

/**
 * Create a client that can be used with a context.
 * Returns context provider, and two hooks to interact with the context.
 *
 * @returns ContextProvider, useSelector, useConnect
 */
export const create = <PeerMetadata, TrackMetadata>() => {
  const JellyfishContext = createContext<JellyfishContextType<PeerMetadata, TrackMetadata> | undefined>(undefined);

  const JellyfishContextProvider = ({ children }: JellyfishContextProviderProps) => {
    const [state, setState] = useState<State<PeerMetadata, TrackMetadata>>(() =>
      creteDefaultStore<PeerMetadata, TrackMetadata>()
    );

    const clientRef: MutableRefObject<JellyfishClient<PeerMetadata, TrackMetadata>> = useRef<JellyfishClient<PeerMetadata, TrackMetadata>>(new JellyfishClient<PeerMetadata, TrackMetadata>())

    return <JellyfishContext.Provider value={{ state, setState, clientRef }}>{children}</JellyfishContext.Provider>;
  };

  const useJellyfishContext = (): JellyfishContextType<PeerMetadata, TrackMetadata> => {
    const context = useContext(JellyfishContext);
    if (!context) throw new Error("useJellyfishContext must be used within a JellyfishContextProvider");
    return context;
  };

  const useSelector = <Result,>(selector: Selector<PeerMetadata, TrackMetadata, Result>): Result => {
    const { state } = useJellyfishContext();

    return useMemo(() => selector(state), [selector, state]);
  };

  const useConnect = (): UseConnect<PeerMetadata> => {
    const { setState, clientRef }: JellyfishContextType<PeerMetadata, TrackMetadata> = useJellyfishContext();

    return useMemo(() => connect(setState, clientRef), [setState]);
  };

  // const useDisconnect = (): void => {
  //   const { setState }: JellyfishContextType<PeerMetadata, TrackMetadata> = useJellyfishContext();
  //
  //   return useMemo(() => disconnect(setState), [setState]);
  // };

  return {
    JellyfishContextProvider,
    useSelector,
    useConnect,
  };
};
