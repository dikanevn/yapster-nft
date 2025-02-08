// yapster-nft/src/App.jsx
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

// Указываем сеть и QuickNode endpoint (замените на ваш собственный)
const network = WalletAdapterNetwork.Devnet;
const endpoint = 'https://api.devnet.solana.com';
// Компонент для отображения информации о кошельке и кнопки подключения
const MyApp = () => {
  const { publicKey } = useWallet();
  
  return (
    <div style={{ padding: '20px' }}>
      {/* Кнопка подключения кошелька */}
      <WalletMultiButton />
      
      {/* Выводим publicKey, если кошелек подключён */}
      {publicKey ? (
        <p>Подключённый кошелек: {publicKey.toBase58()}</p>
      ) : (
        <p>Кошелек не подключён</p>
      )}
      <h1>Hello, world!</h1>
    </div>
  );
};

const App = () => {
  // Инициализируем адаптеры кошельков
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MyApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;