// yapster-nft/src/App.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Buffer } from 'buffer';
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Импорт меркл дерева и sha256 (через js‑sha256)
import { MerkleTree } from 'merkletreejs';
import { sha256 as jsSha256 } from 'js-sha256';

// Импорт адресов whitelist (массив строк в формате base58)
import addresses from './maddrs.json';

// Указываем сеть и endpoint
const endpoint = 'https://api.devnet.solana.com';

// Константы: program id и фиксированный mint
const programId = new PublicKey("2BESDrxqXxBWYwhiuzC4SgsoCmqoMiiEGwZ1en6gT4Se");
const FIXED_MINT = new PublicKey("91aT1KmqDzdBD6ZvJVFx79wdLv7WsgYQLkqXYv2Gxqpk");

// Вспомогательная функция хеширования, возвращает Buffer
function sha256(data) {
  const hashHex = jsSha256(data);
  return Buffer.from(hashHex, 'hex');
}

const MintPage = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  // При монтировании можно, например, посчитать Merkle Root (для отладки)
  useEffect(() => {
    const leaves = addresses.map(addr => {
      const pkBytes = Buffer.from(new PublicKey(addr).toBytes());
      return sha256(pkBytes);
    });
    const sortedLeaves = leaves.slice().sort(Buffer.compare);
    const tree = new MerkleTree(sortedLeaves, sha256, { sortPairs: true });
    console.log("Merkle Root:", tree.getRoot().toString('hex'));
  }, []);

  const onPureRustMint = async () => {
    if (!publicKey) {
      alert("Пожалуйста, подключите кошелек!");
      return;
    }
    try {
      setLoading(true);

      // Получаем свой Merkle proof для текущего кошелька (authority)
      const authorityPk = publicKey;
      const authorityBytes = Buffer.from(authorityPk.toBytes());
      const authorityLeaf = sha256(authorityBytes);

      // Строим дерево из всех whitelist адресов
      const leaves = addresses.map(addr => {
        const pkBytes = Buffer.from(new PublicKey(addr).toBytes());
        return sha256(pkBytes);
      });
      const sortedLeaves = leaves.slice().sort(Buffer.compare);
      const tree = new MerkleTree(sortedLeaves, sha256, { sortPairs: true });
      const proofObjects = tree.getProof(authorityLeaf);

      if (!proofObjects || proofObjects.length === 0) {
        alert("Ваш адрес не найден в белом списке!");
        setLoading(false);
        return;
      }

      // Преобразуем каждое доказательство в 32-байтный Buffer
      const merkleProofBuffers = proofObjects.map(p => p.data);
      
      // Вычисляем Anchor-дискриминатор для mint_one
      // Anchor вычисляет дискриминатор как первые 8 байтов sha256("global:mint_one")
      const mintOneDiscriminator = Buffer.from(jsSha256("global:mint_one"), "hex").slice(0, 8);

      // Формирование данных инструкции в формате Anchor (Borsh):
      // [8 байтов дискриминатора][4 байта длина вектора][N * 32 байт доказательств]
      const proofCount = merkleProofBuffers.length;
      const dataLength = 8 + 4 + (32 * proofCount);
      const dataBuffer = Buffer.alloc(dataLength);

      // Записываем 8 байтов дискриминатора в dataBuffer
      mintOneDiscriminator.copy(dataBuffer, 0);
      // Записываем длину вектора доказательств (4 байта) начиная с offset = 8
      dataBuffer.writeUInt32LE(proofCount, 8);
      // Записываем каждый proof (32 байта) начиная с offset = 12
      for (let i = 0; i < proofCount; i++) {
        merkleProofBuffers[i].copy(dataBuffer, 12 + i * 32);
      }

      // Вычисляем PDA для mint_authority (аналогично Anchor)
      const [mintAuthority] = await PublicKey.findProgramAddress(
        [Buffer.from("mint_authority")],
        programId
      );

      // Вычисляем ассоциированный токен-аккаунт для FIXED_MINT и authority
      const tokenAccount = await getAssociatedTokenAddress(FIXED_MINT, authorityPk);

      // Формирование массива необходимых аккаунтов для инструкции
      const keys = [
        { pubkey: authorityPk, isSigner: true, isWritable: true },
        { pubkey: FIXED_MINT, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        // Стандартные аккаунты SPL токена и ассоциированного токен-аккаунта:
        { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
      ];

      // Создаем инструкцию для транзакции
      const instruction = new TransactionInstruction({
        keys,
        programId,
        data: dataBuffer,
      });

      console.log("Сформированная инструкция (данные):", dataBuffer.toString('hex'));
      console.log("Список аккаунтов (keys):", keys);

      // Собираем транзакцию и добавляем инструкцию
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = authorityPk;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Подписываем транзакцию через кошелек (например, Phantom)
      const signedTx = await signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      console.log("Transaction ID:", txid);
      alert("Транзакция отправлена. TXID: " + txid);
    } catch (error) {
      console.error("Ошибка при mint без Anchor:", error);
      alert("Ошибка: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <WalletMultiButton />
      {publicKey && (
        <div>
          <button onClick={onPureRustMint} disabled={loading} style={{ marginTop: '20px' }}>
            Mint NFT (Pure Rust)
          </button>
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