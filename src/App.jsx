// yapster-nft/src/App.jsx
import React, { useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

// Импорт Anchor для работы с программой
import * as anchor from '@project-serum/anchor';
import idl from './l.json';
// Импорт функций и констант из spl-token для вычисления associatedTokenAddress
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Polyfill для глобального Buffer для браузера
import { Buffer } from 'buffer';
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Указываем сеть и endpoint
const endpoint = 'https://api.devnet.solana.com';

// Объявляем идентификаторы программы и fixed mint (значения должны соответствовать вашему on-chain коду)
const programId = new anchor.web3.PublicKey("2BESDrxqXxBWYwhiuzC4SgsoCmqoMiiEGwZ1en6gT4Se");
const FIXED_MINT = new anchor.web3.PublicKey("91aT1KmqDzdBD6ZvJVFx79wdLv7WsgYQLkqXYv2Gxqpk");

// Компонент для mint страницы
const MintPage = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [mintTx, setMintTx] = useState(null);

  const onMint = async () => {
    if (!wallet || !publicKey) {
      alert("Кошелек не подключен!");
      return;
    }
    setLoading(true);
    try {
      // Создаем Anchor Provider с текущим connection и wallet
      const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
      anchor.setProvider(provider);

      // Используем локальный IDL, импортированный из файла l.json
      const program = new anchor.Program(idl, programId, provider);

      // Вычисляем PDA для mint_authority
      const [mintAuthority, bump] = await anchor.web3.PublicKey.findProgramAddress(
         [Buffer.from("mint_authority")],
         programId
      );

      // Вычисляем ассоциированный токен-аккаунт для FIXED_MINT и authority
      const tokenAccount = await getAssociatedTokenAddress(FIXED_MINT, publicKey);

      // Для простоты используем dummy меркл доказательство: один массив из 32 нулей
      const merkleProof = [new Uint8Array(32)];

      // Вызов инструкции mint_one
      const tx = await program.methods.mintOne(merkleProof)
        .accounts({
          authority: publicKey,
          mint: FIXED_MINT,
          tokenAccount: tokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          mintAuthority: mintAuthority,
        })
        .rpc();

      setMintTx(tx);
      alert("Mint успешно произведен, транзакция: " + tx);
    } catch (error) {
      console.error("Ошибка при mint:", error);
      alert("Ошибка при mint: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <WalletMultiButton />
      {publicKey && (
        <div>
          <button onClick={onMint} disabled={loading} style={{ marginTop: '20px' }}>
            {loading ? "Minting..." : "Mint NFT"}
          </button>
          {mintTx && <p>Транзакция: {mintTx}</p>}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MintPage />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;