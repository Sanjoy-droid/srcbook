import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { OutputType } from '@srcbook/components/src/types';
import { AppChannel } from '@/clients/websocket';
import {
  DepsInstallLogPayloadType,
  DepsInstallStatusPayloadType,
  DepsStatusResponsePayloadType,
} from '@srcbook/shared';
import { useLogs } from './use-logs';

type NpmInstallStatus = 'idle' | 'installing' | 'complete' | 'failed';

export interface PackageJsonContextValue {
  npmInstall: (packages?: string[]) => Promise<void>;
  clearNodeModules: () => void;

  nodeModulesExists: boolean | null;
  status: NpmInstallStatus;
  installing: boolean;
  failed: boolean;
  output: Array<OutputType>;
}

const PackageJsonContext = createContext<PackageJsonContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function PackageJsonProvider({ channel, children }: ProviderPropsType) {
  const [status, setStatus] = useState<NpmInstallStatus>('idle');
  const [output, setOutput] = useState<Array<OutputType>>([]);
  const [nodeModulesExists, setNodeModulesExists] = useState<boolean | null>(null);

  const { addError } = useLogs();

  useEffect(() => {
    channel.push('deps:status', {});
  }, [channel]);

  useEffect(() => {
    const callback = (data: DepsStatusResponsePayloadType) => {
      setNodeModulesExists(data.nodeModulesExists);
    };
    channel.on('deps:status:response', callback);

    return () => {
      channel.off('deps:status:response', callback);
    };
  }, [channel]);

  const npmInstall = useCallback(
    async (packages?: Array<string>) => {
      // NOTE: caching of the log output is required here because socket events that call callback
      // functions in here hold on to old scope values
      let contents = '';

      return new Promise<void>((resolve, reject) => {
        const logCallback = ({ log }: DepsInstallLogPayloadType) => {
          setOutput((old) => [...old, log]);
          contents += log.data;
        };
        channel.on('deps:install:log', logCallback);

        const statusCallback = ({ status }: DepsInstallStatusPayloadType) => {
          channel.off('deps:install:log', logCallback);
          channel.off('deps:install:status', statusCallback);
          setStatus(status);

          if (status === 'complete') {
            resolve();
          } else {
            addError({ type: 'npm_install_error', contents });
            reject(new Error(`Error running npm install: ${contents}`));
          }
        };
        channel.on('deps:install:status', statusCallback);

        setOutput([]);
        setStatus('installing');
        channel.push('deps:install', { packages });
      });
    },
    [channel, addError],
  );

  const clearNodeModules = useCallback(() => {
    channel.push('deps:clear', {});
    setOutput([]);
  }, [channel]);

  const context: PackageJsonContextValue = {
    npmInstall,
    clearNodeModules,
    nodeModulesExists,
    status,
    installing: status === 'installing',
    failed: status === 'failed',
    output,
  };

  return <PackageJsonContext.Provider value={context}>{children}</PackageJsonContext.Provider>;
}

export function usePackageJson() {
  const context = useContext(PackageJsonContext);

  if (!context) {
    throw new Error('usePackageJson must be used within a PackageJsonProvider');
  }

  return context;
}
